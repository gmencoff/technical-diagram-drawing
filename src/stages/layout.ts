import { SceneGraph, SceneGraphNode, Point2D, Bounds2D } from '../types/scene-graph.js';
import { HandlerLookup } from '../registry/object-type-handler.js';
import { getBounds, assignAnchorValue, shiftNodeVertically } from '../layout-utils.js';
import { parseExpression } from '../expressions/parser.js';
import { evaluateExpression } from '../expressions/evaluator.js';

const DEFAULT_GAP = 100;
const DEFAULT_PADDING = 50;

export interface LayoutResult {
  sceneGraph: SceneGraph;
  viewBox: { x: number; y: number; width: number; height: number };
}

export function layout(sceneGraph: SceneGraph, registry: HandlerLookup): LayoutResult {
  const topLevelNodes = getTopLevelNodes(sceneGraph);
  const annotations = sceneGraph.nodes.filter(n => isAnnotation(n));

  let cursorX = DEFAULT_PADDING;
  let maxHeight = 0;
  const topLevelBounds: Bounds2D[] = [];

  for (const node of topLevelNodes) {
    const bounds = computeAndAssignLayout(node, sceneGraph, cursorX, DEFAULT_PADDING, registry);
    topLevelBounds.push(bounds);
    maxHeight = Math.max(maxHeight, bounds.height);
    cursorX += bounds.width + DEFAULT_GAP;
  }

  // Vertically center all top-level nodes relative to the tallest
  const globalCenterY = DEFAULT_PADDING + maxHeight / 2;
  for (let i = 0; i < topLevelNodes.length; i++) {
    const node = topLevelNodes[i];
    const bounds = topLevelBounds[i];
    const currentCenterY = DEFAULT_PADDING + bounds.height / 2;
    const deltaY = globalCenterY - currentCenterY;
    if (deltaY !== 0) {
      shiftNodeVertically(node, sceneGraph, deltaY, registry);
    }
  }

  assignPortPositions(sceneGraph, registry);

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

function getTopLevelNodes(sceneGraph: SceneGraph): SceneGraphNode[] {
  const childIds = new Set<string>();
  for (const node of sceneGraph.nodes) {
    if (node.properties.childIds) {
      for (const childId of node.properties.childIds as string[]) {
        childIds.add(childId);
      }
    }
  }

  const expandedChildPattern = /\[\d+\]\.element\[\d+\]$/;
  return sceneGraph.nodes.filter(n => {
    if (isAnnotation(n)) return false;
    if (childIds.has(n.id)) return false;
    if (expandedChildPattern.test(n.id)) return false;
    if (n.id !== n.sourceObjectId && n.id !== n.sourceObjectId) return false;
    return true;
  });
}

function computeAndAssignLayout(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number, registry: HandlerLookup): Bounds2D {
  const handler = registry.lookup(node.type);
  if (handler?.layoutChildren) {
    return handler.layoutChildren(node, sceneGraph, offsetX, offsetY, registry).bounds;
  }

  const bounds = getBounds(node);
  const cx = offsetX + bounds.width / 2;
  const cy = offsetY + bounds.height / 2;
  assignAnchorValue(node, `${node.id}.center`, { x: cx, y: cy });
  return bounds;
}


function assignPortPositions(sceneGraph: SceneGraph, registry: HandlerLookup): void {
  for (const node of sceneGraph.nodes) {
    const centerFeature = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) continue;
    const center = centerFeature.value;
    const flowDirection = node.properties.flowDirection as string | undefined;
    const bounds = flowDirection ? getFlowAwareBounds(node, flowDirection, registry) : getBounds(node);

    const handler = registry.lookup(node.type);
    if (handler?.assignPortPositions) {
      const context = { flowDirection: flowDirection as import('../registry/object-type-handler.js').FlowDirection | undefined };
      const portPositions = handler.assignPortPositions(node, center, bounds, context);
      for (const [path, value] of Object.entries(portPositions)) {
        assignAnchorValue(node, path, value);
      }
    }

    // Input port (single): left edge center
    const inputFeature = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.input`);
    if (inputFeature && inputFeature.kind === 'anchor') {
      inputFeature.value = { x: center.x - bounds.width / 2, y: center.y };
    }

    // Output port (single): right edge center
    const outputFeature = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.output`);
    if (outputFeature && outputFeature.kind === 'anchor') {
      outputFeature.value = { x: center.x + bounds.width / 2, y: center.y };
    }

    // Indexed input ports: distributed vertically along left edge
    const inputPorts = node.features
      .filter(f => f.kind === 'anchor' && f.path.match(new RegExp(`^${escapeRegex(node.id)}\\.input\\[\\d+\\]$`)))
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (inputPorts.length > 0) {
      const spacing = bounds.height / (inputPorts.length + 1);
      for (let i = 0; i < inputPorts.length; i++) {
        const port = inputPorts[i];
        if (port.kind === 'anchor') {
          port.value = { x: center.x - bounds.width / 2, y: center.y - bounds.height / 2 + spacing * (i + 1) };
        }
      }
    }

    // Indexed output ports: distributed vertically along right edge
    const outputPorts = node.features
      .filter(f => f.kind === 'anchor' && f.path.match(new RegExp(`^${escapeRegex(node.id)}\\.output\\[\\d+\\]$`)))
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (outputPorts.length > 0) {
      const spacing = bounds.height / (outputPorts.length + 1);
      for (let i = 0; i < outputPorts.length; i++) {
        const port = outputPorts[i];
        if (port.kind === 'anchor') {
          port.value = { x: center.x + bounds.width / 2, y: center.y - bounds.height / 2 + spacing * (i + 1) };
        }
      }
    }
  }

  for (const node of sceneGraph.nodes) {
    const handler = registry.lookup(node.type);
    if (!handler?.resolveCompositePortAliases) continue;
    const aliases = handler.resolveCompositePortAliases(node, sceneGraph);
    for (const [path, value] of Object.entries(aliases)) {
      assignAnchorValue(node, path, value);
    }
  }
}

function isAnnotation(node: SceneGraphNode): boolean {
  return node.type.startsWith('annotation.');
}

function getFlowAwareBounds(node: SceneGraphNode, flowDirection: string, registry: HandlerLookup): Bounds2D {
  const handler = registry.lookup(node.type);
  if (handler?.getLayoutBounds) {
    return handler.getLayoutBounds(node, { flowDirection: flowDirection as import('../registry/object-type-handler.js').FlowDirection });
  }
  return getBounds(node);
}

function resolveAnnotationProperties(node: SceneGraphNode, sceneGraph: SceneGraph): void {
  for (const [propName, value] of Object.entries(node.properties)) {
    if (typeof value !== 'string') continue;

    const expr = parseExpression(value);
    const resolved = evaluateExpression(expr, sceneGraph);
    node.properties[propName] = resolved;
  }

  const resolvedCenter = node.properties.center;
  if (resolvedCenter && typeof resolvedCenter === 'object' && 'x' in resolvedCenter) {
    assignAnchorValue(node, `${node.id}.center`, resolvedCenter as Point2D);
  }
}

function extractIndex(path: string): number {
  const match = path.match(/\[(\d+)\]$/);
  return match ? parseInt(match[1], 10) : 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
