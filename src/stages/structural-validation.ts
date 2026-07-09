import { AuthoringDocument, AuthoringObject } from '../types/authoring.js';
import { PipelineError } from '../errors.js';

export function structuralValidation(doc: AuthoringDocument): PipelineError[] {
  const errors: PipelineError[] = [];

  if (!Array.isArray(doc.objects)) {
    errors.push(new PipelineError('structural-validation', '"objects" must be an array'));
    return errors;
  }

  const seenIds = new Set<string>();
  validateObjects(doc.objects, 'objects', null, seenIds, errors);

  return errors;
}

function validateObjects(objects: unknown[], prefix: string, parentId: string | null, seenIds: Set<string>, errors: PipelineError[]): void {
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i] as AuthoringObject;
    const path = `${prefix}[${i}]`;

    if (typeof obj !== 'object' || obj === null) {
      errors.push(new PipelineError('structural-validation', `${path} must be an object`));
      continue;
    }

    if (typeof obj.type !== 'string' || obj.type.length === 0) {
      errors.push(new PipelineError('structural-validation', `${path} must have a non-empty "type" string`));
    }

    if (typeof obj.id !== 'string' || obj.id.length === 0) {
      errors.push(new PipelineError('structural-validation', `${path} must have a non-empty "id" string`));
      continue;
    }

    const fullId = parentId ? `${parentId}.${obj.id}` : obj.id;
    if (seenIds.has(fullId)) {
      errors.push(new PipelineError('structural-validation', `${path} duplicate id "${fullId}"`));
    } else {
      seenIds.add(fullId);
    }

    if (Array.isArray(obj.objects)) {
      validateObjects(obj.objects as unknown[], `${path}.objects`, fullId, seenIds, errors);
    }
  }
}
