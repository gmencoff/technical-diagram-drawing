import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { DEFAULT_STYLE, getMastLength } from '../../style-config.js';

// Dual-polarized antenna element for left-to-right (receive) flow.
// The radiating triangle faces left; the mast forks into an H output
// (upper, output[0]) and a V output (lower, output[1]) on the right.

const TRI_HEIGHT = 24;
const TRI_HALF_WIDTH = TRI_HEIGHT * 10 / 18;
const FORK_LENGTH = 15;
const WIDTH = TRI_HEIGHT + getMastLength();
const HEIGHT = 60;
const LABEL_FONT_SIZE = 10;

export const antennaDualPolElementHandler: ObjectTypeHandler = {
  typeName: 'antenna.DualPolElement',

  properties: {},

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'antenna.DualPolElement',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'antenna.DualPolElement' },
        { kind: 'port', path: `${id}.output[0]`, role: 'output', sourceObjectId: id, generatedBy: 'antenna.DualPolElement' },
        { kind: 'port', path: `${id}.output[1]`, role: 'output', sourceObjectId: id, generatedBy: 'antenna.DualPolElement' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'antenna.DualPolElement', value: { width: WIDTH, height: HEIGHT } },
      ],
      properties: {},
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
    const stroke = DEFAULT_STYLE.stroke;
    const strokeWidth = DEFAULT_STYLE.strokeWidth;
    const stub = DEFAULT_STYLE.portStubLength;

    const leftX = x - WIDTH / 2;
    const rightX = x + WIDTH / 2;
    const apexX = leftX + TRI_HEIGHT;
    const forkX = rightX - FORK_LENGTH;

    // Port y positions match the layout stage's even spacing along the bounds
    const hY = y - HEIGHT / 2 + HEIGHT / 3;
    const vY = y - HEIGHT / 2 + (2 * HEIGHT) / 3;

    const labelX = rightX - FORK_LENGTH / 2;

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'path',
          d: `M${leftX} ${y - TRI_HALF_WIDTH} L${leftX} ${y + TRI_HALF_WIDTH} L${apexX} ${y} Z`,
          stroke,
          strokeWidth,
          fill: 'none',
        },
        { kind: 'line', x1: apexX, y1: y, x2: forkX, y2: y, stroke, strokeWidth },
        {
          kind: 'path',
          d: `M${forkX} ${y} L${rightX} ${hY} L${rightX + stub} ${hY}`,
          stroke,
          strokeWidth,
          fill: 'none',
        },
        {
          kind: 'path',
          d: `M${forkX} ${y} L${rightX} ${vY} L${rightX + stub} ${vY}`,
          stroke,
          strokeWidth,
          fill: 'none',
        },
        {
          kind: 'text',
          x: labelX,
          y: hY - 4,
          content: 'H',
          fontSize: LABEL_FONT_SIZE,
          fontFamily: DEFAULT_STYLE.text.fontFamily,
          fontWeight: DEFAULT_STYLE.text.fontWeight,
          fill: DEFAULT_STYLE.text.fill,
          textAnchor: 'middle',
        },
        {
          kind: 'text',
          x: labelX,
          y: vY + LABEL_FONT_SIZE + 2,
          content: 'V',
          fontSize: LABEL_FONT_SIZE,
          fontFamily: DEFAULT_STYLE.text.fontFamily,
          fontWeight: DEFAULT_STYLE.text.fontWeight,
          fill: DEFAULT_STYLE.text.fill,
          textAnchor: 'middle',
        },
      ],
    }];
  },
};
