import { ObjectTypeHandler, HandlerLookup, CompositeExpansionResult } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, ResolvedConnection } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';

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
