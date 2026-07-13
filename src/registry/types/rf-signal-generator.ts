import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { DEFAULT_STYLE } from '../../style-config.js';

const RADIUS = 15;
const DIAMETER = RADIUS * 2;

export const rfSignalGeneratorHandler: ObjectTypeHandler = {
  typeName: 'rf.SignalGenerator',

  properties: {},

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'rf.SignalGenerator',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'rf.SignalGenerator' },
        { kind: 'port', path: `${id}.output`, role: 'output', sourceObjectId: id, generatedBy: 'rf.SignalGenerator' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.SignalGenerator', value: { width: DIAMETER, height: DIAMETER } },
      ],
      properties: {},
    };
  },

  getChainGaps(): { inputGap: number; outputGap: number } {
    return { inputGap: 0, outputGap: 15 };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const centerFeature = node.features.find(f => f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) {
      return [];
    }
    const { x, y } = centerFeature.value as Point2D;

    const waveWidth = RADIUS * 1.2;
    const waveHeight = RADIUS * 0.5;
    const x0 = x - waveWidth / 2;
    const x1 = x + waveWidth / 2;
    const cp = waveWidth / 4;

    const stub = DEFAULT_STYLE.portStubLength;

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
          d: `M${x0} ${y} C${x0 + cp} ${y - waveHeight} ${x - cp} ${y - waveHeight} ${x} ${y} S${x1 - cp} ${y + waveHeight} ${x1} ${y}`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
        {
          kind: 'line',
          x1: x + RADIUS, y1: y,
          x2: x + RADIUS + stub, y2: y,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
        },
      ],
    }];
  },
};
