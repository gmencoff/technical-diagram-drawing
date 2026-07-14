import { SvgPrimitive } from '../types/svg-primitives.js';

export interface SvgDocument {
  viewBox: { x: number; y: number; width: number; height: number };
  primitives: SvgPrimitive[];
}

export function svgSerialization(doc: SvgDocument): string {
  const { x, y, width, height } = doc.viewBox;
  const children = doc.primitives.map(p => renderPrimitive(p, 1)).join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}">`,
    children,
    `</svg>`,
  ].join('\n');
}

function renderPrimitive(primitive: SvgPrimitive, depth: number): string {
  const indent = '  '.repeat(depth);

  switch (primitive.kind) {
    case 'circle':
      return `${indent}<circle cx="${primitive.cx}" cy="${primitive.cy}" r="${primitive.r}"${optAttr('stroke', primitive.stroke)}${optAttr('stroke-width', primitive.strokeWidth?.toString())}${optAttr('stroke-dasharray', primitive.strokeDasharray)}${optAttr('fill', primitive.fill)} />`;

    case 'line':
      return `${indent}<line x1="${primitive.x1}" y1="${primitive.y1}" x2="${primitive.x2}" y2="${primitive.y2}"${optAttr('stroke', primitive.stroke)}${optAttr('stroke-width', primitive.strokeWidth?.toString())} />`;

    case 'path':
      return `${indent}<path d="${primitive.d}"${optAttr('stroke', primitive.stroke)}${optAttr('stroke-width', primitive.strokeWidth?.toString())}${optAttr('fill', primitive.fill)} />`;

    case 'rect':
      return `${indent}<rect x="${primitive.x}" y="${primitive.y}" width="${primitive.width}" height="${primitive.height}"${optAttr('stroke', primitive.stroke)}${optAttr('stroke-width', primitive.strokeWidth?.toString())}${optAttr('stroke-dasharray', primitive.strokeDasharray)}${optAttr('fill', primitive.fill)} />`;

    case 'text':
      return `${indent}<text x="${primitive.x}" y="${primitive.y}"${optAttr('font-size', primitive.fontSize?.toString())}${optAttr('font-family', primitive.fontFamily)}${optAttr('font-weight', primitive.fontWeight)}${optAttr('fill', primitive.fill)}${optAttr('text-anchor', primitive.textAnchor)}${optAttr('transform', primitive.transform)}>${escapeXml(primitive.content)}</text>`;

    case 'group': {
      const children = primitive.children.map(c => renderPrimitive(c, depth + 1)).join('\n');
      return `${indent}<g${optAttr('id', primitive.id)}${optAttr('transform', primitive.transform)}>\n${children}\n${indent}</g>`;
    }
  }
}

function optAttr(name: string, value: string | undefined): string {
  if (value === undefined) return '';
  return ` ${name}="${escapeXml(value)}"`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
