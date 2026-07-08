import { ObjectTypeHandler, HandlerLookup, CompositeExpansionResult } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, ResolvedConnection } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';

export const rfSeriesChainHandler: ObjectTypeHandler = {
  typeName: 'rf.SeriesChain',

  properties: {
    objects: {
      type: 'array',
      required: true,
      shortDescription: 'Array of objects connected in series',
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
      generatedBy: 'rf.SeriesChain',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
        { kind: 'anchor', path: `${id}.input`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
        { kind: 'anchor', path: `${id}.output`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
      ],
      properties: {},
    };
  },

  expandComposite(obj: AuthoringObject, registry: HandlerLookup): CompositeExpansionResult {
    const id = obj.id;
    const children = obj.objects as AuthoringObject[];
    const allNodes: SceneGraphNode[] = [];
    const allConnections: ResolvedConnection[] = [];

    const childResults: { nodes: SceneGraphNode[]; inputPorts: string[]; outputPorts: string[] }[] = [];

    for (const child of children) {
      const handler = registry.lookup(child.type);
      if (!handler) continue;

      let nodes: SceneGraphNode[];
      if (handler.expandComposite) {
        const result = handler.expandComposite(child, registry);
        nodes = result.nodes;
        allConnections.push(...result.connections);
      } else {
        nodes = [handler.expand(child)];
      }

      allNodes.push(...nodes);

      const inputPorts = getInputPorts(child.id, nodes);
      const outputPorts = getOutputPorts(child.id, nodes);
      childResults.push({ nodes, inputPorts, outputPorts });
    }

    for (let i = 0; i < childResults.length - 1; i++) {
      const source = childResults[i];
      const target = childResults[i + 1];
      const connections = inferConnections(source.outputPorts, target.inputPorts);
      allConnections.push(...connections);
    }

    const chainNode: SceneGraphNode = {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.SeriesChain',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
      ],
      properties: { childIds: children.map(c => c.id) },
    };

    if (childResults.length > 0) {
      const firstInput = childResults[0].inputPorts;
      const lastOutput = childResults[childResults.length - 1].outputPorts;

      if (firstInput.length === 1) {
        chainNode.features.push({ kind: 'anchor', path: `${id}.input`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
      } else {
        for (let i = 0; i < firstInput.length; i++) {
          chainNode.features.push({ kind: 'anchor', path: `${id}.input[${i}]`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
        }
      }

      if (lastOutput.length === 1) {
        chainNode.features.push({ kind: 'anchor', path: `${id}.output`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
      } else {
        for (let i = 0; i < lastOutput.length; i++) {
          chainNode.features.push({ kind: 'anchor', path: `${id}.output[${i}]`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
        }
      }
    }

    allNodes.push(chainNode);
    return { nodes: allNodes, connections: allConnections };
  },

  render(_node: SceneGraphNode): SvgPrimitive[] {
    return [];
  },
};

function getInputPorts(id: string, nodes: SceneGraphNode[]): string[] {
  const ports: string[] = [];
  for (const node of nodes) {
    if (node.id !== id) continue;
    const singlePort = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.port`);
    if (singlePort) {
      ports.push(singlePort.path);
      return ports;
    }
    const singleInput = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.input`);
    if (singleInput) {
      ports.push(singleInput.path);
      return ports;
    }
    const indexed = node.features
      .filter(f => f.kind === 'anchor' && f.path.match(new RegExp(`^${escapeRegex(id)}\\.input\\[\\d+\\]$`)))
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (indexed.length > 0) {
      return indexed.map(f => f.path);
    }
  }
  return ports;
}

function getOutputPorts(id: string, nodes: SceneGraphNode[]): string[] {
  const ports: string[] = [];
  for (const node of nodes) {
    if (node.id !== id) continue;
    const singlePort = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.port`);
    if (singlePort) {
      ports.push(singlePort.path);
      return ports;
    }
    const singleOutput = node.features.find(f => f.kind === 'anchor' && f.path === `${id}.output`);
    if (singleOutput) {
      ports.push(singleOutput.path);
      return ports;
    }
    const indexed = node.features
      .filter(f => f.kind === 'anchor' && f.path.match(new RegExp(`^${escapeRegex(id)}\\.output\\[\\d+\\]$`)))
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (indexed.length > 0) {
      return indexed.map(f => f.path);
    }
  }
  return ports;
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
