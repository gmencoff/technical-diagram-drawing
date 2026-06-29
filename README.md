# Technical Diagram Renderer

A structured technical diagram compiler that converts semantic YAML/JSON specifications into clean, editable vector graphics. Designed so that LLMs and users can produce presentation-ready engineering diagrams without manually drawing every shape.

## Concept

Instead of specifying drawing primitives (lines, coordinates, pixels), you describe **what** the diagram contains at an engineering level:

```yaml
array:
  type: ULA
  elements: 6
wave:
  arrival_angle: 35 deg
```

The application owns the visual grammar — it decides placement, spacing, styling, and layout.

## Architecture

```text
YAML / JSON Spec
  -> Semantic Parser
  -> Validator
  -> Scene Graph
  -> Renderer
  -> SVG / PPTX / PNG
```

## Initial Domain

RF and phased array engineering, starting with a **uniform linear antenna array receiving an incoming plane wave**.

## Output Formats

- **SVG** — primary preview format, clean vector output
- **PPTX** — editable PowerPoint shapes (not a bitmap export)
- **PNG** — convenience raster export (planned)

## Usage (Planned)

```bash
diagram-render examples/plane_wave_array.yaml --svg out/array.svg --pptx out/array.pptx
```

## Documentation

- [Full MVP Specification](docs/SPEC.md) — detailed requirements, input format, validation rules, and roadmap
