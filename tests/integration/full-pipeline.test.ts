import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderDiagram } from '../../src/pipeline.js';

const exampleYaml = readFileSync('examples/free-space-propagation.yaml', 'utf-8');

describe('full pipeline', () => {
  it('renders the free-space-propagation example to SVG', () => {
    const result = renderDiagram(exampleYaml);

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.svg).toBeDefined();
  });

  it('produces valid SVG structure', () => {
    const { svg } = renderDiagram(exampleYaml);

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('</svg>');
  });

  it('contains two antenna groups', () => {
    const { svg } = renderDiagram(exampleYaml);

    expect(svg).toContain('<g id="tx"');
    expect(svg).toContain('<g id="rx"');
  });

  it('contains a dashed circle for the annotation', () => {
    const { svg } = renderDiagram(exampleYaml);

    expect(svg).toContain('<circle');
    expect(svg).toContain('stroke-dasharray="8 4"');
  });

  it('computes the circle radius as the distance between tx and rx centers', () => {
    const { svg } = renderDiagram(exampleYaml);

    // tx is placed at x = padding(50) + width(30)/2 = 65
    // rx is placed at x = 50 + 30 + gap(100) + 30/2 = 195
    // distance = 195 - 65 = 130 (both at same y, so pure horizontal)
    expect(svg).toMatch(/r="130"/);
  });
});

describe('error handling', () => {
  it('reports parse errors for invalid YAML', () => {
    const result = renderDiagram('{ invalid yaml [[[');
    expect(result.success).toBe(false);
    expect(result.errors![0].stage).toBe('parse');
  });

  it('reports structural errors for missing objects array', () => {
    const result = renderDiagram('foo: bar');
    expect(result.success).toBe(false);
    expect(result.errors![0].stage).toBe('structural-validation');
  });

  it('reports structural errors for duplicate ids', () => {
    const yaml = `
objects:
  - type: antenna.Element
    id: tx
  - type: antenna.Element
    id: tx
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(false);
    expect(result.errors![0].message).toContain('duplicate id');
  });

  it('reports errors for unknown object types', () => {
    const yaml = `
objects:
  - type: unknown.Thing
    id: foo
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(false);
    expect(result.errors![0].stage).toBe('registry-lookup');
  });

  it('reports errors for unresolved references', () => {
    const yaml = `
objects:
  - type: annotation.Circle
    id: c
    center: nonexistent.center
    radius: distance(nonexistent.center, alsoMissing.center)
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(false);
    expect(result.errors![0].stage).toBe('reference-validation');
  });
});
