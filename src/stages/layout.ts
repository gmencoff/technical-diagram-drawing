import { SceneGraph, SceneGraphNode, Point2D, Bounds2D } from '../types/scene-graph.js';
import { parseExpression } from '../expressions/parser.js';
import { evaluateExpression } from '../expressions/evaluator.js';

const DEFAULT_GAP = 100;
const DEFAULT_PADDING = 50;
const PARALLEL_SPACING = 60;

export interface LayoutResult {
  sceneGraph: SceneGraph;
  viewBox: { x: number; y: number; width: number; height: number };
}

export function layout(sceneGraph: SceneGraph): LayoutResult {
  const topLevelNodes = getTopLevelNodes(sceneGraph);
  const annotations = sceneGraph.nodes.filter(n => isAnnotation(n));

  let cursorX = DEFAULT_PADDING;
  let maxHeight = 0;
  const topLevelBounds: Bounds2D[] = [];

  for (const node of topLevelNodes) {
    const bounds = computeAndAssignLayout(node, sceneGraph, cursorX, DEFAULT_PADDING);
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
      shiftNodeVertically(node, sceneGraph, deltaY);
    }
  }

  assignPortPositions(sceneGraph);

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

function computeAndAssignLayout(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number): Bounds2D {
  if (isComposite(node)) {
    return layoutComposite(node, sceneGraph, offsetX, offsetY);
  }

  const bounds = getBounds(node);
  const cx = offsetX + bounds.width / 2;
  const cy = offsetY + bounds.height / 2;
  assignAnchorValue(node, `${node.id}.center`, { x: cx, y: cy });
  return bounds;
}

function layoutComposite(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number): Bounds2D {
  if (node.type === 'rf.ParallelChain') {
    return layoutParallelChain(node, sceneGraph, offsetX, offsetY);
  }

  const childIds = (node.properties.childIds as string[]) || [];
  const gap = (node.properties.gap as number) || DEFAULT_GAP;
  const children = childIds.map(id => sceneGraph.nodes.find(n => n.id === id)).filter(Boolean) as SceneGraphNode[];

  // First pass: compute all children to get their bounds
  let cursorX = offsetX;
  let maxHeight = 0;
  const childBoundsArr: Bounds2D[] = [];

  for (const child of children) {
    const childBounds = computeAndAssignLayout(child, sceneGraph, cursorX, offsetY);
    childBoundsArr.push(childBounds);
    maxHeight = Math.max(maxHeight, childBounds.height);
    cursorX += childBounds.width + gap;
  }

  // Second pass: vertically center each child relative to the tallest
  const compositeCenterY = offsetY + maxHeight / 2;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childBounds = childBoundsArr[i];
    const childCenterY = offsetY + childBounds.height / 2;
    const deltaY = compositeCenterY - childCenterY;
    if (deltaY !== 0) {
      shiftNodeVertically(child, sceneGraph, deltaY);
    }
  }

  const totalWidth = cursorX - gap - offsetX;
  const totalHeight = maxHeight;

  const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
  if (boundsFeature && boundsFeature.kind === 'metric') {
    boundsFeature.value = { width: totalWidth, height: totalHeight };
  }

  assignAnchorValue(node, `${node.id}.center`, { x: offsetX + totalWidth / 2, y: offsetY + totalHeight / 2 });

  return { width: totalWidth, height: totalHeight };
}

function layoutParallelChain(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number): Bounds2D {
  const count = (node.properties.count as number) || 1;
  const chainLength = (node.properties.chainLength as number) || 1;

  const pathNodes: SceneGraphNode[][] = [];
  for (let i = 0; i < count; i++) {
    const path: SceneGraphNode[] = [];
    for (let j = 0; j < chainLength; j++) {
      const elemId = `${node.id}[${i}].element[${j}]`;
      const elemNode = sceneGraph.nodes.find(n => n.id === elemId);
      if (elemNode) path.push(elemNode);
    }
    pathNodes.push(path);
  }

  let maxPathWidth = 0;
  let singlePathHeight = 0;
  for (const path of pathNodes) {
    let pathWidth = 0;
    let pathHeight = 0;
    for (let j = 0; j < path.length; j++) {
      const bounds = getFlowAwareBounds(path[j], 'left-to-right');
      pathWidth += bounds.width + (j < path.length - 1 ? DEFAULT_GAP : 0);
      pathHeight = Math.max(pathHeight, bounds.height);
    }
    maxPathWidth = Math.max(maxPathWidth, pathWidth);
    singlePathHeight = Math.max(singlePathHeight, pathHeight);
  }

  const totalHeight = count * singlePathHeight + (count - 1) * PARALLEL_SPACING;
  const totalWidth = maxPathWidth;

  for (let i = 0; i < pathNodes.length; i++) {
    const path = pathNodes[i];
    const pathY = offsetY + i * (singlePathHeight + PARALLEL_SPACING) + singlePathHeight / 2;
    let cursorX = offsetX;

    for (const elem of path) {
      elem.properties.flowDirection = 'left-to-right';
      const bounds = getFlowAwareBounds(elem, 'left-to-right');
      const cx = cursorX + bounds.width / 2;
      assignAnchorValue(elem, `${elem.id}.center`, { x: cx, y: pathY });
      cursorX += bounds.width + DEFAULT_GAP;
    }
  }

  const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
  if (boundsFeature && boundsFeature.kind === 'metric') {
    boundsFeature.value = { width: totalWidth, height: totalHeight };
  }

  assignAnchorValue(node, `${node.id}.center`, { x: offsetX + totalWidth / 2, y: offsetY + totalHeight / 2 });

  return { width: totalWidth, height: totalHeight };
}

function shiftNodeVertically(node: SceneGraphNode, sceneGraph: SceneGraph, deltaY: number): void {
  offsetNodeAnchors(node, 0, deltaY);

  if (isComposite(node)) {
    const childIds = (node.properties.childIds as string[]) || [];
    for (const childId of childIds) {
      const child = sceneGraph.nodes.find(n => n.id === childId);
      if (child) shiftNodeVertically(child, sceneGraph, deltaY);
    }

    if (node.type === 'rf.ParallelChain') {
      const count = (node.properties.count as number) || 1;
      const chainLength = (node.properties.chainLength as number) || 1;
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < chainLength; j++) {
          const elemId = `${node.id}[${i}].element[${j}]`;
          const elemNode = sceneGraph.nodes.find(n => n.id === elemId);
          if (elemNode) offsetNodeAnchors(elemNode, 0, deltaY);
        }
      }
    }
  }
}


function offsetNodeAnchors(node: SceneGraphNode, dx: number, dy: number): void {
  for (const feature of node.features) {
    if (feature.kind === 'anchor' && feature.value) {
      feature.value = { x: feature.value.x + dx, y: feature.value.y + dy };
    }
  }
}

function assignPortPositions(sceneGraph: SceneGraph): void {
  for (const node of sceneGraph.nodes) {
    const centerFeature = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) continue;
    const center = centerFeature.value;
    const flowDirection = node.properties.flowDirection as string | undefined;
    const bounds = flowDirection ? getFlowAwareBounds(node, flowDirection) : getBounds(node);

    // Antenna port: position depends on flow direction and chain position
    const portFeature = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.port`);
    if (portFeature && portFeature.kind === 'anchor') {
      const chainPosition = node.properties.chainPosition as string | undefined;
      if (flowDirection === 'left-to-right') {
        if (chainPosition === 'last') {
          portFeature.value = { x: center.x - bounds.width / 2, y: center.y };
        } else {
          portFeature.value = { x: center.x + bounds.width / 2, y: center.y };
        }
      } else if (flowDirection === 'right-to-left') {
        if (chainPosition === 'last') {
          portFeature.value = { x: center.x + bounds.width / 2, y: center.y };
        } else {
          portFeature.value = { x: center.x - bounds.width / 2, y: center.y };
        }
      } else {
        portFeature.value = { x: center.x, y: center.y + bounds.height / 2 };
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

  // For parallel chains, alias the chain's input[i]/output[i] to the actual element ports
  for (const node of sceneGraph.nodes) {
    if (node.type !== 'rf.ParallelChain' && node.type !== 'rf.SeriesChain') continue;

    const count = node.properties.count as number | undefined;
    const chainLength = node.properties.chainLength as number | undefined;

    if (node.type === 'rf.ParallelChain' && count && chainLength) {
      for (let i = 0; i < count; i++) {
        const firstElemId = `${node.id}[${i}].element[0]`;
        const lastElemId = `${node.id}[${i}].element[${chainLength - 1}]`;

        const firstElem = sceneGraph.nodes.find(n => n.id === firstElemId);
        const lastElem = sceneGraph.nodes.find(n => n.id === lastElemId);

        const chainInput = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.input[${i}]`);
        const chainOutput = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.output[${i}]`);

        if (firstElem && chainInput && chainInput.kind === 'anchor') {
          const elemPort = firstElem.features.find(f => f.kind === 'anchor' && (f.path === `${firstElemId}.port` || f.path === `${firstElemId}.input`));
          if (elemPort && elemPort.kind === 'anchor' && elemPort.value) {
            chainInput.value = elemPort.value;
          }
        }

        if (lastElem && chainOutput && chainOutput.kind === 'anchor') {
          const elemPort = lastElem.features.find(f => f.kind === 'anchor' && (f.path === `${lastElemId}.port` || f.path === `${lastElemId}.output`));
          if (elemPort && elemPort.kind === 'anchor' && elemPort.value) {
            chainOutput.value = elemPort.value;
          }
        }
      }
    }

    if (node.type === 'rf.SeriesChain') {
      const childIds = (node.properties.childIds as string[]) || [];
      if (childIds.length > 0) {
        const firstChildId = childIds[0];
        const lastChildId = childIds[childIds.length - 1];
        const firstChild = sceneGraph.nodes.find(n => n.id === firstChildId);
        const lastChild = sceneGraph.nodes.find(n => n.id === lastChildId);

        const chainInput = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.input`);
        if (firstChild && chainInput && chainInput.kind === 'anchor') {
          const port = firstChild.features.find(f => f.kind === 'anchor' && (f.path === `${firstChildId}.input` || f.path === `${firstChildId}.port`));
          if (port && port.kind === 'anchor' && port.value) {
            chainInput.value = port.value;
          }
        }

        const chainOutput = node.features.find(f => f.kind === 'anchor' && f.path === `${node.id}.output`);
        if (lastChild && chainOutput && chainOutput.kind === 'anchor') {
          const port = lastChild.features.find(f => f.kind === 'anchor' && (f.path === `${lastChildId}.output` || f.path === `${lastChildId}.port`));
          if (port && port.kind === 'anchor' && port.value) {
            chainOutput.value = port.value;
          }
        }
      }
    }
  }
}

function isAnnotation(node: SceneGraphNode): boolean {
  return node.type.startsWith('annotation.');
}

function isComposite(node: SceneGraphNode): boolean {
  return node.type === 'rf.SeriesChain' || node.type === 'rf.ParallelChain' || node.type === 'layout.Group';
}

function getBounds(node: SceneGraphNode): Bounds2D {
  const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
  if (boundsFeature && boundsFeature.kind === 'metric' && boundsFeature.value) {
    return boundsFeature.value;
  }
  return { width: 30, height: 30 };
}

function getFlowAwareBounds(node: SceneGraphNode, flowDirection: string): Bounds2D {
  const bounds = getBounds(node);
  if (node.type === 'antenna.Element' && (flowDirection === 'left-to-right' || flowDirection === 'right-to-left')) {
    return { width: bounds.height, height: bounds.width };
  }
  return bounds;
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
