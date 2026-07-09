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
    chain: {
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
    const chainSpec = obj.chain as AuthoringObject[];
    const allNodes: SceneGraphNode[] = [];
    const allConnections: ResolvedConnection[] = [];

    for (let i = 0; i < count; i++) {
      const pathId = `${id}[${i}]`;

      for (let j = 0; j < chainSpec.length; j++) {
        const elemSpec = chainSpec[j];
        const elemId = `${pathId}.element[${j}]`;
        const handler = registry.lookup(elemSpec.type);
        if (!handler) continue;

        const childObj: AuthoringObject = { ...elemSpec, id: elemId };
        const node = handler.expand(childObj);
        allNodes.push(node);

        if (j > 0) {
          const prevId = `${pathId}.element[${j - 1}]`;
          const prevOutputPort = getOutputPort(prevId, allNodes);
          const curInputPort = getInputPort(elemId, [node]);
          if (prevOutputPort && curInputPort) {
            allConnections.push({ from: prevOutputPort, to: curInputPort });
          }
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
      properties: { count, chainLength: chainSpec.length },
    };

    for (let i = 0; i < count; i++) {
      const firstElemId = `${id}[${i}].element[0]`;
      const lastElemId = `${id}[${i}].element[${chainSpec.length - 1}]`;
      const inputPort = getInputPort(firstElemId, allNodes);
      const outputPort = getOutputPort(lastElemId, allNodes);

      if (inputPort) {
        chainNode.features.push({ kind: 'anchor', path: `${id}.input[${i}]`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' });
      }
      if (outputPort) {
        chainNode.features.push({ kind: 'anchor', path: `${id}.output[${i}]`, sourceObjectId: id, generatedBy: 'rf.ParallelChain' });
      }
    }

    allNodes.push(chainNode);
    return { nodes: allNodes, connections: allConnections };
  },

  layoutChildren(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number, registry: HandlerLookup): CompositeLayoutResult {
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
        const childHandler = registry.lookup(path[j].type);
        const bounds = childHandler?.getLayoutBounds?.(path[j], { flowDirection: 'left-to-right' }) ?? getBounds(path[j]);
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

      for (let j = 0; j < path.length; j++) {
        const elem = path[j];
        const childHandler = registry.lookup(elem.type);
        const bounds = childHandler?.getLayoutBounds?.(elem, { flowDirection: 'left-to-right' }) ?? getBounds(elem);
        const cx = cursorX + bounds.width / 2;
        assignAnchorValue(elem, `${elem.id}.center`, { x: cx, y: pathY });

        elem.properties.orientation = j === path.length - 1 ? 'left' : 'right';
        elem.properties.flowDirection = 'left-to-right';

        cursorX += bounds.width + DEFAULT_GAP;
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
    const chainLength = (node.properties.chainLength as number) || 0;

    for (let i = 0; i < count; i++) {
      const firstElemId = `${node.id}[${i}].element[0]`;
      const lastElemId = `${node.id}[${i}].element[${chainLength - 1}]`;
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
    const chainLength = (node.properties.chainLength as number) || 0;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < chainLength; j++) {
        ids.push(`${node.id}[${i}].element[${j}]`);
      }
    }
    return ids;
  },

  render(_node: SceneGraphNode): SvgPrimitive[] {
    return [];
  },
};

function getInputPort(id: string, nodes: SceneGraphNode[]): string | undefined {
  for (const node of nodes) {
    if (node.id !== id) continue;
    const port = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.port`);
    if (port) return port.path;
    const input = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.input`);
    if (input) return input.path;
  }
  return undefined;
}

function getOutputPort(id: string, nodes: SceneGraphNode[]): string | undefined {
  for (const node of nodes) {
    if (node.id !== id) continue;
    const port = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.port`);
    if (port) return port.path;
    const output = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.output`);
    if (output) return output.path;
  }
  return undefined;
}
