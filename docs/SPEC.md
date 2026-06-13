# MVP Spec: Structured Technical Diagram Renderer

## Goal

Build a small application that converts structured text descriptions into clean, editable technical diagrams.

The initial domain is **RF and phased array engineering**, with the first diagram type focused on a **uniform linear antenna array receiving an incoming plane wave**.

The application should not use image generation. It should use a structured semantic specification and render deterministic vector graphics.

## Core Concept

The user or LLM provides a structured diagram spec, such as YAML or JSON.

The application parses the spec, validates it, creates an internal scene graph, and renders the diagram to one or more output formats.

Architecture:

```text
YAML / JSON Spec
  -> Semantic Parser
  -> Validator
  -> Scene Graph
  -> Renderer
  -> SVG / PPTX / PNG
```

## Primary MVP Use Case

Render the classic antenna array diagram:

- Uniform linear array
- N antenna elements
- Incoming plane wave
- Parallel constant-phase wavefronts
- Propagation direction arrow
- Arrival angle theta
- Element spacing d
- Optional phase progression labels

## Example Input Spec

```yaml
diagram: plane_wave_array
title: Plane wave arriving at a uniform linear array

array:
  type: ULA
  elements: 6
  spacing:
    value: 0.5
    unit: lambda
  orientation: horizontal

wave:
  type: plane_wave
  direction: receive
  arrival_angle:
    value: 35
    unit: deg
  wavefronts: 6

annotations:
  theta: true
  spacing_d: true
  phase_progression: true
  propagation_arrow: true
  equation: true

style:
  target: presentation
  aspect_ratio: 16:9
  theme: clean
```

## Expected Output

The renderer should produce a presentation-ready technical diagram showing:

- A horizontal ULA with six elements
- Blue parallel wavefronts arriving at an angle
- A propagation arrow
- An angle marker labeled theta
- A dimension marker labeled d between adjacent elements
- Labels above each element showing phase progression:
  - phi_0
  - phi_0 - Delta_phi
  - phi_0 - 2*Delta_phi
  - etc.
- Optional equation callout:
  - Delta_phi = 2*pi*d*sin(theta) / lambda

## Output Formats

For the MVP, support:

1. **SVG**
   - Primary preview format
   - Clean vector output
   - Easy to inspect and debug

2. **PPTX**
   - Export as editable PowerPoint shapes
   - Do not export the diagram as a single bitmap
   - Each element, line, arrow, label, and annotation should be editable

PNG can be added later as a convenience export.

## Internal Model

Do not treat the input as drawing primitives. The semantic model should preserve engineering meaning.

Example internal objects:

```text
DiagramScene
  - AntennaArray
  - AntennaElement
  - PlaneWave
  - WavefrontSet
  - PropagationVector
  - AngleAnnotation
  - SpacingAnnotation
  - PhaseLabelSet
  - EquationCallout
```

The renderer should decide placement, spacing, label positions, line lengths, and styling.

## Important Design Rule

The user or LLM should say:

```yaml
array:
  type: ULA
  elements: 6
wave:
  arrival_angle: 35 deg
```

not:

```yaml
draw_line:
  x1: 100
  y1: 200
  x2: 300
  y2: 400
```

The app owns the visual grammar.

## MVP Implementation Requirements

The application should provide:

- A command-line interface
- One example YAML file
- One SVG output
- One PPTX output
- Basic validation with helpful error messages

Example CLI:

```bash
diagram-render examples/plane_wave_array.yaml --svg out/array.svg --pptx out/array.pptx
```

## Validation Rules

For `plane_wave_array`:

- `array.type` must be `ULA`
- `array.elements` must be >= 2
- `wave.type` must be `plane_wave`
- `wave.arrival_angle.value` must be between -90 and 90 degrees
- `array.spacing.unit` may be `lambda`, `m`, or `wavelength`
- Renderer should warn if spacing is greater than 0.5 lambda because grating lobes may occur

## Style Requirements

The output should look like a clean engineering presentation figure:

- White background
- Minimal color palette
- Antenna elements in dark gray or black
- Wavefronts and propagation arrow in blue
- Angle annotation in green or accent color
- Clear readable labels
- 16:9 layout by default
- No clutter
- No photorealistic imagery

## Future Diagram Types

After the first MVP works, add support for:

### 1. Beamforming Chain

```yaml
diagram: beamforming_chain
array:
  elements: 4
receiver_chain:
  per_channel:
    - antenna
    - lna
    - phase_shifter
    - weight
  combiner: sum
```

Expected visual:

```text
Antenna elements -> LNAs -> phase shifters / weights -> summing junction -> output
```

### 2. RF Receiver Front End

```yaml
diagram: rf_frontend
channels: 4
per_channel:
  - antenna
  - limiter
  - lna
  - mixer
  - adc
shared:
  - lo_distribution
  - clock_distribution
```

### 3. Radar Signal Chain

```yaml
diagram: radar_chain
blocks:
  - waveform
  - transmitter
  - radiator
  - channel
  - target
  - collector
  - receiver
  - beamformer
  - detector
```

## Longer-Term Vision

The application should become a domain-aware technical diagram compiler.

The same semantic spec should support multiple render targets:

```text
Semantic diagram spec
  -> Chat explanation renderer
  -> SVG renderer
  -> PowerPoint renderer
  -> LaTeX/TikZ renderer
  -> Interactive web renderer
```

The goal is to make it easy for LLMs and users to create accurate, editable engineering diagrams without manually drawing every shape.
