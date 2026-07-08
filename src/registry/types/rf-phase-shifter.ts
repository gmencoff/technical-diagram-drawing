import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';

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
        { kind: 'anchor', path: `${id}.input`, sourceObjectId: id, generatedBy: 'rf.PhaseShifter' },
        { kind: 'anchor', path: `${id}.output`, sourceObjectId: id, generatedBy: 'rf.PhaseShifter' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'rf.PhaseShifter', value: { width: DIAMETER, height: DIAMETER } },
      ],
      properties: {},
    };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const centerFeature = node.features.find(f => f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) {
      return [];
    }
    const { x, y } = centerFeature.value as Point2D;
    const arrowLen = RADIUS * 0.7;

    return [{
      kind: 'group',
      id: node.id,
      children: [
        {
          kind: 'circle',
          cx: x,
          cy: y,
          r: RADIUS,
          stroke: '#333',
          fill: 'none',
        },
        {
          kind: 'path',
          d: `M${x - arrowLen} ${y + arrowLen} L${x + arrowLen} ${y - arrowLen} M${x + arrowLen * 0.4} ${y - arrowLen} L${x + arrowLen} ${y - arrowLen} L${x + arrowLen} ${y - arrowLen * 0.4}`,
          stroke: '#333',
          fill: 'none',
        },
      ],
    }];
  },
};
