import { ObjectTypeHandler, HandlerLookup, CompositeExpansionResult, CompositeLayoutResult } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, SceneGraph, ResolvedConnection, Bounds2D, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';
import { getBounds, assignAnchorValue } from '../../layout-utils.js';

const DEFAULT_GAP = 100;
const PARALLEL_SPACING = 60;

export const rfParallelChainHandler: ObjectTypeHandler = {
  typeName: 'rf.ParallelChain',

  properties: {
    count: {
      type: 'number',
      required: true,
      shortDescription: 'Number of parallel paths',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'number' || value < 1 || !Number.isInteger(value)) {
          throw new Error(`${propertyName} must be a positive integer`);
        }
      },
    },
    objects: {
      type: 'array',
      required: true,
      shortDescription: 'Array of element types forming one series path',
      validate(value: unknown, propertyName: string): void {
        if (!Array.isArray(value)) {
          throw new Error(`${propertyName} must be an array`);
        }
      },
    },
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.ParallelChain',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' },
      ],
      properties: {},
    };
  },

  expandComposite(obj: AuthoringObject, registry: HandlerLookup): CompositeExpansionResult {
    const id = obj.id;
    const count = obj.count as number;
    const objects = obj.objects as AuthoringObject[];
    const allNodes: SceneGraphNode[] = [];
    const allConnections: ResolvedConnection[] = [];

    const childIds = objects.map(spec => spec.id);

    for (let i = 0; i < count; i++) {
      const pathId = `${id}.${i + 1}`;

      for (let j = 0; j < objects.length; j++) {
        const elemSpec = objects[j];
        const elemId = `${pathId}.${childIds[j]}`;
        const handler = registry.lookup(elemSpec.type);
        if (!handler) continue;

        const childObj: AuthoringObject = { ...elemSpec, id: elemId };
        let nodes: SceneGraphNode[];
        if (handler.expandComposite) {
          const result = handler.expandComposite(childObj, registry);
          nodes = result.nodes;
          allConnections.push(...result.connections);
        } else {
          nodes = [handler.expand(childObj)];
        }
        allNodes.push(...nodes);

        if (j > 0) {
          const prevId = `${pathId}.${childIds[j - 1]}`;
          const prevOutputPorts = getOutputPorts(prevId, allNodes);
          const curInputPorts = getInputPorts(elemId, nodes);
          const connections = inferConnections(prevOutputPorts, curInputPorts);
          allConnections.push(...connections);
        }
      }
    }

    const chainNode: SceneGraphNode = {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.ParallelChain',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' },
      ],
      properties: { count, childIds },
    };

    for (let i = 0; i < count; i++) {
      const pathId = `${id}.${i + 1}`;
      const firstElemId = `${pathId}.${childIds[0]}`;
      const lastElemId = `${pathId}.${childIds[childIds.length - 1]}`;
      const inputPorts = getInputPorts(firstElemId, allNodes);
      const outputPorts = getOutputPorts(lastElemId, allNodes);

      if (inputPorts.length > 0) {
        chainNode.features.push({ kind: 'anchor', path: `${id}.input[${i}]`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' });
      }
      if (outputPorts.length > 0) {
        chainNode.features.push({ kind: 'anchor', path: `${id}.output[${i}]`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' });
      }
    }

    allNodes.push(chainNode);
    return { nodes: allNodes, connections: allConnections };
  },

  layoutChildren(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number, registry: HandlerLookup): CompositeLayoutResult {
    const count = (node.properties.count as number) || 1;
    const childIds = (node.properties.childIds as string[]) || [];

    const pathNodes: SceneGraphNode[][] = [];
    for (let i = 0; i < count; i++) {
      const pathId = `${node.id}.${i + 1}`;
      const path: SceneGraphNode[] = [];
      for (const childId of childIds) {
        const elemId = `${pathId}.${childId}`;
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
        const childHandler = registry.lookup(path[j].type);
        let bounds: Bounds2D;
        if (childHandler?.layoutChildren) {
          bounds = getBounds(path[j]);
          const dryResult = childHandler.layoutChildren(path[j], sceneGraph, 0, 0, registry);
          bounds = dryResult.bounds;
        } else {
          bounds = childHandler?.getLayoutBounds?.(path[j], { flowDirection: 'left-to-right' }) ?? getBounds(path[j]);
        }
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
      const pathY = offsetY + i * (singlePathHeight + PARALLEL_SPACING);
      let cursorX = offsetX;

      for (let j = 0; j < path.length; j++) {
        const elem = path[j];
        const childHandler = registry.lookup(elem.type);

        if (childHandler?.layoutChildren) {
          childHandler.layoutChildren(elem, sceneGraph, cursorX, pathY, registry);
          const childBounds = getBounds(elem);
          cursorX += childBounds.width + DEFAULT_GAP;
        } else {
          const bounds = childHandler?.getLayoutBounds?.(elem, { flowDirection: 'left-to-right' }) ?? getBounds(elem);
          const cx = cursorX + bounds.width / 2;
          const cy = pathY + singlePathHeight / 2;
          assignAnchorValue(elem, `${elem.id}.center`, { x: cx, y: cy });

          elem.properties.orientation = j === path.length - 1 ? 'left' : 'right';
          elem.properties.flowDirection = 'left-to-right';

          cursorX += bounds.width + DEFAULT_GAP;
        }
      }
    }

    const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
    if (boundsFeature && boundsFeature.kind === 'metric') {
      boundsFeature.value = { width: totalWidth, height: totalHeight };
    }
    assignAnchorValue(node, `${node.id}.center`, { x: offsetX + totalWidth / 2, y: offsetY + totalHeight / 2 });

    return { bounds: { width: totalWidth, height: totalHeight } };
  },

  resolveCompositePortAliases(node: SceneGraphNode, sceneGraph: SceneGraph): Record<string, Point2D> {
    const aliases: Record<string, Point2D> = {};
    const count = (node.properties.count as number) || 0;
    const childIds = (node.properties.childIds as string[]) || [];
    if (childIds.length === 0) return aliases;

    for (let i = 0; i < count; i++) {
      const pathId = `${node.id}.${i + 1}`;
      const firstElemId = `${pathId}.${childIds[0]}`;
      const lastElemId = `${pathId}.${childIds[childIds.length - 1]}`;
      const firstElem = sceneGraph.nodes.find(n => n.id === firstElemId);
      const lastElem = sceneGraph.nodes.find(n => n.id === lastElemId);

      if (firstElem) {
        const elemPort = firstElem.features.find(f => f.kind === 'anchor' && (f.path === `${firstElemId}.port` || f.path === `${firstElemId}.input`));
        if (elemPort && elemPort.kind === 'anchor' && elemPort.value) {
          aliases[`${node.id}.input[${i}]`] = elemPort.value;
        }
      }

      if (lastElem) {
        const elemPort = lastElem.features.find(f => f.kind === 'anchor' && (f.path === `${lastElemId}.port` || f.path === `${lastElemId}.output`));
        if (elemPort && elemPort.kind === 'anchor' && elemPort.value) {
          aliases[`${node.id}.output[${i}]`] = elemPort.value;
        }
      }
    }
    return aliases;
  },

  getDescendantIds(node: SceneGraphNode): string[] {
    const ids: string[] = [];
    const count = (node.properties.count as number) || 0;
    const childIds = (node.properties.childIds as string[]) || [];
    for (let i = 0; i < count; i++) {
      const pathId = `${node.id}.${i + 1}`;
      for (const childId of childIds) {
        ids.push(`${pathId}.${childId}`);
      }
    }
    return ids;
  },

  render(_node: SceneGraphNode): SvgPrimitive[] {
    return [];
  },
};

function getInputPorts(id: string, nodes: SceneGraphNode[]): string[] {
  for (const node of nodes) {
    if (node.id !== id) continue;
    const port = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.port`);
    if (port) return [port.path];
    const input = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.input`);
    if (input) return [input.path];
    const indexed = node.features
      .filter(f => f.kind === 'anchor' && f.path.match(new RegExp(`^${escapeRegex(id)}\\.input\\[\\d+\\]$`)))
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (indexed.length > 0) return indexed.map(f => f.path);
  }
  return [];
}

function getOutputPorts(id: string, nodes: SceneGraphNode[]): string[] {
  for (const node of nodes) {
    if (node.id !== id) continue;
    const port = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.port`);
    if (port) return [port.path];
    const output = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.output`);
    if (output) return [output.path];
    const indexed = node.features
      .filter(f => f.kind === 'anchor' && f.path.match(new RegExp(`^${escapeRegex(id)}\\.output\\[\\d+\\]$`)))
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (indexed.length > 0) return indexed.map(f => f.path);
  }
  return [];
}

function inferConnections(sourcePorts: string[], targetPorts: string[]): ResolvedConnection[] {
  const connections: ResolvedConnection[] = [];
  if (sourcePorts.length === targetPorts.length) {
    for (let i = 0; i < sourcePorts.length; i++) {
      connections.push({ from: sourcePorts[i], to: targetPorts[i] });
    }
  } else if (sourcePorts.length === 1 && targetPorts.length > 1) {
    for (const target of targetPorts) {
      connections.push({ from: sourcePorts[0], to: target });
    }
  } else if (sourcePorts.length > 1 && targetPorts.length === 1) {
    for (const source of sourcePorts) {
      connections.push({ from: source, to: targetPorts[0] });
    }
  }
  return connections;
}

function extractIndex(path: string): number {
  const match = path.match(/\[(\d+)\]$/);
  return match ? parseInt(match[1], 10) : 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
