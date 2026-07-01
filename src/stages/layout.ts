import { SceneGraph, SceneGraphNode, Point2D, Bounds2D } from '../types/scene-graph.js';
import { parseExpression } from '../expressions/parser.js';
import { evaluateExpression } from '../expressions/evaluator.js';

const DEFAULT_GAP = 100;
const DEFAULT_PADDING = 50;

export interface LayoutResult {
  sceneGraph: SceneGraph;
  viewBox: { x: number; y: number; width: number; height: number };
}

export function layout(sceneGraph: SceneGraph): LayoutResult {
  const placeable = sceneGraph.nodes.filter(n => !isAnnotation(n));
  const annotations = sceneGraph.nodes.filter(n => isAnnotation(n));

  // Place objects left-to-right
  let cursorX = DEFAULT_PADDING;
  let maxHeight = 0;

  for (const node of placeable) {
    const bounds = getBounds(node);
    maxHeight = Math.max(maxHeight, bounds.height);
  }

  const centerY = DEFAULT_PADDING + maxHeight / 2;

  for (const node of placeable) {
    const bounds = getBounds(node);
    const centerX = cursorX + bounds.width / 2;
    assignAnchorValue(node, `${node.id}.center`, { x: centerX, y: centerY });
    cursorX += bounds.width + DEFAULT_GAP;
  }

  // Resolve annotation properties from the now-positioned scene graph
  for (const node of annotations) {
    resolveAnnotationProperties(node, sceneGraph);
  }

  const totalWidth = cursorX - DEFAULT_GAP + DEFAULT_PADDING;
  const totalHeight = maxHeight + DEFAULT_PADDING * 2;

  return {
    sceneGraph,
    viewBox: { x: 0, y: 0, width: totalWidth, height: totalHeight },
  };
}

function isAnnotation(node: SceneGraphNode): boolean {
  return node.type.startsWith('annotation.');
}

function getBounds(node: SceneGraphNode): Bounds2D {
  const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
  if (boundsFeature && boundsFeature.kind === 'metric' && boundsFeature.value) {
    return boundsFeature.value;
  }
  return { width: 30, height: 30 };
}

function assignAnchorValue(node: SceneGraphNode, path: string, value: Point2D): void {
  const feature = node.features.find(f => f.path === path);
  if (feature && feature.kind === 'anchor') {
    feature.value = value;
  }
}

function resolveAnnotationProperties(node: SceneGraphNode, sceneGraph: SceneGraph): void {
  for (const [propName, value] of Object.entries(node.properties)) {
    if (typeof value !== 'string') continue;

    const expr = parseExpression(value);
    const resolved = evaluateExpression(expr, sceneGraph);
    node.properties[propName] = resolved;
  }

  // Update the annotation's own center anchor from its resolved center property
  const resolvedCenter = node.properties.center;
  if (resolvedCenter && typeof resolvedCenter === 'object' && 'x' in resolvedCenter) {
    assignAnchorValue(node, `${node.id}.center`, resolvedCenter as Point2D);
  }
}
