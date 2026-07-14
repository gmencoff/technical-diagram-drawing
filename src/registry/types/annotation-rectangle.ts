import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition, ExpressionPropertyDefinition, NumberPropertyDefinition, StringPropertyDefinition } from '../../types/property-definition.js';

export const annotationRectangleHandler: ObjectTypeHandler = {
  typeName: 'annotation.Rectangle',

  properties: {
    topLeft: new ExpressionPropertyDefinition({
      required: true,
      shortDescription: 'Top-left anchor reference (Point2D expression)',
    }),
    bottomRight: new ExpressionPropertyDefinition({
      required: true,
      shortDescription: 'Bottom-right anchor reference (Point2D expression)',
    }),
    padding: new NumberPropertyDefinition({
      required: false,
      default: 10,
      min: 0,
      shortDescription: 'Padding around the referenced region',
    }),
    paddingTop: new NumberPropertyDefinition({
      required: false,
      min: 0,
      shortDescription: 'Override padding on the top side',
    }),
    paddingRight: new NumberPropertyDefinition({
      required: false,
      min: 0,
      shortDescription: 'Override padding on the right side',
    }),
    paddingBottom: new NumberPropertyDefinition({
      required: false,
      min: 0,
      shortDescription: 'Override padding on the bottom side',
    }),
    paddingLeft: new NumberPropertyDefinition({
      required: false,
      min: 0,
      shortDescription: 'Override padding on the left side',
    }),
    stroke: new StringPropertyDefinition({
      required: false,
      shortDescription: 'Stroke color',
    }),
    strokeDasharray: new StringPropertyDefinition({
      required: false,
      shortDescription: 'SVG stroke-dasharray pattern',
    }),
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'annotation.Rectangle',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.topLeft`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.topRight`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.bottomLeft`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.bottomRight`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.top`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.bottom`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.left`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'anchor', path: `${id}.right`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'annotation.Rectangle' },
      ],
      properties: {
        topLeft: obj.topLeft,
        bottomRight: obj.bottomRight,
        padding: obj.padding ?? 10,
        paddingTop: obj.paddingTop,
        paddingRight: obj.paddingRight,
        paddingBottom: obj.paddingBottom,
        paddingLeft: obj.paddingLeft,
        stroke: obj.stroke ?? '#666',
        strokeDasharray: obj.strokeDasharray,
      },
    };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const topLeft = node.properties.topLeft as Point2D | undefined;
    const bottomRight = node.properties.bottomRight as Point2D | undefined;
    const padding = (node.properties.padding as number) ?? 10;
    const padTop = (node.properties.paddingTop as number | undefined) ?? padding;
    const padRight = (node.properties.paddingRight as number | undefined) ?? padding;
    const padBottom = (node.properties.paddingBottom as number | undefined) ?? padding;
    const padLeft = (node.properties.paddingLeft as number | undefined) ?? padding;

    if (!topLeft || !bottomRight) return [];

    const x = topLeft.x - padLeft;
    const y = topLeft.y - padTop;
    const width = (bottomRight.x - topLeft.x) + padLeft + padRight;
    const height = (bottomRight.y - topLeft.y) + padTop + padBottom;

    return [{
      kind: 'rect',
      x,
      y,
      width,
      height,
      stroke: (node.properties.stroke as string) ?? '#666',
      strokeDasharray: node.properties.strokeDasharray as string | undefined,
      fill: 'none',
    }];
  },
};
