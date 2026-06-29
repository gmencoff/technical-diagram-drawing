# Semantic Technical Diagram Renderer -- MVP Architecture & Implementation Brief

## MVP Architecture

The renderer is organized as a sequence of independent stages. The
authoring YAML is the single source of truth; every later representation
is derived from it.

``` text
Authoring YAML
      ↓
YAML Parser
      ↓
Structural Validation
      ↓
Object Registry Lookup
      ↓
Local Object Validation
      ↓
Semantic Expansion
      ↓
Resolved Scene Graph
      ↓
Symbol Table
      ↓
Reference Validation
      ↓
Layout
      ↓
SVG Primitive Generation
      ↓
SVG Serialization
```

### Design Principles

-   **Semantic First** -- The language describes *what* the diagram
    represents, not how it is drawn.
-   **Single Source of Truth** -- The authoring YAML remains
    authoritative.
-   **Generated Scene Graph** -- Rendering operates on an expanded
    semantic graph.
-   **Composable Objects** -- Complex objects (e.g. `antenna.ULA`) will
    expand into simpler objects (e.g. `antenna.Element`).
-   **Round-Trip Friendly** -- Future graphical editors should update
    semantic properties rather than SVG geometry.

------------------------------------------------------------------------

# MVP Goals

The first implementation should demonstrate the complete end-to-end
pipeline by rendering a simple free-space propagation illustration.

The MVP is **designed primarily for LLM users**. The authoring language
should be concise, deterministic, and easy for an LLM to generate. The
implementation should be structured so that it can be exposed through an
**MCP server**, allowing LLMs to submit diagram specifications and
receive rendered SVGs.

------------------------------------------------------------------------

# Authoring Syntax

``` yaml
objects:
  - type: antenna.Element
    id: tx

  - type: antenna.Element
    id: rx

  - type: annotation.Circle
    id: freeSpace
    center: tx.center
    radius: distance(tx.center, rx.center)
    label: Free Space Region
```

Only a single expression is required for the MVP:

``` text
distance(anchorA, anchorB)
```

The circle center should simply reference `tx.center`, while the radius
is computed from the distance between the two antenna centers.

------------------------------------------------------------------------

# Pipeline

Implement the renderer as independent stages:

``` text
YAML
→ Parse
→ Structural Validation
→ Local Object Validation
→ Semantic Expansion
→ Resolved Scene Graph
→ Symbol Table
→ Reference Validation
→ Layout
→ SVG Primitive Generation
→ SVG Serialization
```

------------------------------------------------------------------------

# Object Types

## antenna.Element

### Authoring Properties

-   `type` (required)
-   `id` (required)

### Generated Features

-   `<id>.center`
-   `<id>.port`

### Rendering

Draw a simple antenna glyph.

------------------------------------------------------------------------

## annotation.Circle

### Authoring Properties

-   `type` (required)
-   `id` (required)
-   `center`
-   `radius`
-   `label` (optional)

### Generated Features

-   `<id>.center`

### Rendering

Draw a dashed circle with an optional label.

------------------------------------------------------------------------

# Property Definitions

Property definitions should be the single source of truth for:

-   Validation
-   Documentation
-   Future inspector generation

Do **not** include inspector-specific metadata yet.

Suggested shape:

``` ts
type PropertyDefinition = {
    required?: boolean;
    default?: unknown;
    shortDescription?: string;
    longDescription?: string;
    min?: number;
    max?: number;

    validate(value: unknown, propertyName: string): void;
}
```

------------------------------------------------------------------------

# Resolved Scene Graph

The resolved scene graph contains generated semantic objects and
features.

Example:

``` text
tx
├── center
└── port

rx
├── center
└── port

freeSpace
└── center
```

Every generated object should retain provenance:

-   `sourceObjectId`
-   `generatedBy`
-   `path`

------------------------------------------------------------------------

# Symbol Table

Build a lookup table from reference paths to resolved features.

Example:

``` text
tx
tx.center
tx.port
rx
rx.center
rx.port
freeSpace
freeSpace.center
```

This supports expression evaluation and future connections.

------------------------------------------------------------------------

# Layout

For the MVP, use a deterministic layout:

-   Place `tx` on the left.
-   Place `rx` on the right.
-   Compute anchor locations.
-   Evaluate `distance(tx.center, rx.center)`.
-   Render the circle.

------------------------------------------------------------------------

# SVG

Render into a small SVG primitive tree before serializing into a
standalone SVG document.

------------------------------------------------------------------------

# MVP Deliverable

Given the example YAML, produce an SVG containing:

-   A transmit antenna (`tx`)
-   A receive antenna (`rx`)
-   A dashed circle representing free-space propagation
-   A label reading "Free Space Region"

------------------------------------------------------------------------

# Out of Scope

Do not implement yet:

-   `antenna.ULA`
-   Variables
-   General expression language
-   Connections
-   Styling system
-   Inspector UI
-   Manual graphical editing
-   Constraint-based layout
-   Multiple scenes/sections
