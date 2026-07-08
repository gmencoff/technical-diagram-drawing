import { AuthoringObject } from '../types/authoring.js';
import { SceneGraphNode, ResolvedConnection } from '../types/scene-graph.js';
import { SvgPrimitive } from '../types/svg-primitives.js';
import { PropertyDefinition } from '../types/property-definition.js';

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
}
