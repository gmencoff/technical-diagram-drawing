import { AuthoringDocument } from '../types/authoring.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';
import { PipelineError } from '../errors.js';

export function localValidation(doc: AuthoringDocument, handlers: Map<string, ObjectTypeHandler>): PipelineError[] {
  const errors: PipelineError[] = [];

  for (const obj of doc.objects) {
    const handler = handlers.get(obj.id)!;

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
  }

  return errors;
}
