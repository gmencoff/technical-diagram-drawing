import { SceneGraph } from '../types/scene-graph.js';
import { SymbolTable } from '../types/symbol-table.js';
import { PipelineError } from '../errors.js';
import { parseExpression } from '../expressions/parser.js';
import { Expression } from '../expressions/parser.js';

export function referenceValidation(sceneGraph: SceneGraph, symbolTable: SymbolTable): PipelineError[] {
  const errors: PipelineError[] = [];

  for (const node of sceneGraph.nodes) {
    for (const [propName, value] of Object.entries(node.properties)) {
      if (typeof value !== 'string') continue;

      const refs = extractReferences(value);
      for (const ref of refs) {
        if (!symbolTable.entries.has(ref)) {
          errors.push(new PipelineError('reference-validation', `"${node.id}.${propName}": unresolved reference "${ref}"`));
        }
      }
    }
  }

  return errors;
}

function extractReferences(value: string): string[] {
  const expr = parseExpression(value);
  return collectRefs(expr);
}

function collectRefs(expr: Expression): string[] {
  if (expr.kind === 'reference') {
    return [expr.path];
  }
  if (expr.kind === 'number') {
    return [];
  }
  if (expr.kind === 'binary') {
    return [...collectRefs(expr.left), ...collectRefs(expr.right)];
  }
  return expr.args.flatMap(collectRefs);
}
