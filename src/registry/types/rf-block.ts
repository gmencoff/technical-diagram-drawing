import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition, StringPropertyDefinition, IntegerPropertyDefinition } from '../../types/property-definition.js';
import { DEFAULT_STYLE } from '../../style-config.js';

const DEFAULT_WIDTH = 80;
const VERTICAL_TEXT_WIDTH = 40;
const DEFAULT_HEIGHT = 40;
const PORT_SPACING = 30;

export const rfBlockHandler: ObjectTypeHandler = {
  typeName: 'rf.Block',

  properties: {
    label: new StringPropertyDefinition({
      required: true,
      shortDescription: 'Text label displayed in the block',
    }),
    inputPorts: new IntegerPropertyDefinition({
      required: false,
      default: 1,
      min: 0,
      shortDescription: 'Number of input ports on the left edge',
    }),
    outputPorts: new IntegerPropertyDefinition({
      required: false,
      default: 1,
      min: 0,
      shortDescription: 'Number of output ports on the right edge',
    }),
    textOrientation: new StringPropertyDefinition({
      required: false,
      default: 'horizontal',
      allowedValues: ['horizontal', 'vertical'],
      shortDescription: 'Text orientation: horizontal or vertical',
    }),
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    const inputPorts = obj.inputPorts != null ? (obj.inputPorts as number) : 1;
    const outputPorts = obj.outputPorts != null ? (obj.outputPorts as number) : 1;
    const textOrientation = (obj.textOrientation as string) || 'horizontal';
    const maxPorts = Math.max(inputPorts, outputPorts);
    const height = Math.max(DEFAULT_HEIGHT, maxPorts * PORT_SPACING + 10);
    const width = textOrientation === 'vertical' ? VERTICAL_TEXT_WIDTH : DEFAULT_WIDTH;

    const features: SceneGraphNode['features'] = [
      { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.Block' },
      { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.Block', value: { width, height } },
    ];

    if (inputPorts === 1) {
      features.push({ kind: 'port', path: `${id}.input`, role: 'input', sourceObjectId: id, generatedBy: 'rf.Block' });
    } else {
      for (let i = 0; i < inputPorts; i++) {
        features.push({ kind: 'port', path: `${id}.input[${i}]`, role: 'input', sourceObjectId: id, generatedBy: 'rf.Block' });
      }
    }

    if (outputPorts === 1) {
      features.push({ kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.Block' });
    } else {
      for (let i = 0; i < outputPorts; i++) {
        features.push({ kind: 'port', path: `${id}.output[${i}]`, role: 'output', sourceObjectId: id, generatedBy: 'rf.Block' });
      }
    }

    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.Block',
      features,
      properties: { label: obj.label, inputPorts, outputPorts, textOrientation: obj.textOrientation || 'horizontal' },
    };
  },

  getChainGaps(): { inputGap: number; outputGap: number } {
    return { inputGap: 15, outputGap: 15 };
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
    const textOrientation = (node.properties.textOrientation as string) || 'horizontal';

    const stub = DEFAULT_STYLE.portStubLength;
    const inputPorts = node.properties.inputPorts != null ? (node.properties.inputPorts as number) : 1;
    const outputPorts = node.properties.outputPorts != null ? (node.properties.outputPorts as number) : 1;

    const stubs: SvgPrimitive[] = [];
    const leftX = x - width / 2;
    const rightX = x + width / 2;

    if (inputPorts === 1) {
      stubs.push({ kind: 'line', x1: leftX - stub, y1: y, x2: leftX, y2: y, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth });
    } else {
      const spacing = height / (inputPorts + 1);
      for (let i = 0; i < inputPorts; i++) {
        const py = y - height / 2 + spacing * (i + 1);
        stubs.push({ kind: 'line', x1: leftX - stub, y1: py, x2: leftX, y2: py, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth });
      }
    }

    if (outputPorts === 1) {
      stubs.push({ kind: 'line', x1: rightX, y1: y, x2: rightX + stub, y2: y, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth });
    } else {
      const spacing = height / (outputPorts + 1);
      for (let i = 0; i < outputPorts; i++) {
        const py = y - height / 2 + spacing * (i + 1);
        stubs.push({ kind: 'line', x1: rightX, y1: py, x2: rightX + stub, y2: py, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth });
      }
    }

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'path',
          d: `M${leftX} ${y - height / 2} h${width} v${height} h${-width} Z`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
        {
          kind: 'text',
          x,
          y: y + 4,
          content: label,
          fontSize: DEFAULT_STYLE.text.fontSize,
          fontFamily: DEFAULT_STYLE.text.fontFamily,
          fontWeight: DEFAULT_STYLE.text.fontWeight,
          fill: DEFAULT_STYLE.text.fill,
          textAnchor: 'middle',
          transform: textOrientation === 'vertical' ? `rotate(-90, ${x}, ${y})` : undefined,
        },
        ...stubs,
      ],
    }];
  },
};
