import { AuthoringDocument } from '../types/authoring.js';
import { ObjectRegistry } from '../registry/index.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';
import { PipelineError } from '../errors.js';

export interface RegistryLookupResult {
  handlers: Map<string, ObjectTypeHandler>;
}

export function registryLookup(doc: AuthoringDocument, registry: ObjectRegistry): { result?: RegistryLookupResult; errors: PipelineError[] } {
  const errors: PipelineError[] = [];
  const handlers = new Map<string, ObjectTypeHandler>();

  for (const obj of doc.objects) {
    const handler = registry.lookup(obj.type);
    if (!handler) {
      errors.push(new PipelineError('registry-lookup', `Unknown object type "${obj.type}" on object "${obj.id}"`));
    } else {
      handlers.set(obj.id, handler);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { result: { handlers }, errors: [] };
}
