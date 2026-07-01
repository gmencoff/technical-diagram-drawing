export type SymbolEntry =
  | ObjectEntry
  | AnchorEntry
  | MetricEntry;

export interface ObjectEntry {
  kind: 'object';
  path: string;
  sourceObjectId: string;
}

export interface AnchorEntry {
  kind: 'anchor';
  path: string;
  sourceObjectId: string;
}

export interface MetricEntry {
  kind: 'metric';
  path: string;
  sourceObjectId: string;
}

export interface SymbolTable {
  entries: Map<string, SymbolEntry>;
}
