import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderDiagram } from '../../src/pipeline.js';

const exampleYaml = readFileSync('examples/free-space-propagation.yaml', 'utf-8');
const hybridArrayYaml = readFileSync('use-cases/hybrid-array-receiver.yaml', 'utf-8');

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

    // tx is placed at x = padding(50) + width(27)/2 = 63.5
    // rx is placed at x = 50 + 27 + gap(100) + 27/2 = 190.5
    // distance = 190.5 - 63.5 = 127 (both at same y, so pure horizontal)
    expect(svg).toMatch(/r="127"/);
  });
});

describe('hybrid array receiver', () => {
  it('renders successfully', () => {
    const result = renderDiagram(hybridArrayYaml);
    expect(result.success).toBe(true);
    expect(result.svg).toBeDefined();
  });

  it('generates dot-separated IDs for expanded elements', () => {
    const { svg } = renderDiagram(hybridArrayYaml);
    expect(svg).toContain('id="rxSubarrays.1.elements.1.element"');
    expect(svg).toContain('id="rxSubarrays.1.elements.1.phaseShifter"');
    expect(svg).toContain('id="rxSubarrays.2.elements.4.element"');
  });

  it('contains two combiner blocks', () => {
    const { svg } = renderDiagram(hybridArrayYaml);
    expect(svg).toContain('id="rxSubarrays.1.combiner"');
    expect(svg).toContain('id="rxSubarrays.2.combiner"');
    expect(svg).toContain('2x4 Hybrid');
  });

  it('has connections from elements to phase shifters and phase shifters to combiners', () => {
    const { svg } = renderDiagram(hybridArrayYaml);
    const lines = svg!.match(/<line /g) || [];
    // 9 antenna mast lines + 16 phase shifter stubs + 10 combiner stubs + 16 connections = 51+
    expect(lines.length).toBeGreaterThanOrEqual(50);
  });

  it('viewBox fits the content', () => {
    const { svg } = renderDiagram(hybridArrayYaml);
    const match = svg!.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(match).toBeTruthy();
    const width = parseInt(match![1]);
    const height = parseInt(match![2]);
    expect(width).toBeLessThan(700);
    expect(height).toBeLessThan(900);
  });

  it('antenna in chain has port on the output side (right) for left-to-right flow', () => {
    const { svg } = renderDiagram(hybridArrayYaml);
    // In a left-to-right chain, the receive antenna radiates left (triangle on left)
    // and has its mast/port on the right, connecting to the next element.
    // The connection from antenna port to phase shifter input must flow left-to-right (x1 < x2).
    const lines = svg!.split('\n');
    const connectionLines = lines.filter(l => l.trim().startsWith('<line') && !lines[lines.indexOf(l) - 1]?.includes('<g'));
    const firstConnection = connectionLines[0];
    const match = firstConnection.match(/x1="([\d.]+)".*x2="([\d.]+)"/);
    expect(match).toBeTruthy();
    const x1 = parseFloat(match![1]);
    const x2 = parseFloat(match![2]);
    expect(x1).toBeLessThan(x2);
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

  it('reports error when signal generator is not first in a series chain', () => {
    const yaml = `
objects:
  - type: rf.SeriesChain
    id: chain
    objects:
      - type: rf.Block
        id: amp
        label: Amp
      - type: rf.SignalGenerator
        id: sigGen
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(false);
    expect(result.errors!.some(e => e.message.includes('sigGen'))).toBe(true);
  });

  it('reports error when signal generator is not first in a parallel chain', () => {
    const yaml = `
objects:
  - type: rf.ParallelChain
    id: paths
    count: 2
    objects:
      - type: rf.Block
        id: amp
        label: Amp
      - type: rf.SignalGenerator
        id: sigGen
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(false);
    expect(result.errors!.some(e => e.message.includes('sigGen'))).toBe(true);
  });

  it('reports error when rf.Block with inputPorts: 0 is not first in a series chain', () => {
    const yaml = `
objects:
  - type: rf.SeriesChain
    id: chain
    objects:
      - type: rf.Block
        id: amp
        label: Amp
      - type: rf.Block
        id: sink
        label: Sink
        inputPorts: 0
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(false);
    expect(result.errors!.some(e => e.message.includes('sink'))).toBe(true);
  });

  it('allows signal generator as first element in a series chain', () => {
    const yaml = `
objects:
  - type: rf.SeriesChain
    id: chain
    objects:
      - type: rf.SignalGenerator
        id: sigGen
      - type: rf.Block
        id: amp
        label: Amp
`;
    const result = renderDiagram(yaml);
    expect(result.success).toBe(true);
  });
});
