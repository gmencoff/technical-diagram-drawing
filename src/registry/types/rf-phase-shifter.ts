import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { DEFAULT_STYLE } from '../../style-config.js';

const RADIUS = 15;
const DIAMETER = RADIUS * 2;

export const rfPhaseShifterHandler: ObjectTypeHandler = {
  typeName: 'rf.PhaseShifter',

  properties: {},

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.PhaseShifter',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.PhaseShifter' },
        { kind: 'port', path: `${id}.input`, role: 'input', sourceObjectId: id, generatedBy: 'rf.PhaseShifter' },
        { kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.PhaseShifter' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.PhaseShifter', value: { width: DIAMETER, height: DIAMETER } },
      ],
      properties: {},
    };
  },

  getChainGaps(): { inputGap: number; outputGap: number } {
    const gaps = DEFAULT_STYLE.chainGaps['rf.PhaseShifter'];
    return gaps || { inputGap: 15, outputGap: 15 };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const centerFeature = node.features.find(f => f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) {
      return [];
    }
    const { x, y } = centerFeature.value as Point2D;
    const arrowExtension = RADIUS * 1.6;
    const headSize = RADIUS * 0.35;

    // Arrow direction: 45 degrees (upper-right)
    const dx = 1 / Math.SQRT2;
    const dy = -1 / Math.SQRT2;
    // Perpendicular direction
    const px = -dy;
    const py = dx;

    const tailX = x - arrowExtension * dx;
    const tailY = y - arrowExtension * dy;
    const tipX = x + arrowExtension * dx;
    const tipY = y + arrowExtension * dy;

    // Arrowhead base center (inset from tip along arrow direction)
    const baseX = tipX - headSize * dx;
    const baseY = tipY - headSize * dy;
    const halfBase = headSize * 0.5;

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
      ],
    }];
  },
};
