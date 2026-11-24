import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { DEFAULT_STYLE } from '../../style-config.js';

// Low-noise amplifier: standard amplifier triangle pointing in the
// direction of flow (left-to-right).

const HALF_SIZE = 15;
const SIZE = HALF_SIZE * 2;

export const rfLnaHandler: ObjectTypeHandler = {
  typeName: 'rf.LNA',

  properties: {},

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.LNA',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.LNA' },
        { kind: 'port', path: `${id}.input`, role: 'input', sourceObjectId: id, generatedBy: 'rf.LNA' },
        { kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.LNA' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.LNA', value: { width: SIZE, height: SIZE } },
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
    const stub = DEFAULT_STYLE.portStubLength;

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'path',
          d: `M${x - HALF_SIZE} ${y - HALF_SIZE} L${x - HALF_SIZE} ${y + HALF_SIZE} L${x + HALF_SIZE} ${y} Z`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
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
