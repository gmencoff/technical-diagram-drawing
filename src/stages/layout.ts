import { SceneGraph, SceneGraphNode, Point2D, Bounds2D } from '../types/scene-graph.js';
import { HandlerLookup } from '../registry/object-type-handler.js';
import { getBounds, assignAnchorValue, assignPortValue, shiftNodeVertically } from '../layout-utils.js';
import { parseExpression } from '../expressions/parser.js';
import { evaluateExpression } from '../expressions/evaluator.js';
import { DEFAULT_STYLE } from '../style-config.js';

const DEFAULT_GAP = 100;
const DEFAULT_PADDING = 50;

export interface LayoutResult {
  sceneGraph: SceneGraph;
  viewBox: { x: number; y: number; width: number; height: number };
}

export function layout(sceneGraph: SceneGraph, registry: HandlerLookup): LayoutResult {
  const topLevelNodes = getTopLevelNodes(sceneGraph, registry);
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
    resolveAnnotationProperties(node, sceneGraph, registry);
  }

  const totalWidth = cursorX - DEFAULT_GAP + DEFAULT_PADDING;
  const totalHeight = maxHeight + DEFAULT_PADDING * 2;

  return {
    sceneGraph,
    viewBox: { x: 0, y: 0, width: totalWidth, height: totalHeight },
  };
}

function getTopLevelNodes(sceneGraph: SceneGraph, registry: HandlerLookup): SceneGraphNode[] {
  const childIds = new Set<string>();

  function collectDescendants(node: SceneGraphNode): void {
    const handler = registry.lookup(node.type);
    const descendants = handler?.getDescendantIds?.(node) ?? [];
    for (const id of descendants) {
      childIds.add(id);
      const child = sceneGraph.nodes.find(n => n.id === id);
      if (child) collectDescendants(child);
    }
  }

  for (const node of sceneGraph.nodes) {
    collectDescendants(node);
  }

  return sceneGraph.nodes.filter(n => {
    if (isAnnotation(n)) return false;
    if (childIds.has(n.id)) return false;
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
      handler.assignPortPositions(node, center, bounds, context);
    }

    const stub = DEFAULT_STYLE.portStubLength;

    // Input ports (single): left edge center, offset outward by stub
    const inputFeature = node.features.find(f => f.kind === 'port' && f.role === 'input' && f.path === `${node.id}.input`);
    if (inputFeature && inputFeature.kind === 'port') {
      inputFeature.value = { x: center.x - bounds.width / 2 - stub, y: center.y };
    }

    // Output ports (single): right edge center, offset outward by stub
    const outputFeature = node.features.find(f => f.kind === 'port' && f.role === 'output' && f.path === `${node.id}.output`);
    if (outputFeature && outputFeature.kind === 'port') {
      outputFeature.value = { x: center.x + bounds.width / 2 + stub, y: center.y };
    }

    // Indexed input ports: distributed vertically along left edge, offset outward by stub
    const inputPorts = node.features
      .filter(f => f.kind === 'port' && f.role === 'input')
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (inputPorts.length > 0 && !inputFeature) {
      const spacing = bounds.height / (inputPorts.length + 1);
      for (let i = 0; i < inputPorts.length; i++) {
        const port = inputPorts[i];
        port.value = { x: center.x - bounds.width / 2 - stub, y: center.y - bounds.height / 2 + spacing * (i + 1) };
      }
    }

    // Indexed output ports: distributed vertically along right edge, offset outward by stub
    const outputPorts = node.features
      .filter(f => f.kind === 'port' && f.role === 'output')
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (outputPorts.length > 0 && !outputFeature) {
      const spacing = bounds.height / (outputPorts.length + 1);
      for (let i = 0; i < outputPorts.length; i++) {
        const port = outputPorts[i];
        port.value = { x: center.x + bounds.width / 2 + stub, y: center.y - bounds.height / 2 + spacing * (i + 1) };
      }
    }
  }

  for (const node of sceneGraph.nodes) {
    const handler = registry.lookup(node.type);
    if (!handler?.resolveCompositePortAliases) continue;
    const aliases = handler.resolveCompositePortAliases(node, sceneGraph);
    for (const [path, value] of Object.entries(aliases)) {
      assignPortValue(node, path, value);
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

function resolveAnnotationProperties(node: SceneGraphNode, sceneGraph: SceneGraph, registry: HandlerLookup): void {
  const handler = registry.lookup(node.type);
  const expressionProps = getExpressionPropertyNames(handler);

  for (const [propName, value] of Object.entries(node.properties)) {
    if (typeof value !== 'string') continue;
    if (!expressionProps.has(propName)) continue;

    const expr = parseExpression(value);
    const resolved = evaluateExpression(expr, sceneGraph);
    node.properties[propName] = resolved;
  }

  const resolvedCenter = node.properties.center;
  if (resolvedCenter && typeof resolvedCenter === 'object' && 'x' in resolvedCenter) {
    assignAnchorValue(node, `${node.id}.center`, resolvedCenter as Point2D);
  }

  if (node.type === 'annotation.Rectangle') {
    const tl = node.properties.topLeft as Point2D | undefined;
    const br = node.properties.bottomRight as Point2D | undefined;
    const padding = (node.properties.padding as number) ?? 10;
    const padTop = (node.properties.paddingTop as number | undefined) ?? padding;
    const padRight = (node.properties.paddingRight as number | undefined) ?? padding;
    const padBottom = (node.properties.paddingBottom as number | undefined) ?? padding;
    const padLeft = (node.properties.paddingLeft as number | undefined) ?? padding;

    if (tl && br) {
      const x1 = tl.x - padLeft;
      const y1 = tl.y - padTop;
      const x2 = br.x + padRight;
      const y2 = br.y + padBottom;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      assignAnchorValue(node, `${node.id}.topLeft`, { x: x1, y: y1 });
      assignAnchorValue(node, `${node.id}.topRight`, { x: x2, y: y1 });
      assignAnchorValue(node, `${node.id}.bottomLeft`, { x: x1, y: y2 });
      assignAnchorValue(node, `${node.id}.bottomRight`, { x: x2, y: y2 });
      assignAnchorValue(node, `${node.id}.top`, { x: midX, y: y1 });
      assignAnchorValue(node, `${node.id}.bottom`, { x: midX, y: y2 });
      assignAnchorValue(node, `${node.id}.left`, { x: x1, y: midY });
      assignAnchorValue(node, `${node.id}.right`, { x: x2, y: midY });
      assignAnchorValue(node, `${node.id}.center`, { x: midX, y: midY });

      const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
      if (boundsFeature && boundsFeature.kind === 'metric') {
        boundsFeature.value = { width: x2 - x1, height: y2 - y1 };
      }
    }
  }

  if (node.type === 'annotation.Text') {
    const anchor = node.properties.anchor as Point2D | undefined;
    if (anchor) {
      assignAnchorValue(node, `${node.id}.center`, anchor);
    }
  }
}

function getExpressionPropertyNames(handler: import('../registry/object-type-handler.js').ObjectTypeHandler | undefined): Set<string> {
  const names = new Set<string>();
  if (!handler) return names;
  for (const [propName, propDef] of Object.entries(handler.properties)) {
    if (propDef.type === 'expression') {
      names.add(propName);
    }
  }
  return names;
}

function extractIndex(path: string): number {
  const match = path.match(/\[(\d+)\]$/);
  return match ? parseInt(match[1], 10) : 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
