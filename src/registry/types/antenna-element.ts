import { ObjectTypeHandler, LayoutContext } from '../object-type-handler.js';
import { AuthoringObject } from '../../types/authoring.js';
import { SceneGraphNode, Point2D, Bounds2D } from '../../types/scene-graph.js';
import { SvgPrimitive } from '../../types/svg-primitives.js';
import { PropertyDefinition } from '../../types/property-definition.js';
import { DEFAULT_STYLE, getMastLength } from '../../style-config.js';

const TRI_HEIGHT = 24;
const TRI_HALF_WIDTH = TRI_HEIGHT * 10 / 18;

function getGlyphWidth(): number {
  return Math.ceil(TRI_HALF_WIDTH * 2);
}

function getGlyphHeight(): number {
  return TRI_HEIGHT + getMastLength();
}

export const antennaElementHandler: ObjectTypeHandler = {
  typeName: 'antenna.Element',

  properties: {
    orientation: {
      type: 'string',
      required: false,
      shortDescription: 'Direction the antenna points: up, down, left, right',
      validate(value: unknown, propertyName: string): void {
        if (typeof value !== 'string' || !['up', 'down', 'left', 'right'].includes(value)) {
          throw new Error(`${propertyName} must be one of: up, down, left, right`);
        }
      },
    },
  } satisfies Record<string, PropertyDefinition>,

  expand(obj: AuthoringObject): SceneGraphNode {
    const id = obj.id;
    return {
      id,
      type: obj.type,
      sourceObjectId: id,
      generatedBy: 'antenna.Element',
      features: [
        { kind: 'anchor', path: `${id}.center`, sourceObjectId: id, generatedBy: 'antenna.Element' },
        { kind: 'port', path: `${id}.port`, role: 'bidirectional', sourceObjectId: id, generatedBy: 'antenna.Element' },
        { kind: 'metric', path: `${id}.bounds`, sourceObjectId: id, generatedBy: 'antenna.Element', value: { width: getGlyphWidth(), height: getGlyphHeight() } },
      ],
      properties: { orientation: obj.orientation },
    };
  },

  getChainGaps(): { inputGap: number; outputGap: number } {
    return { inputGap: 0, outputGap: 0 };
  },

  assignPortPositions(node: SceneGraphNode, center: Point2D, bounds: Bounds2D, _context: LayoutContext): void {
    const orientation = (node.properties.orientation as string) || 'down';
    let value: Point2D;

    // Port is at the mast end (opposite the radiating direction)
    if (orientation === 'right') {
      value = { x: center.x - bounds.width / 2, y: center.y };
    } else if (orientation === 'left') {
      value = { x: center.x + bounds.width / 2, y: center.y };
    } else if (orientation === 'up') {
      value = { x: center.x, y: center.y + bounds.height / 2 };
    } else {
      value = { x: center.x, y: center.y - bounds.height / 2 };
    }

    const portFeature = node.features.find(f => f.kind === 'port' && f.path === `${node.id}.port`);
    if (portFeature && portFeature.kind === 'port') {
      portFeature.value = value;
    }
  },

  getLayoutBounds(_node: SceneGraphNode, context: LayoutContext): Bounds2D {
    if (context.flowDirection === 'left-to-right' || context.flowDirection === 'right-to-left') {
      return { width: getGlyphHeight(), height: getGlyphWidth() };
    }
    return { width: getGlyphWidth(), height: getGlyphHeight() };
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
    } else if (orientation === 'up') {
      return renderVertical(node.id, x, y, 'up');
    }
    return renderVertical(node.id, x, y, 'down');
  },
};

function renderVertical(id: string, x: number, y: number, direction: 'up' | 'down'): SvgPrimitive[] {
  const halfHeight = getGlyphHeight() / 2;

  if (direction === 'down') {
    // Triangle (radiating) at bottom, mast on top
    const triBottom = y + halfHeight;
    const mastStart = triBottom - TRI_HEIGHT;
    const mastEnd = y - halfHeight;

    return [{
      kind: 'group',
      id,
      children: [
        { kind: 'line', x1: x, y1: mastEnd, x2: x, y2: mastStart, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth },
        {
          kind: 'path',
          d: `M${x - TRI_HALF_WIDTH} ${triBottom} L${x + TRI_HALF_WIDTH} ${triBottom} L${x} ${mastStart} Z`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
      ],
    }];
  }

  // Triangle (radiating) at top, mast on bottom
  const triTop = y - halfHeight;
  const mastStart = triTop + TRI_HEIGHT;
  const mastEnd = y + halfHeight;

  return [{
    kind: 'group',
    id,
    children: [
      { kind: 'line', x1: x, y1: mastStart, x2: x, y2: mastEnd, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth },
      {
        kind: 'path',
        d: `M${x - TRI_HALF_WIDTH} ${triTop} L${x + TRI_HALF_WIDTH} ${triTop} L${x} ${mastStart} Z`,
        stroke: DEFAULT_STYLE.stroke,
        strokeWidth: DEFAULT_STYLE.strokeWidth,
        fill: 'none',
      },
    ],
  }];
}

function renderHorizontal(id: string, x: number, y: number, direction: 'left' | 'right'): SvgPrimitive[] {
  const halfLength = getGlyphHeight() / 2;

  if (direction === 'right') {
    // Triangle (radiating) on right, mast on left
    const triTipX = x + halfLength;
    const mastStartX = triTipX - TRI_HEIGHT;
    const mastEndX = x - halfLength;

    return [{
      kind: 'group',
      id,
      children: [
        { kind: 'line', x1: mastEndX, y1: y, x2: mastStartX, y2: y, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth },
        {
          kind: 'path',
          d: `M${triTipX} ${y - TRI_HALF_WIDTH} L${triTipX} ${y + TRI_HALF_WIDTH} L${mastStartX} ${y} Z`,
          stroke: DEFAULT_STYLE.stroke,
          strokeWidth: DEFAULT_STYLE.strokeWidth,
          fill: 'none',
        },
      ],
    }];
  }

  // Triangle (radiating) on left, mast on right
  const triTipX = x - halfLength;
  const mastStartX = triTipX + TRI_HEIGHT;
  const mastEndX = x + halfLength;

  return [{
    kind: 'group',
    id,
    children: [
      { kind: 'line', x1: mastStartX, y1: y, x2: mastEndX, y2: y, stroke: DEFAULT_STYLE.stroke, strokeWidth: DEFAULT_STYLE.strokeWidth },
      {
        kind: 'path',
        d: `M${triTipX} ${y - TRI_HALF_WIDTH} L${triTipX} ${y + TRI_HALF_WIDTH} L${mastStartX} ${y} Z`,
        stroke: DEFAULT_STYLE.stroke,
        strokeWidth: DEFAULT_STYLE.strokeWidth,
        fill: 'none',
      },
    ],
  }];
}
