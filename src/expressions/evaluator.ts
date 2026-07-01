import { Expression } from './parser.js';
import { SceneGraph, Point2D } from '../types/scene-graph.js';

export function evaluateExpression(expr: Expression, sceneGraph: SceneGraph): number | Point2D {
  if (expr.kind === 'reference') {
    return resolveAnchor(expr.path, sceneGraph);
  }

  if (expr.name === 'distance') {
    if (expr.args.length !== 2) {
      throw new Error(`distance() requires exactly 2 arguments`);
    }
    const a = evaluateExpression(expr.args[0], sceneGraph) as Point2D;
    const b = evaluateExpression(expr.args[1], sceneGraph) as Point2D;
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  throw new Error(`Unknown function: "${expr.name}"`);
}

function resolveAnchor(path: string, sceneGraph: SceneGraph): Point2D {
  for (const node of sceneGraph.nodes) {
    const feature = node.features.find(f => f.path === path);
    if (feature && feature.kind === 'anchor' && feature.value) {
      return feature.value;
    }
  }
  throw new Error(`Cannot resolve anchor "${path}" — value not yet assigned`);
}
