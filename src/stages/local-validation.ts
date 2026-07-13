import { AuthoringDocument, AuthoringObject } from '../types/authoring.js';
import { ObjectTypeHandler, HandlerLookup } from '../registry/object-type-handler.js';
import { PipelineError } from '../errors.js';

export function localValidation(doc: AuthoringDocument, handlers: Map<string, ObjectTypeHandler>, registry: HandlerLookup): PipelineError[] {
  const errors: PipelineError[] = [];
  validateRecursive(doc.objects, handlers, registry, errors);
  return errors;
}

function validateRecursive(objects: AuthoringObject[], handlers: Map<string, ObjectTypeHandler>, registry: HandlerLookup, errors: PipelineError[]): void {
  for (const obj of objects) {
    const handler = handlers.get(obj.id);
    if (!handler) continue;

    for (const [propName, propDef] of Object.entries(handler.properties)) {
      const value = obj[propName];

      if (propDef.required && (value === undefined || value === null)) {
        errors.push(new PipelineError('local-validation', `"${obj.id}": required property "${propName}" is missing`));
        continue;
      }

      if (value !== undefined && value !== null) {
        try {
          propDef.validate(value, propName);
        } catch (e) {
          const message = e instanceof Error ? e.message : `Invalid value for "${propName}"`;
          errors.push(new PipelineError('local-validation', `"${obj.id}": ${message}`));
        }
      }
    }

    if (Array.isArray(obj.objects) && handler.validateChildren) {
      const childHandlers = new Map<string, ObjectTypeHandler>();
      for (const child of obj.objects as AuthoringObject[]) {
        const childHandler = handlers.get(child.id);
        if (childHandler) childHandlers.set(child.id, childHandler);
      }
      const childErrors = handler.validateChildren(obj, childHandlers, registry);
      for (const msg of childErrors) {
        errors.push(new PipelineError('local-validation', msg));
      }
    }

    if (Array.isArray(obj.objects)) {
      validateRecursive(obj.objects as AuthoringObject[], handlers, registry, errors);
    }
  }
}
