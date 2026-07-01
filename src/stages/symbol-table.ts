import { SceneGraph } from '../types/scene-graph.js';
import { SymbolTable, SymbolEntry } from '../types/symbol-table.js';

export function buildSymbolTable(sceneGraph: SceneGraph): SymbolTable {
  const entries = new Map<string, SymbolEntry>();

  for (const node of sceneGraph.nodes) {
    entries.set(node.id, {
      kind: 'object',
      path: node.id,
      sourceObjectId: node.sourceObjectId,
    });

    for (const feature of node.features) {
      if (feature.kind === 'anchor') {
        entries.set(feature.path, {
          kind: 'anchor',
          path: feature.path,
          sourceObjectId: feature.sourceObjectId,
        });
      } else {
        entries.set(feature.path, {
          kind: 'metric',
          path: feature.path,
          sourceObjectId: feature.sourceObjectId,
        });
      }
    }
  }

  return { entries };
}
