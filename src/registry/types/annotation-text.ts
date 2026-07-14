import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition, ExpressionPropertyDefinition, StringPropertyDefinition, NumberPropertyDefinition } from '../../types/property-definition.js';

export const annotationTextHandler: ObjectTypeHandler = {
  typeName: 'annotation.Text',

  properties: {
    anchor: new ExpressionPropertyDefinition({
      required: true,
      shortDescription: 'Position anchor point (Point2D expression)',
    }),
    content: new StringPropertyDefinition({
      required: true,
      shortDescription: 'Text content to display',
    }),
    offsetY: new NumberPropertyDefinition({
      required: false,
      default: -8,
      shortDescription: 'Vertical offset from anchor (negative=above)',
    }),
    fontSize: new NumberPropertyDefinition({
      required: false,
      shortDescription: 'Font size override',
    }),
    fill: new StringPropertyDefinition({
      required: false,
      shortDescription: 'Text fill color',
    }),
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'annotation.Text',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'annotation.Text' },
      ],
      properties: {
        anchor: obj.anchor,
        content: obj.content,
        offsetY: obj.offsetY ?? -8,
        fontSize: obj.fontSize,
        fill: obj.fill,
      },
    };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const anchor = node.properties.anchor as Point2D | undefined;
    const content = node.properties.content as string;
    const offsetY = (node.properties.offsetY as number) ?? -8;

    if (!anchor || !content) return [];

    return [{
      kind: 'text',
      x: anchor.x,
      y: anchor.y + offsetY,
      content,
      fontSize: node.properties.fontSize as number | undefined,
      fill: (node.properties.fill as string) ?? '#333',
      textAnchor: 'middle',
    }];
  },
};
