import { ObjectTypeHandler, HandlerLookup, CompositeExpansionResult, CompositeLayoutResult } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, SceneGraph, ResolvedConnection, Bounds2D, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition, ArrayPropertyDefinition } from '../../types/property-definition.js';
import { getBounds, assignAnchorValue, shiftNodeVertically } from '../../layout-utils.js';

const DEFAULT_GAP = 100;

function getGapBetween(leftHandler: ObjectTypeHandler | undefined, rightHandler: ObjectTypeHandler | undefined, leftNode: SceneGraphNode, rightNode: SceneGraphNode): number {
  const leftGaps = leftHandler?.getChainGaps?.(leftNode);
  const rightGaps = rightHandler?.getChainGaps?.(rightNode);
  if (leftGaps || rightGaps) {
    return (leftGaps?.outputGap ?? 15) + (rightGaps?.inputGap ?? 15);
  }
  return DEFAULT_GAP;
}

export const rfSeriesChainHandler: ObjectTypeHandler = {
  typeName: 'rf.SeriesChain',

  properties: {
    objects: new ArrayPropertyDefinition({
      required: true,
      shortDescription: 'Array of objects connected in series',
    }),
  } satisfies Record<string, PropertyDefinition>,

  validateChildren(obj: AuthoringObject, childHandlers: Map<string, ObjectTypeHandler>, registry: HandlerLookup): string[] {
    const errors: string[] = [];
    const children = obj.objects as AuthoringObject[];
    if (!children) return errors;

    for (let i = 1; i < children.length; i++) {
      const child = children[i];
      const handler = childHandlers.get(child.id);
      if (!handler) continue;
      let nodes: SceneGraphNode[];
      if (handler.expandComposite) {
        const result = handler.expandComposite(child, registry);
        nodes = result.nodes;
      } else {
        nodes = [handler.expand(child)];
      }
      const inputPorts = getInputPorts(child.id, nodes);
      if (inputPorts.length === 0) {
        errors.push(`"${child.id}" has no input port and cannot be placed after "${children[i - 1].id}" in chain "${obj.id}"`);
      }
    }
    return errors;
  },

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.SeriesChain',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
        { kind: 'port', path: `${id}.input`, role: 'input', sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
        { kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.SeriesChain' },
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
        chainNode.features.push({ kind: 'port', path: `${id}.input`, role: 'input', sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
      } else {
        for (let i = 0; i < firstInput.length; i++) {
          chainNode.features.push({ kind: 'port', path: `${id}.input[${i}]`, role: 'input', sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
        }
      }

      if (lastOutput.length === 1) {
        chainNode.features.push({ kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
      } else {
        for (let i = 0; i < lastOutput.length; i++) {
          chainNode.features.push({ kind: 'port', path: `${id}.output[${i}]`, role: 'output', sourceObjectId: id, generatedBy: 'rf.SeriesChain' });
        }
      }
    }

    allNodes.push(chainNode);
    return { nodes: allNodes, connections: allConnections };
  },

  layoutChildren(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number, registry: HandlerLookup): CompositeLayoutResult {
    const childIds = (node.properties.childIds as string[]) || [];
    const children = childIds.map(id => sceneGraph.nodes.find(n => n.id === id)).filter(Boolean) as SceneGraphNode[];

    let cursorX = offsetX;
    let maxHeight = 0;
    const childBoundsArr: Bounds2D[] = [];
    const childHandlers: (ObjectTypeHandler | undefined)[] = [];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childHandler = registry.lookup(child.type);
      childHandlers.push(childHandler);
      let childBounds: Bounds2D;
      if (childHandler?.layoutChildren) {
        childBounds = childHandler.layoutChildren(child, sceneGraph, cursorX, offsetY, registry).bounds;
      } else {
        const bounds = childHandler?.getLayoutBounds?.(child, {}) ?? getBounds(child);
        const cx = cursorX + bounds.width / 2;
        const cy = offsetY + bounds.height / 2;
        assignAnchorValue(child, `${child.id}.center`, { x: cx, y: cy });
        childBounds = bounds;
      }
      childBoundsArr.push(childBounds);
      maxHeight = Math.max(maxHeight, childBounds.height);
      cursorX += childBounds.width;
      if (i < children.length - 1) {
        const nextChild = children[i + 1];
        const nextHandler = registry.lookup(nextChild.type);
        cursorX += getGapBetween(childHandler, nextHandler, child, nextChild);
      }
    }

    const compositeCenterY = offsetY + maxHeight / 2;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childBounds = childBoundsArr[i];
      const childCenterY = offsetY + childBounds.height / 2;
      const deltaY = compositeCenterY - childCenterY;
      if (deltaY !== 0) {
        shiftNodeVertically(child, sceneGraph, deltaY, registry);
      }
    }

    const totalWidth = cursorX - offsetX;
    const totalHeight = maxHeight;

    const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
    if (boundsFeature && boundsFeature.kind === 'metric') {
      boundsFeature.value = { width: totalWidth, height: totalHeight };
    }
    assignAnchorValue(node, `${node.id}.center`, { x: offsetX + totalWidth / 2, y: offsetY + totalHeight / 2 });

    return { bounds: { width: totalWidth, height: totalHeight } };
  },

  resolveCompositePortAliases(node: SceneGraphNode, sceneGraph: SceneGraph): Record<string, Point2D> {
    const aliases: Record<string, Point2D> = {};
    const childIds = (node.properties.childIds as string[]) || [];
    if (childIds.length === 0) return aliases;

    const firstChildId = childIds[0];
    const lastChildId = childIds[childIds.length - 1];
    const firstChild = sceneGraph.nodes.find(n => n.id === firstChildId);
    const lastChild = sceneGraph.nodes.find(n => n.id === lastChildId);

    if (firstChild) {
      const port = firstChild.features.find(f => f.kind === 'port' && (f.role === 'bidirectional' || f.role === 'input'));
      if (port && port.kind === 'port' && port.value) {
        aliases[`${node.id}.input`] = port.value;
      }
    }

    if (lastChild) {
      const port = lastChild.features.find(f => f.kind === 'port' && (f.role === 'bidirectional' || f.role === 'output'));
      if (port && port.kind === 'port' && port.value) {
        aliases[`${node.id}.output`] = port.value;
      }
    }

    return aliases;
  },

  getDescendantIds(node: SceneGraphNode): string[] {
    return (node.properties.childIds as string[]) || [];
  },

  render(_node: SceneGraphNode): SvgPrimitive[] {
    return [];
  },
};

function getInputPorts(id: string, nodes: SceneGraphNode[]): string[] {
  for (const node of nodes) {
    if (node.id !== id) continue;
    const bidirectional = node.features.find(f => f.kind === 'port' && f.role === 'bidirectional');
    if (bidirectional) return [bidirectional.path];
    const singleInput = node.features.find(f => f.kind === 'port' && f.role === 'input' && f.path === `${id}.input`);
    if (singleInput) return [singleInput.path];
    const indexed = node.features
      .filter(f => f.kind === 'port' && f.role === 'input')
      .sort((a, b) => extractIndex(a.path) - extractIndex(b.path));
    if (indexed.length > 0) return indexed.map(f => f.path);
  }
  return [];
}

function getOutputPorts(id: string, nodes: SceneGraphNode[]): string[] {
  for (const node of nodes) {
    if (node.id !== id) continue;
    const bidirectional = node.features.find(f => f.kind === 'port' && f.role === 'bidirectional');
    if (bidirectional) return [bidirectional.path];
    const singleOutput = node.features.find(f => f.kind === 'port' && f.role === 'output' && f.path === `${id}.output`);
    if (singleOutput) return [singleOutput.path];
    const indexed = node.features
      .filter(f => f.kind === 'port' && f.role === 'output')
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
