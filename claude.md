# CLAUDE.md

## Project Overview

Build a local single-page application that renders an adaptive interactive “table layout map” from `Table_numbers.csv`, using the provided layout image as the structural reference for flow, row direction, and numbering behavior, and `RCIS-Map.png` as a visual styling reference.

This application is local-only. No backend, database, authentication, or cloud service is required.

The app must run locally using standard frontend tooling and should prioritize correctness, clarity, accessibility, and maintainability over unnecessary complexity.

---

## Primary Goal

Create a browser-based SPA that:

1. Loads project records from `Table_numbers.csv`
2. Normalizes dirty CSV headers, including BOM-prefixed column names
3. Sorts records by the numeric suffix in `Footer`
4. Renders them into a repeating snake-pattern layout:
   - 20 blocks per horizontal run
   - visually split into two groups of 10 by a center gap
   - first run left → right
   - second run right → left
   - alternating direction thereafter
5. Colors each block by `Primary Author's Department`
6. Allows each block to be clicked or keyboard-activated
7. Opens a right-side detail panel showing selected project metadata
8. Displays a department legend with counts

The output should resemble the supplied structural template while remaining adaptive and data-driven.

---

## Required Technology Stack

Use:

- **React**
- **TypeScript**
- **Vite**

Preferred supporting choices:

- **SVG** for map rendering
- Minimal dependencies
- No UI framework unless clearly justified
- No backend framework

Avoid introducing libraries that solve trivial problems.

---

## Core Constraints

These rules are mandatory:

- Build a **client-side SPA**
- No backend or API layer
- No database
- No authentication
- No cloud dependency
- No raster-overlay approach; do **not** place blocks on top of a static image
- Recreate the layout in code using SVG or, if necessary, HTML/CSS
- Do not hardcode the number of records
- Do not assume headers are clean
- Do not sort `Footer` lexicographically
- Do not fail on sparse, malformed, or partially incomplete rows
- Prioritize data correctness and sequence integrity over exact visual mimicry

---

## Inputs

### Primary input
- `Table_numbers.csv`

### Reference images
- Template layout image: structural reference for snake direction, grouping, and order behavior
- `RCIS-Map.png`: visual styling reference

---

## CSV Data Contract

### Source columns to use

Use these exact source columns after header normalization:

- `Footer`
- `Department`
- `What is the title of your project?`
- `Created By`
- `Project Authors`
- `Primary Author's Classification`
- `Faculty advisor`
- `Project Type`
- `Abstract`
- `Primary Author's Department`

### Display labels in the detail panel

Map source fields to UI labels as follows:

- `What is the title of your project?` → `Title`
- `Created By` → `Primary Author`
- `Primary Author's Classification` → `Classification`

Keep these unchanged:

- `Project Authors`
- `Faculty advisor`
- `Project Type`
- `Abstract`

### Department field authority

Use **`Primary Author's Department`** as the authoritative field for:

- block color mapping
- legend grouping
- department counts

`Department` may be retained in the record model if useful, but should not drive block color unless a deliberate fallback is implemented when `Primary Author's Department` is blank.

---

## Header Normalization

CSV headers must be normalized before use.

Normalization must handle:

- UTF-8 BOM characters such as `\ufeff`
- leading/trailing whitespace
- inconsistent whitespace around punctuation
- blank or malformed header text

Implement a header normalization utility that:

- strips BOM artifacts
- trims whitespace
- preserves semantic meaning
- allows reliable exact lookups after normalization

Do not rely on raw header strings from the CSV.

---

## Footer Parsing and Sorting

The `Footer` field controls both the visible label and record ordering.

### Requirements

- Ignore rows with missing `Footer`
- Ignore rows with malformed `Footer` if no numeric suffix can be extracted
- Extract the final integer suffix from values such as:
  - `ASC-1`
  - `ASC-17`
  - `XYZ-204`
- Sort by extracted numeric value as a number, not a string

### Correct sort example

Correct:

- `ASC-1`
- `ASC-2`
- `ASC-10`

Incorrect:

- `ASC-1`
- `ASC-10`
- `ASC-2`

Implement this with a reliable suffix parser. Prefer extracting the final numeric sequence from `Footer`.

---

## Data Parsing Rules

The CSV loader and parser must:

- parse CSV reliably
- trim string cell values
- handle blank optional cells gracefully
- tolerate sparse rows
- provide safe display fallbacks such as `—`
- exclude invalid rows without crashing the app

Rows with missing or unusable `Footer` should be dropped from the rendered map.

---

## Parsed Record Model

Create a normalized record model that includes, at minimum:

- `footer`
- `footerNumber`
- `title`
- `primaryAuthor`
- `projectAuthors`
- `classification`
- `facultyAdvisor`
- `projectType`
- `abstract`
- `primaryAuthorDepartment`
- `department` if useful
- original raw row data if useful for debugging

Prefer strongly typed internal records over repeatedly indexing raw CSV objects.

---

## Layout Engine

Implement a layout engine that maps records into repeated horizontal snake runs.

### Core rules

- 20 blocks per run
- each run is visually split into:
  - 10 blocks
  - center gap
  - 10 blocks
- run 1 flows left → right
- run 2 flows right → left
- alternate direction on every subsequent run
- sequence must remain visually correct when traced in reading order

### Adaptation requirements

The layout must work correctly for:

- fewer than 20 records
- exactly 20 records
- more than 20 records
- arbitrarily many runs

Do not special-case a single dataset length.

### Visual structure requirements

Preserve:

- snake flow
- center gap
- consistent row rhythm
- readable spacing
- clear sequence integrity

The implementation should resemble the template structurally, but it does not need to be a pixel-for-pixel reconstruction.

---

## Rendering Approach

### Preferred approach
Use **SVG** for the layout map.

Reasons:

- better control over labeled rectangles
- predictable layout and scaling
- cleaner hit areas
- easier keyboard focus targeting
- better long-term maintainability for map-like UI

### Acceptable fallback
HTML/CSS rendering is acceptable only if it preserves:

- alternating run direction
- center gap
- strong visual structure
- accessibility
- maintainable implementation

---

## Project Block Requirements

Each project block must:

- render as a visible rectangle
- display the `Footer` label clearly
- use fill color based on `Primary Author's Department`
- have a visible border
- have a hover state
- have a selected state
- be keyboard focusable
- support activation by mouse, Enter, and Space

### Text rendering requirements

- Keep labels legible
- Do not let fill colors make text unreadable
- Prefer centered or otherwise clearly readable block labels

### Tooltip behavior

On hover and focus, show a tooltip with at least:

- Title
- Project Authors

Tooltip content must degrade gracefully when fields are blank.

---

## Department Color Mapping

Implement a categorical color system keyed to `Primary Author's Department`.

### Requirements

- auto-generate colors for all unique departments present in the CSV
- same department must always receive the same color during a session
- colors should remain deterministic when the dataset is unchanged
- colors must preserve readable text contrast
- include a visible legend showing:
  - color swatch
  - department name
  - count of projects

### Preferred implementation

Use deterministic color generation based on the department string, for example via hashing into HSL space, then normalize for usable saturation/lightness.

Also allow an optional manual override map for known departments.

### Accessibility requirements

- ensure readable foreground/background contrast
- do not rely on color alone for selected-state indication
- preserve visible borders and focus styling

---

## Detail Side Panel

Selecting a block must open a right-side detail panel.

### Required content

Display the following fields:

- `Title`
- `Primary Author`
- `Project Authors`
- `Classification`
- `Faculty advisor`
- `Project Type`
- `Abstract`

### Recommended header content

At the top of the panel, also show:

- `Footer`
- `Primary Author's Department`

### Behavior requirements

- panel appears on the right side
- panel includes a clear close control
- selecting a different block updates the panel content
- long content, especially `Abstract`, must scroll cleanly
- panel must remain usable at typical desktop widths
- deselection and close behavior must be implemented consistently

---

## Legend Requirements

Render a department legend that:

- shows all unique departments
- includes the assigned color swatch
- includes project count
- remains readable and compact
- does not interfere with map usability

### Optional enhancement

Legend items may support:

- highlight by department
- filter by department

If implemented, filtering/highlighting must be obvious and reversible.

---

## Layout and UI Structure

The UI should include:

- a main map area
- a department legend
- a right-side detail panel

### General layout expectations

- desktop-first design
- moderate responsiveness
- blocks remain legible
- side panel remains usable
- legend remains readable
- spacing remains consistent
- avoid collapsing into visual chaos on modest resizing

It is acceptable to restack elements for narrower widths so long as usability remains intact.

---

## Accessibility Requirements

Meet basic modern accessibility standards.

### Required behavior

- all project blocks must be keyboard reachable
- Enter and Space must activate a block
- visible focus styles must be present
- selected state must be visually distinct
- interactive elements must have semantic labeling
- tooltip and detail functionality must not be mouse-only

Do not create an SVG interaction model that excludes keyboard users.

---

## Local Runtime Expectations

The application must run locally using standard Vite-based frontend commands.

### Expected behavior

- a developer can install dependencies
- run the app locally
- load the CSV without backend infrastructure
- build a production bundle
- preview the built app locally

