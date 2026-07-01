import { AuthoringObject } from '../types/authoring.js';
import { SceneGraphNode } from '../types/scene-graph.js';
import { SvgPrimitive } from '../types/svg-primitives.js';
import { PropertyDefinition } from '../types/property-definition.js';

export interface ObjectTypeHandler {
  typeName: string;
  properties: Record<string, PropertyDefinition>;
  expand(obj: AuthoringObject): SceneGraphNode;
  render(node: SceneGraphNode): SvgPrimitive[];
}
