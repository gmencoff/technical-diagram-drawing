import { AuthoringDocument } from '../types/authoring.js';
import { SceneGraph } from '../types/scene-graph.js';
import { ObjectTypeHandler } from '../registry/object-type-handler.js';

export function semanticExpansion(doc: AuthoringDocument, handlers: Map<string, ObjectTypeHandler>): SceneGraph {
  const nodes = doc.objects.map(obj => {
    const handler = handlers.get(obj.id)!;
    return handler.expand(obj);
  });

  return { nodes };
}
