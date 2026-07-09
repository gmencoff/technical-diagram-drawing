import { AuthoringObject } from '../types/authoring.js';
import { SceneGraphNode, SceneGraph, ResolvedConnection, Point2D, Bounds2D } from '../types/scene-graph.js';
import { SvgPrimitive } from '../types/svg-primitives.js';
import { PropertyDefinition } from '../types/property-definition.js';

export type FlowDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export interface LayoutContext {
  flowDirection?: FlowDirection;
  position?: 'first' | 'middle' | 'last';
}

export interface CompositeLayoutResult {
  bounds: Bounds2D;
}

export interface HandlerLookup {
  lookup(typeName: string): ObjectTypeHandler | undefined;
}

export interface CompositeExpansionResult {
  nodes: SceneGraphNode[];
  connections: ResolvedConnection[];
}

export interface ObjectTypeHandler {
  typeName: string;
  properties: Record<string, PropertyDefinition>;
  expand(obj: AuthoringObject): SceneGraphNode;
  expandComposite?(obj: AuthoringObject, registry: HandlerLookup): CompositeExpansionResult;
  render(node: SceneGraphNode): SvgPrimitive[];

  layoutChildren?(node: SceneGraphNode, sceneGraph: SceneGraph, offsetX: number, offsetY: number, registry: HandlerLookup): CompositeLayoutResult;
  getLayoutBounds?(node: SceneGraphNode, context: LayoutContext): Bounds2D;
  assignPortPositions?(node: SceneGraphNode, center: Point2D, bounds: Bounds2D, context: LayoutContext): void;
  resolveCompositePortAliases?(node: SceneGraphNode, sceneGraph: SceneGraph): Record<string, Point2D>;
  getDescendantIds?(node: SceneGraphNode): string[];
}
