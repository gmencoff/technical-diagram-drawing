import { AuthoringDocument, AuthoringObject } from '../types/authoring.js';
import { SceneGraph, SceneGraphNode, ResolvedConnection } from '../types/scene-graph.js';
import { ObjectTypeHandler, HandlerLookup } from '../registry/object-type-handler.js';

export interface ExpansionResult {
  nodes: SceneGraphNode[];
  connections: ResolvedConnection[];
}

export function semanticExpansion(doc: AuthoringDocument, handlers: Map<string, ObjectTypeHandler>, registry: HandlerLookup): SceneGraph {
  const result = expandObjects(doc.objects, handlers, registry);
  return { nodes: result.nodes, connections: result.connections };
}

function expandObjects(objects: AuthoringObject[], handlers: Map<string, ObjectTypeHandler>, registry: HandlerLookup): ExpansionResult {
  const allNodes: SceneGraphNode[] = [];
  const allConnections: ResolvedConnection[] = [];

  for (const obj of objects) {
    const handler = handlers.get(obj.id)!;
    const result = expandObject(obj, handler, registry);
    allNodes.push(...result.nodes);
    allConnections.push(...result.connections);
  }

  return { nodes: allNodes, connections: allConnections };
}

function expandObject(obj: AuthoringObject, handler: ObjectTypeHandler, registry: HandlerLookup): ExpansionResult {
  if (handler.expandComposite) {
    return handler.expandComposite(obj, registry);
  }
  return { nodes: [handler.expand(obj)], connections: [] };
}
