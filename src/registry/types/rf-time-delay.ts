import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { DEFAULT_STYLE } from '../../style-config.js';

const HALF_SIZE = 11;
const ARROW_EXTENSION = 24;
const ARROW_HEAD_SIZE = 5.25;
const SIZE = HALF_SIZE * 2;
const TAU_FONT_SIZE = 14;

export const rfTimeDelayHandler: ObjectTypeHandler = {
  typeName: 'rf.TimeDelay',

  properties: {},

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.TimeDelay',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.TimeDelay' },
        { kind: 'port', path: `${id}.input`, role: 'input', sourceObjectId: id, generatedBy: 'rf.TimeDelay' },
        { kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.TimeDelay' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.TimeDelay', value: { width: SIZE, height: SIZE } },
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

    // Variable arrow: 45 degrees (upper-right), matching rf.PhaseShifter
    const arrowExtension = ARROW_EXTENSION;
    const headSize = ARROW_HEAD_SIZE;
    const dx = 1 / Math.SQRT2;
    const dy = -1 / Math.SQRT2;
    const px = -dy;
    const py = dx;

    const tailX = x - arrowExtension * dx;
    const tailY = y - arrowExtension * dy;
    const tipX = x + arrowExtension * dx;
    const tipY = y + arrowExtension * dy;
    const baseX = tipX - headSize * dx;
    const baseY = tipY - headSize * dy;
    const halfBase = headSize * 0.5;

    const stub = DEFAULT_STYLE.portStubLength;

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'rect',
          x: x - HALF_SIZE,
          y: y - HALF_SIZE,
          width: SIZE,
          height: SIZE,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
        {
          // Offset to the upper-left so the variable arrow does not cross it
          kind: 'text',
          x: x - 4,
          y: y,
          content: 'τ',
          fontSize: TAU_FONT_SIZE,
          fontFamily: DEFAULT_STYLE.text.fontFamily,
          fontWeight: DEFAULT_STYLE.text.fontWeight,
          fill: DEFAULT_STYLE.text.fill,
          textAnchor: 'middle',
        },
        {
          kind: 'path',
          d: `M${tailX} ${tailY} L${tipX} ${tipY}`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
        {
          kind: 'path',
          d: `M${tipX} ${tipY} L${baseX + halfBase * px} ${baseY + halfBase * py} L${baseX - halfBase * px} ${baseY - halfBase * py} Z`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: DEFAULT_STYLE.stroke,
        },
        {
          kind: 'line',
          x1: x - HALF_SIZE - stub, y1: y,
          x2: x - HALF_SIZE, y2: y,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
        },
        {
          kind: 'line',
          x1: x + HALF_SIZE, y1: y,
          x2: x + HALF_SIZE + stub, y2: y,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
        },
      ],
    }];
  },
};
