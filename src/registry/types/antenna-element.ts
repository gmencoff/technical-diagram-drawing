import { ObjectTypeHandler } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';

const GLYPH_WIDTH = 30;
const GLYPH_HEIGHT = 60;

export const antennaElementHandler: ObjectTypeHandler = {
  typeName: 'antenna.Element',

  properties: {},

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'antenna.Element',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'antenna.Element' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'antenna.Element', value: { width: GLYPH_WIDTH, height: GLYPH_HEIGHT } },
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

    const mastTop = y - GLYPH_HEIGHT / 2;
    const mastBottom = y + GLYPH_HEIGHT / 2;
    const vSize = 12;

    return [{
      kind: 'group',
      id: node.id,
      children: [
        { kind: 'line', x1: x, y1: mastTop, x2: x, y2: mastBottom, stroke: '#333' },
        { kind: 'line', x1: x - vSize, y1: mastTop + vSize, x2: x, y2: mastTop, stroke: '#333' },
        { kind: 'line', x1: x + vSize, y1: mastTop + vSize, x2: x, y2: mastTop, stroke: '#333' },
      ],
    }];
  },
};
