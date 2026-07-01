import { AuthoringDocument } from '../types/authoring.js';
import { PipelineError } from '../errors.js';

export function structuralValidation(doc: AuthoringDocument): PipelineError[] {
  const errors: PipelineError[] = [];

  if (!Array.isArray(doc.objects)) {
    errors.push(new PipelineError('structural-validation', '"objects" must be an array'));
    return errors;
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < doc.objects.length; i++) {
    const obj = doc.objects[i];
    const prefix = `objects[${i}]`;

    if (typeof obj !== 'object' || obj === null) {
      errors.push(new PipelineError('structural-validation', `${prefix} must be an object`));
      continue;
    }

    if (typeof obj.type !== 'string' || obj.type.length === 0) {
      errors.push(new PipelineError('structural-validation', `${prefix} must have a non-empty "type" string`));
    }

    if (typeof obj.id !== 'string' || obj.id.length === 0) {
      errors.push(new PipelineError('structural-validation', `${prefix} must have a non-empty "id" string`));
    } else if (seenIds.has(obj.id)) {
      errors.push(new PipelineError('structural-validation', `${prefix} duplicate id "${obj.id}"`));
    } else {
      seenIds.add(obj.id);
    }
  }

  return errors;
}
