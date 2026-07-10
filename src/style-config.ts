export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fill: string;
}

export interface DiagramStyle {
  stroke: string;
  strokeWidth: number;
  fill: string;
  text: TextStyle;
  connectionStrokeWidth: number;
  portIndicatorRadius: number;
  portIndicatorFill: string;
  gapUnit: number;
  portStubLength: number;
}

export const DEFAULT_STYLE: DiagramStyle = {
  stroke: '#333',
  strokeWidth: 1.5,
  fill: 'none',
  text: {
    fontSize: 12,
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    fill: '#333',
  },
  connectionStrokeWidth: 1.5,
  portIndicatorRadius: 2.5,
  portIndicatorFill: '#333',
  gapUnit: 15,
  portStubLength: 5,
};

export function getMastLength(): number {
  return DEFAULT_STYLE.gapUnit * 2;
}
