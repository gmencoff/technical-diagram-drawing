import { SceneGraph } from '../types/scene-graph.js';
import { SvgPrimitive } from '../types/svg-primitives.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';

export function svgGeneration(sceneGraph: SceneGraph, handlers: Map<string, ObjectTypeHandler>): SvgPrimitive[] {
  const primitives: SvgPrimitive[] = [];

  for (const node of sceneGraph.nodes) {
    const handler = handlers.get(node.id)!;
    const nodePrimitives = handler.render(node);
    primitives.push(...nodePrimitives);
  }

  return primitives;
}
