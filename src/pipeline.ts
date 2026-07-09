import { PipelineError } from './errors.js';
import { createDefaultRegistry } from './registry/index.js';
import { parse } from './stages/parse.js';
import { structuralValidation } from './stages/structural-validation.js';
import { registryLookup } from './stages/registry-lookup.js';
import { localValidation } from './stages/local-validation.js';
import { semanticExpansion } from './stages/semantic-expansion.js';
import { buildSymbolTable } from './stages/symbol-table.js';
import { referenceValidation } from './stages/reference-validation.js';
import { layout } from './stages/layout.js';
import { svgGeneration } from './stages/svg-generation.js';
import { svgSerialization } from './stages/svg-serialization.js';

export interface PipelineResult {
  success: boolean;
  svg?: string;
  errors?: PipelineError[];
}

export function renderDiagram(yamlSource: string): PipelineResult {
  const registry = createDefaultRegistry();

  let doc;
  try {
    doc = parse(yamlSource);
  } catch (e) {
    return { success: false, errors: [e as PipelineError] };
  }

  const structuralErrors = structuralValidation(doc);
  if (structuralErrors.length > 0) {
    return { success: false, errors: structuralErrors };
  }

  const { result: lookupResult, errors: lookupErrors } = registryLookup(doc, registry);
  if (lookupErrors.length > 0) {
    return { success: false, errors: lookupErrors };
  }
  const { handlers } = lookupResult!;

  const validationErrors = localValidation(doc, handlers);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  const sceneGraph = semanticExpansion(doc, handlers, registry);
  const symbolTable = buildSymbolTable(sceneGraph);

  const refErrors = referenceValidation(sceneGraph, symbolTable, handlers);
  if (refErrors.length > 0) {
    return { success: false, errors: refErrors };
  }

  const layoutResult = layout(sceneGraph, registry);
  const primitives = svgGeneration(layoutResult.sceneGraph, handlers, registry);
  const svg = svgSerialization({ viewBox: layoutResult.viewBox, primitives });

  return { success: true, svg };
}
