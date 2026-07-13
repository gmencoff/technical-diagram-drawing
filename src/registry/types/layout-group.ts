import { ObjectTypeHandler, HandlerLookup, CompositeExpansionResult, CompositeLayoutResult } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, SceneGraph, ResolvedConnection, Bounds2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition, ArrayPropertyDefinition, StringPropertyDefinition, NumberPropertyDefinition } from '../../types/property-definition.js';
import { getBounds, assignAnchorValue, shiftNodeVertically, shiftNodeHorizontally } from '../../layout-utils.js';

const DEFAULT_GAP = 100;

export const layoutGroupHandler: ObjectTypeHandler = {
  typeName: 'layout.Group',

  properties: {
    objects: new ArrayPropertyDefinition({
      required: true,
      shortDescription: 'Array of child objects in this group',
    }),
    direction: new StringPropertyDefinition({
      required: false,
      default: 'left-to-right',
      allowedValues: ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'],
      shortDescription: 'Layout direction for children',
    }),
    gap: new NumberPropertyDefinition({
      required: false,
      default: 80,
      min: 0,
      shortDescription: 'Gap between children',
    }),
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
    const allConnections: ResolvedConnection[] = [];

    for (const child of children) {
      const handler = registry.lookup(child.type);
      if (!handler) continue;

      if (handler.expandComposite) {
        const result = handler.expandComposite(child, registry);
        allNodes.push(...result.nodes);
        allConnections.push(...result.connections);
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
    return { nodes: allNodes, connections: allConnections };
  },

  layoutChildren(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number, registry: HandlerLookup): CompositeLayoutResult {
    const childIds = (node.properties.childIds as string[]) || [];
    const gap = (node.properties.gap as number) || DEFAULT_GAP;
    const direction = (node.properties.direction as string) || 'left-to-right';
    const children = childIds.map(id => sceneGraph.nodes.find(n => n.id === id)).filter(Boolean) as SceneGraphNode[];
    const vertical = direction === 'top-to-bottom' || direction === 'bottom-to-top';

    const childBoundsArr: Bounds2D[] = [];

    if (vertical) {
      let cursorY = offsetY;
      let maxWidth = 0;

      for (const child of children) {
        const childHandler = registry.lookup(child.type);
        let childBounds: Bounds2D;
        if (childHandler?.layoutChildren) {
          childBounds = childHandler.layoutChildren(child, sceneGraph, offsetX, cursorY, registry).bounds;
        } else {
          const bounds = childHandler?.getLayoutBounds?.(child, {}) ?? getBounds(child);
          const cx = offsetX + bounds.width / 2;
          const cy = cursorY + bounds.height / 2;
          assignAnchorValue(child, `${child.id}.center`, { x: cx, y: cy });
          childBounds = bounds;
        }
        childBoundsArr.push(childBounds);
        maxWidth = Math.max(maxWidth, childBounds.width);
        cursorY += childBounds.height + gap;
      }

      const compositeCenterX = offsetX + maxWidth / 2;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childBounds = childBoundsArr[i];
        const childCenterX = offsetX + childBounds.width / 2;
        const deltaX = compositeCenterX - childCenterX;
        if (deltaX !== 0) {
          shiftNodeHorizontally(child, sceneGraph, deltaX, registry);
        }
      }

      const totalWidth = maxWidth;
      const totalHeight = cursorY - gap - offsetY;

      const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
      if (boundsFeature && boundsFeature.kind === 'metric') {
        boundsFeature.value = { width: totalWidth, height: totalHeight };
      }
      assignAnchorValue(node, `${node.id}.center`, { x: offsetX + totalWidth / 2, y: offsetY + totalHeight / 2 });

      return { bounds: { width: totalWidth, height: totalHeight } };
    }

    let cursorX = offsetX;
    let maxHeight = 0;

    for (const child of children) {
      const childHandler = registry.lookup(child.type);
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
      cursorX += childBounds.width + gap;
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

    const totalWidth = cursorX - gap - offsetX;
    const totalHeight = maxHeight;

    const boundsFeature = node.features.find(f => f.kind === 'metric' && f.path === `${node.id}.bounds`);
    if (boundsFeature && boundsFeature.kind === 'metric') {
      boundsFeature.value = { width: totalWidth, height: totalHeight };
    }
    assignAnchorValue(node, `${node.id}.center`, { x: offsetX + totalWidth / 2, y: offsetY + totalHeight / 2 });

    return { bounds: { width: totalWidth, height: totalHeight } };
  },

  getDescendantIds(node: SceneGraphNode): string[] {
    return (node.properties.childIds as string[]) || [];
  },

  render(_node: SceneGraphNode): SvgPrimitive[] {
    return [];
  },
};
