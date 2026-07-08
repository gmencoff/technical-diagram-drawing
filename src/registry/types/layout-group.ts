import { ObjectTypeHandler, HandlerLookup, CompositeExpansionResult } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';

export const layoutGroupHandler: ObjectTypeHandler = {
  typeName: 'layout.Group',

  properties: {
    objects: {
      type: 'array',
      required: true,
      shortDescription: 'Array of child objects in this group',
      validate(value: unknown, propertyName: string): void {
        if (!Array.isArray(value)) {
          throw new Error(`${propertyName} must be an array`);
        }
      },
    },
    direction: {
      type: 'string',
      required: false,
      default: 'left-to-right',
      shortDescription: 'Layout direction for children',
      validate(value: unknown, propertyName: string): void {
        const valid = ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'];
        if (typeof value !== 'string' || !valid.includes(value)) {
          throw new Error(`${propertyName} must be one of: ${valid.join(', ')}`);
        }
      },
    },
    gap: {
      type: 'number',
      required: false,
      default: 80,
      shortDescription: 'Gap between children',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'number' || value < 0) {
          throw new Error(`${propertyName} must be a non-negative number`);
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
      generatedBy: 'layout.Group',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'layout.Group' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'layout.Group' },
      ],
      properties: {},
    };
  },

  expandComposite(obj: AuthoringObject, registry: HandlerLookup): CompositeExpansionResult {
    const id = obj.id;
    const children = obj.objects as AuthoringObject[];
    const allNodes: SceneGraphNode[] = [];

    for (const child of children) {
      const handler = registry.lookup(child.type);
      if (!handler) continue;

      if (handler.expandComposite) {
        const result = handler.expandComposite(child, registry);
        allNodes.push(...result.nodes);
      } else {
        allNodes.push(handler.expand(child));
      }
    }

    const groupNode: SceneGraphNode = {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'layout.Group',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'layout.Group' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'layout.Group' },
      ],
      properties: {
        direction: obj.direction || 'left-to-right',
        gap: obj.gap || 80,
        childIds: children.map(c => c.id),
      },
    };

    allNodes.push(groupNode);
    return { nodes: allNodes, connections: [] };
  },

  render(_node: SceneGraphNode): SvgPrimitive[] {
    return [];
  },
};
