import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';

export const annotationCircleHandler: ObjectTypeHandler = {
  typeName: 'annotation.Circle',

  properties: {
    center: {
      required: true,
      shortDescription: 'Center point of the circle (reference to an anchor)',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'string') {
          throw new Error(`${propertyName} must be a reference string`);
        }
      },
    },
    radius: {
      required: true,
      shortDescription: 'Radius of the circle (expression or number)',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'string' && typeof value !== 'number') {
          throw new Error(`${propertyName} must be a string expression or number`);
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
      generatedBy: 'annotation.Circle',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'annotation.Circle' },
      ],
      properties: {
        center: obj.center,
        radius: obj.radius,
      },
    };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const center = node.properties.center as Point2D | undefined;
    const radius = node.properties.radius as number | undefined;

    if (!center || radius === undefined) {
      return [];
    }

    return [
      {
        kind: 'circle',
        cx: center.x,
        cy: center.y,
        r: radius,
        stroke: '#666',
        strokeDasharray: '8 4',
        fill: 'none',
      },
    ];
  },
};
