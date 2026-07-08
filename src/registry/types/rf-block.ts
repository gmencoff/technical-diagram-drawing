import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 40;
const PORT_SPACING = 30;

export const rfBlockHandler: ObjectTypeHandler = {
  typeName: 'rf.Block',

  properties: {
    label: {
      type: 'string',
      required: true,
      shortDescription: 'Text label displayed in the block',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'string') {
          throw new Error(`${propertyName} must be a string`);
        }
      },
    },
    inputPorts: {
      type: 'number',
      required: false,
      default: 1,
      shortDescription: 'Number of input ports on the left edge',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'number' || value < 1 || !Number.isInteger(value)) {
          throw new Error(`${propertyName} must be a positive integer`);
        }
      },
    },
    outputPorts: {
      type: 'number',
      required: false,
      default: 1,
      shortDescription: 'Number of output ports on the right edge',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'number' || value < 1 || !Number.isInteger(value)) {
          throw new Error(`${propertyName} must be a positive integer`);
        }
      },
    },
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    const inputPorts = (obj.inputPorts as number) || 1;
    const outputPorts = (obj.outputPorts as number) || 1;
    const maxPorts = Math.max(inputPorts, outputPorts);
    const height = Math.max(DEFAULT_HEIGHT, maxPorts * PORT_SPACING + 10);
    const width = DEFAULT_WIDTH;

    const features: SceneGraphNode['features'] = [
      { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.Block' },
      { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.Block', value: { width, height } },
    ];

    if (inputPorts === 1) {
      features.push({ kind: 'anchor', path: `${id}.input`, sourceObjectId: id, generatedBy: 'rf.Block' });
    } else {
      for (let i = 0; i < inputPorts; i++) {
        features.push({ kind: 'anchor', path: `${id}.input[${i}]`, sourceObjectId: id, generatedBy: 'rf.Block' });
      }
    }

    if (outputPorts === 1) {
      features.push({ kind: 'anchor', path: `${id}.output`, sourceObjectId: id, generatedBy: 'rf.Block' });
    } else {
      for (let i = 0; i < outputPorts; i++) {
        features.push({ kind: 'anchor', path: `${id}.output[${i}]`, sourceObjectId: id, generatedBy: 'rf.Block' });
      }
    }

    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.Block',
      features,
      properties: { label: obj.label, inputPorts, outputPorts },
    };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const centerFeature = node.features.find(f => f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) {
      return [];
    }
    const { x, y } = centerFeature.value as Point2D;
    const boundsFeature = node.features.find(f => f.path === `${node.id}.bounds`);
    const width = boundsFeature?.kind === 'metric' && boundsFeature.value ? boundsFeature.value.width : DEFAULT_WIDTH;
    const height = boundsFeature?.kind === 'metric' && boundsFeature.value ? boundsFeature.value.height : DEFAULT_HEIGHT;
    const label = node.properties.label as string;

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'path',
          d: `M${x - width / 2} ${y - height / 2} h${width} v${height} h${-width} Z`,
          stroke: '#333',
          fill: 'none',
        },
        {
          kind: 'text',
          x,
          y: y + 4,
          content: label,
          fontSize: 12,
          textAnchor: 'middle',
        },
      ],
    }];
  },
};
