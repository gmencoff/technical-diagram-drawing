import { SceneGraph, Point2D } from '../types/scene-graph.js';
import { SvgPrimitive } from '../types/svg-primitives.js';
import { ObjectTypeHandler, HandlerLookup } from '../registry/object-type-handler.js';

export function svgGeneration(sceneGraph: SceneGraph, handlers: Map<string, ObjectTypeHandler>, registry: HandlerLookup): SvgPrimitive[] {
  const primitives: SvgPrimitive[] = [];

  for (const node of sceneGraph.nodes) {
    const handler = handlers.get(node.id) || registry.lookup(node.type);
    if (!handler) continue;
    const nodePrimitives = handler.render(node);
    primitives.push(...nodePrimitives);
  }

  for (const conn of sceneGraph.connections) {
    const fromPoint = resolveAnchorPoint(conn.from, sceneGraph);
    const toPoint = resolveAnchorPoint(conn.to, sceneGraph);
    if (fromPoint && toPoint) {
      primitives.push({
        kind: 'line',
        x1: fromPoint.x,
        y1: fromPoint.y,
        x2: toPoint.x,
        y2: toPoint.y,
        stroke: '#333',
      });
    }
  }

  return primitives;
}

function resolveAnchorPoint(path: string, sceneGraph: SceneGraph): Point2D | undefined {
  for (const node of sceneGraph.nodes) {
    const feature = node.features.find(f => f.path === path);
    if (feature && feature.kind === 'anchor' && feature.value) {
      return feature.value;
    }
  }
  return undefined;
}
