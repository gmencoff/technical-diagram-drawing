export interface SvgCircle {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
  stroke?: string;
  strokeWidth?: number;
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
  strokeWidth?: number;
}

export interface SvgPath {
  kind: 'path';
  d: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

export interface SvgText {
  kind: 'text';
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  transform?: string;
}

export interface SvgRect {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fill?: string;
}

export interface SvgGroup {
  kind: 'group';
  children: SvgPrimitive[];
  transform?: string;
  id?: string;
}

export type SvgPrimitive = SvgCircle | SvgLine | SvgPath | SvgText | SvgRect | SvgGroup;
