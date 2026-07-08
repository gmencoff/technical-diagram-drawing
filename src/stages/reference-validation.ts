import { SceneGraph } from '../types/scene-graph.js';
import { SymbolTable } from '../types/symbol-table.js';
import { PipelineError } from '../errors.js';
import { parseExpression } from '../expressions/parser.js';
import { Expression } from '../expressions/parser.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';

export function referenceValidation(sceneGraph: SceneGraph, symbolTable: SymbolTable, handlers: Map<string, ObjectTypeHandler>): PipelineError[] {
  const errors: PipelineError[] = [];

  for (const node of sceneGraph.nodes) {
    const handler = handlers.get(node.id);
    const expressionProps = getExpressionPropertyNames(handler);

    for (const [propName, value] of Object.entries(node.properties)) {
      if (typeof value !== 'string') continue;
      if (!expressionProps.has(propName)) continue;

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

function getExpressionPropertyNames(handler: ObjectTypeHandler | undefined): Set<string> {
  const names = new Set<string>();
  if (!handler) return names;
  for (const [propName, propDef] of Object.entries(handler.properties)) {
    if (propDef.type === 'expression') {
      names.add(propName);
    }
  }
  return names;
}

function extractReferences(value: string): string[] {
  try {
    const expr = parseExpression(value);
    return collectRefs(expr);
  } catch {
    return [];
  }
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
