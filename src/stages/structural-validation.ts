import { AuthoringDocument, AuthoringObject } from '../types/authoring.js';
import { PipelineError } from '../errors.js';

export function structuralValidation(doc: AuthoringDocument): PipelineError[] {
  const errors: PipelineError[] = [];

  if (!Array.isArray(doc.objects)) {
    errors.push(new PipelineError('structural-validation', '"objects" must be an array'));
    return errors;
  }

  const seenIds = new Set<string>();
  validateObjects(doc.objects, 'objects', seenIds, errors);

  return errors;
}

function validateObjects(objects: unknown[], prefix: string, seenIds: Set<string>, errors: PipelineError[]): void {
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
    } else if (seenIds.has(obj.id)) {
      errors.push(new PipelineError('structural-validation', `${path} duplicate id "${obj.id}"`));
    } else {
      seenIds.add(obj.id);
    }

    if (Array.isArray(obj.objects)) {
      validateObjects(obj.objects as unknown[], `${path}.objects`, seenIds, errors);
    }

    if (Array.isArray(obj.chain)) {
      validateChain(obj.chain as unknown[], `${path}.chain`, errors);
    }
  }
}

function validateChain(chain: unknown[], prefix: string, errors: PipelineError[]): void {
  for (let i = 0; i < chain.length; i++) {
    const elem = chain[i] as AuthoringObject;
    const path = `${prefix}[${i}]`;

    if (typeof elem !== 'object' || elem === null) {
      errors.push(new PipelineError('structural-validation', `${path} must be an object`));
      continue;
    }

    if (typeof elem.type !== 'string' || elem.type.length === 0) {
      errors.push(new PipelineError('structural-validation', `${path} must have a non-empty "type" string`));
    }
  }
}
