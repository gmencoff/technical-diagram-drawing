import yaml from 'js-yaml';
import { AuthoringDocument } from '../types/authoring.js';
import { PipelineError } from '../errors.js';

export function parse(yamlSource: string): AuthoringDocument {
  let raw: unknown;
  try {
    raw = yaml.load(yamlSource);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown YAML parse error';
    throw new PipelineError('parse', message);
  }

  if (raw === null || raw === undefined || typeof raw !== 'object') {
    throw new PipelineError('parse', 'Document must be a YAML mapping');
  }

  return raw as AuthoringDocument;
}
