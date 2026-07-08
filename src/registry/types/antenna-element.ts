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
        { kind: 'anchor', path: `${id}.port`, sourceObjectId: id, generatedBy: 'antenna.Element' },
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
    const flowDirection = node.properties.flowDirection as string | undefined;
    const chainPosition = node.properties.chainPosition as string | undefined;

    if (flowDirection === 'left-to-right') {
      const mastDirection = chainPosition === 'last' ? 'left' : 'right';
      return renderHorizontal(node.id, x, y, mastDirection);
    } else if (flowDirection === 'right-to-left') {
      const mastDirection = chainPosition === 'last' ? 'right' : 'left';
      return renderHorizontal(node.id, x, y, mastDirection);
    }
    return renderVertical(node.id, x, y);
  },
};

function renderVertical(id: string, x: number, y: number): SvgPrimitive[] {
  const mastTop = y - GLYPH_HEIGHT / 2;
  const mastBottom = y + GLYPH_HEIGHT / 2;
  const triHeight = 24;
  const triHalfWidth = triHeight * 10 / 18;

  return [{
    kind: 'group',
    id,
    children: [
      { kind: 'line', x1: x, y1: mastTop + triHeight, x2: x, y2: mastBottom, stroke: '#333' },
      {
        kind: 'path',
        d: `M${x - triHalfWidth} ${mastTop} L${x + triHalfWidth} ${mastTop} L${x} ${mastTop + triHeight} Z`,
        stroke: '#333',
        fill: 'none',
      },
    ],
  }];
}

function renderHorizontal(id: string, x: number, y: number, direction: 'left' | 'right'): SvgPrimitive[] {
  const triHeight = 24;
  const triHalfWidth = triHeight * 10 / 18;
  const halfLength = GLYPH_HEIGHT / 2;

  if (direction === 'right') {
    const triTipX = x - halfLength;
    const mastStartX = triTipX + triHeight;
    const mastEndX = x + halfLength;

    return [{
      kind: 'group',
      id,
      children: [
        { kind: 'line', x1: mastStartX, y1: y, x2: mastEndX, y2: y, stroke: '#333' },
        {
          kind: 'path',
          d: `M${triTipX} ${y - triHalfWidth} L${triTipX} ${y + triHalfWidth} L${mastStartX} ${y} Z`,
          stroke: '#333',
          fill: 'none',
        },
      ],
    }];
  }

  const triTipX = x + halfLength;
  const mastStartX = triTipX - triHeight;
  const mastEndX = x - halfLength;

  return [{
    kind: 'group',
    id,
    children: [
      { kind: 'line', x1: mastEndX, y1: y, x2: mastStartX, y2: y, stroke: '#333' },
      {
        kind: 'path',
        d: `M${triTipX} ${y - triHalfWidth} L${triTipX} ${y + triHalfWidth} L${mastStartX} ${y} Z`,
        stroke: '#333',
        fill: 'none',
      },
    ],
  }];
}
