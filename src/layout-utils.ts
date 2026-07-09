import { SceneGraph, SceneGraphNode, Point2D, Bounds2D } from './types/scene-graph.js';
import { HandlerLookup } from './registry/object-type-handler.js';

export function getBounds(node: SceneGraphNode): Bounds2D {
  const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
  if (boundsFeature && boundsFeature.kind === 'metric' && boundsFeature.value) {
    return boundsFeature.value;
  }
  return { width: 30, height: 30 };
}

export function assignAnchorValue(node: SceneGraphNode, path: string, value: Point2D): void {
  const feature = node.features.find(f => f.path === path);
  if (feature && feature.kind === 'anchor') {
    feature.value = value;
  }
}

export function assignPortValue(node: SceneGraphNode, path: string, value: Point2D): void {
  const feature = node.features.find(f => f.path === path);
  if (feature && feature.kind === 'port') {
    feature.value = value;
  }
}

export function offsetNodeAnchors(node: SceneGraphNode, dx: number, dy: number): void {
  for (const feature of node.features) {
    if ((feature.kind === 'anchor' || feature.kind === 'port') && feature.value) {
      feature.value = { x: feature.value.x + dx, y: feature.value.y + dy };
    }
  }
}

export function shiftNodeVertically(node: SceneGraphNode, sceneGraph: SceneGraph, deltaY: number, registry: HandlerLookup): void {
  offsetNodeAnchors(node, 0, deltaY);

  const handler = registry.lookup(node.type);
  const descendantIds = handler?.getDescendantIds?.(node) ?? [];
  for (const childId of descendantIds) {
    const child = sceneGraph.nodes.find(n => n.id === childId);
    if (child) shiftNodeVertically(child, sceneGraph, deltaY, registry);
  }
}

export function shiftNodeHorizontally(node: SceneGraphNode, sceneGraph: SceneGraph, deltaX: number, registry: HandlerLookup): void {
  offsetNodeAnchors(node, deltaX, 0);

  const handler = registry.lookup(node.type);
  const descendantIds = handler?.getDescendantIds?.(node) ?? [];
  for (const childId of descendantIds) {
    const child = sceneGraph.nodes.find(n => n.id === childId);
    if (child) shiftNodeHorizontally(child, sceneGraph, deltaX, registry);
  }
}
