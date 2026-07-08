import { AuthoringDocument, AuthoringObject } from '../types/authoring.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';
import { PipelineError } from '../errors.js';

export function localValidation(doc: AuthoringDocument, handlers: Map<string, ObjectTypeHandler>): PipelineError[] {
  const errors: PipelineError[] = [];
  validateRecursive(doc.objects, handlers, errors);
  return errors;
}

function validateRecursive(objects: AuthoringObject[], handlers: Map<string, ObjectTypeHandler>, errors: PipelineError[]): void {
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

    if (Array.isArray(obj.objects)) {
      validateRecursive(obj.objects as AuthoringObject[], handlers, errors);
    }
  }
}
