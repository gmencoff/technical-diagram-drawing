import { AuthoringDocument, AuthoringObject } from '../types/authoring.js';
import { ObjectRegistry } from '../registry/index.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';
import { PipelineError } from '../errors.js';

export interface RegistryLookupResult {
  handlers: Map<string, ObjectTypeHandler>;
}

export function registryLookup(doc: AuthoringDocument, registry: ObjectRegistry): { result?: RegistryLookupResult; errors: PipelineError[] } {
  const errors: PipelineError[] = [];
  const handlers = new Map<string, ObjectTypeHandler>();

  lookupRecursive(doc.objects, registry, handlers, errors);

  if (errors.length > 0) {
    return { errors };
  }

  return { result: { handlers }, errors: [] };
}

function lookupRecursive(objects: AuthoringObject[], registry: ObjectRegistry, handlers: Map<string, ObjectTypeHandler>, errors: PipelineError[]): void {
  for (const obj of objects) {
    const handler = registry.lookup(obj.type);
    if (!handler) {
      errors.push(new PipelineError('registry-lookup', `Unknown object type "${obj.type}" on object "${obj.id}"`));
    } else {
      handlers.set(obj.id, handler);
    }

    if (Array.isArray(obj.objects)) {
      lookupRecursive(obj.objects as AuthoringObject[], registry, handlers, errors);
    }
    if (Array.isArray(obj.chain)) {
      for (const chainElem of obj.chain as AuthoringObject[]) {
        const elemHandler = registry.lookup(chainElem.type);
        if (!elemHandler) {
          errors.push(new PipelineError('registry-lookup', `Unknown object type "${chainElem.type}" in chain`));
        }
      }
    }
  }
}
