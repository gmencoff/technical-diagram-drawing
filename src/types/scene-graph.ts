export interface Point2D {
  x: number;
  y: number;
}

export interface Bounds2D {
  width: number;
  height: number;
}

export interface Anchor {
  kind: 'anchor';
  path: string;
  sourceObjectId: string;
  generatedBy: string;
  value?: Point2D;
}

export type PortRole = 'input' | 'output' | 'bidirectional';

export interface Port {
  kind: 'port';
  path: string;
  role: PortRole;
  sourceObjectId: string;
  generatedBy: string;
  value?: Point2D;
}

export interface Metric {
  kind: 'metric';
  path: string;
  sourceObjectId: string;
  generatedBy: string;
  value?: Bounds2D;
}

export type Feature = Anchor | Port | Metric;

export interface SceneGraphNode {
  id: string;
  type: string;
  // Differs from id when a composite object expands into children
  // (e.g., ULA expands elements: id="ula1.element[0]", sourceObjectId="ula1")
  sourceObjectId: string;
  generatedBy: string;
  features: Feature[];
  properties: Record<string, unknown>;
}

export interface ResolvedConnection {
  from: string;
  to: string;
}

export interface SceneGraph {
  nodes: SceneGraphNode[];
  connections: ResolvedConnection[];
}
