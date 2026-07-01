export interface SvgCircle {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
  stroke?: string;
  strokeDasharray?: string;
  fill?: string;
}

export interface SvgLine {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
}

export interface SvgPath {
  kind: 'path';
  d: string;
  stroke?: string;
  fill?: string;
}

export interface SvgText {
  kind: 'text';
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  textAnchor?: 'start' | 'middle' | 'end';
}

export interface SvgGroup {
  kind: 'group';
  children: SvgPrimitive[];
  transform?: string;
  id?: string;
}

export type SvgPrimitive = SvgCircle | SvgLine | SvgPath | SvgText | SvgGroup;
