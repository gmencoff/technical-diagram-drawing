import { ObjectTypeHandler, LayoutContext } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D, Bounds2D } from '../../types/scene-graph.js';
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

  assignPortPositions(node: SceneGraphNode, center: Point2D, bounds: Bounds2D, _context: LayoutContext): Record<string, Point2D> {
    const orientation = (node.properties.orientation as string) || 'down';
    const ports: Record<string, Point2D> = {};

    if (orientation === 'right') {
      ports[`${node.id}.port`] = { x: center.x + bounds.width / 2, y: center.y };
    } else if (orientation === 'left') {
      ports[`${node.id}.port`] = { x: center.x - bounds.width / 2, y: center.y };
    } else if (orientation === 'up') {
      ports[`${node.id}.port`] = { x: center.x, y: center.y - bounds.height / 2 };
    } else {
      ports[`${node.id}.port`] = { x: center.x, y: center.y + bounds.height / 2 };
    }
    return ports;
  },

  getLayoutBounds(_node: SceneGraphNode, context: LayoutContext): Bounds2D {
    if (context.flowDirection === 'left-to-right' || context.flowDirection === 'right-to-left') {
      return { width: GLYPH_HEIGHT, height: GLYPH_WIDTH };
    }
    return { width: GLYPH_WIDTH, height: GLYPH_HEIGHT };
  },

  render(node: SceneGraphNode): SvgPrimitive[] {
    const centerFeature = node.features.find(f => f.path === `${node.id}.center`);
    if (!centerFeature || centerFeature.kind !== 'anchor' || !centerFeature.value) {
      return [];
    }
    const { x, y } = centerFeature.value as Point2D;
    const orientation = (node.properties.orientation as string) || 'down';

    if (orientation === 'right') {
      return renderHorizontal(node.id, x, y, 'right');
    } else if (orientation === 'left') {
      return renderHorizontal(node.id, x, y, 'left');
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
