import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition, IntegerPropertyDefinition } from '../../types/property-definition.js';
import { DEFAULT_STYLE } from '../../style-config.js';

const RADIUS = 15;
const DIAMETER = RADIUS * 2;
const SIGMA_FONT_SIZE = 16;

export const rfCombinerHandler: ObjectTypeHandler = {
  typeName: 'rf.Combiner',

  properties: {
    inputPorts: new IntegerPropertyDefinition({
      required: false,
      default: 2,
      min: 2,
      shortDescription: 'Number of input ports',
    }),
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    const inputPorts = obj.inputPorts != null ? (obj.inputPorts as number) : 2;

    const features: SceneGraphNode['features'] = [
      { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.Combiner' },
      { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.Combiner', value: { width: DIAMETER, height: DIAMETER } },
    ];
    for (let i = 0; i < inputPorts; i++) {
      features.push({ kind: 'port', path: `${id}.input[${i}]`, role: 'input', sourceObjectId: id, generatedBy: 'rf.Combiner' });
    }
    features.push({ kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.Combiner' });

    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.Combiner',
      features,
      properties: { inputPorts },
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
    const stub = DEFAULT_STYLE.portStubLength;
    const inputPorts = (node.properties.inputPorts as number) ?? 2;

    // Input stubs run from the port (left of the bounds) to the circle edge.
    // Port y positions match the layout stage's even spacing along the bounds.
    const stubs: SvgPrimitive[] = [];
    const spacing = DIAMETER / (inputPorts + 1);
    for (let i = 0; i < inputPorts; i++) {
      const py = y - RADIUS + spacing * (i + 1);
      const dy = py - y;
      const edgeX = x - Math.sqrt(RADIUS * RADIUS - dy * dy);
      stubs.push({
        kind: 'line',
        x1: x - RADIUS - stub, y1: py,
        x2: edgeX, y2: py,
        stroke: DEFAULT_STYLE.stroke,
        strokeWidth: DEFAULT_STYLE.strokeWidth,
      });
    }
    stubs.push({
      kind: 'line',
      x1: x + RADIUS, y1: y,
      x2: x + RADIUS + stub, y2: y,
      stroke: DEFAULT_STYLE.stroke,
      strokeWidth: DEFAULT_STYLE.strokeWidth,
    });

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'circle',
          cx: x,
          cy: y,
          r: RADIUS,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
        {
          kind: 'text',
          x,
          y: y + SIGMA_FONT_SIZE * 0.35,
          content: 'Σ',
          fontSize: SIGMA_FONT_SIZE,
          fontFamily: DEFAULT_STYLE.text.fontFamily,
          fontWeight: DEFAULT_STYLE.text.fontWeight,
          fill: DEFAULT_STYLE.text.fill,
          textAnchor: 'middle',
        },
        ...stubs,
      ],
    }];
  },
};
