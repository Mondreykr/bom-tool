# Architecture

**Analysis Date:** 2026-02-10

## Pattern Overview

**Overall:** Layered modular architecture with clear separation of concerns: data processing core, UI presentation layer, and export functionality.

**Key Characteristics:**
- No build process - vanilla ES6 modules loaded natively in browser
- Core logic completely decoupled from UI (testable in Node.js environment)
- Shared state management via centralized `state` object in `js/ui/state.js`
- Tab-based single-page application with three independent workflows
- Platform-agnostic parsing (browser and Node.js compatible via abstraction layer)

## Layers

**Data Processing Core (js/core/):**
- Purpose: Parse files, build tree structures, flatten BOMs, compare BOMs
- Location: `js/core/parser.js`, `js/core/tree.js`, `js/core/flatten.js`, `js/core/compare.js`, `js/core/utils.js`, `js/core/environment.js`
- Contains: Parser logic, tree manipulation, BOM flattening algorithms, comparison logic, length conversions
- Depends on: Nothing (zero external dependencies within core)
- Used by: UI modules, test suite, export modules

**UI Presentation Layer (js/ui/):**
- Purpose: Handle user interactions, render results, manage tab switching
- Location: `js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js`, `js/ui/state.js`, `js/main.js`
- Contains: File upload handlers, result rendering, DOM manipulation, event listeners
- Depends on: Data processing core (`js/core/*`), Export modules, Centralized state
- Used by: Browser DOM

**Export Layer (js/export/):**
- Purpose: Generate downloadable reports in Excel and HTML formats
- Location: `js/export/excel.js`, `js/export/html.js`, `js/export/shared.js`
- Contains: Excel workbook generation, HTML report templates, filename formatting
- Depends on: Data processing core, SheetJS (XLSX) library
- Used by: UI modules

## Data Flow

**Flat BOM Workflow:**

1. User uploads CSV or XML file via `index.html` file input
2. `js/ui/flat-bom.js` receives file, reads content via FileReader API
3. `js/core/parser.js` parses XML (via DOMParser) or CSV (via XLSX) into row array
4. `js/core/tree.js` builds tree structure (BOMNode hierarchy) from rows
5. User enters unit quantity, clicks flatten
6. `js/core/flatten.js` recursively traverses tree, aggregates quantities, produces flat parts list
7. `js/core/flatten.js` sorts results by Component Type > Description > Length
8. `js/ui/flat-bom.js` renders results table, updates stats display
9. User can export: `js/export/excel.js` or `js/export/html.js` generate downloads

**BOM Comparison Workflow:**

1. User uploads two files (old BOM and new BOM) via comparison tab
2. Both files parsed and flattened using same pipeline as flat BOM
3. Optional: User selects subtree in either BOM via tree selection panel for scoped comparison
4. `js/core/compare.js` `compareBOMs()` creates map of parts from each BOM, identifies Added/Removed/Changed
5. Changes categorized by type and attribute (Qty, Description, Purchase Description)
6. `js/ui/comparison.js` renders results table, provides filtering by change type
7. User can export comparison: `js/export/excel.js` or `js/export/html.js`

**Hierarchy View Workflow:**

1. User uploads single file via hierarchy tab
2. File parsed and tree built using same pipeline
3. Tree structure preserved (no flattening) for display
4. `js/ui/hierarchy.js` renders expandable tree table showing assembly hierarchy
5. User can expand/collapse nodes, expand all, collapse all
6. User can export hierarchy: `js/export/excel.js` or `js/export/html.js`

**State Management:**

State shared across all three tabs via `state` object in `js/ui/state.js`:
- `csvData`: Parsed rows from input file
- `flattenedBOM`: Output of flatten operation
- `treeRoot`: Root BOMNode from tree construction
- `uploadedFilename`: Original filename for export naming
- For comparison: separate old/new BOM state objects (`oldBomData`, `oldBomTree`, `oldBomFlattened`, etc.)
- For hierarchy: separate hierarchy-specific state (`hierarchyData`, `hierarchyTree`, etc.)

## Key Abstractions

**BOMNode:**
- Purpose: Tree node representing single part in hierarchy
- Examples: `js/core/tree.js` class definition (lines 23-39)
- Pattern: Immutable once created, contains part attributes and children array

**Tree Building:**
- Purpose: Transform flat row array into hierarchical structure
- Examples: `js/core/tree.js` `buildTree()` function (lines 42-75)
- Pattern: Two-pass algorithm - create all nodes, then link by parent-child relationship

**Flattening:**
- Purpose: Convert hierarchical tree to flat parts list with aggregated quantities
- Examples: `js/core/flatten.js` `flattenBOM()` function (lines 6-51)
- Pattern: Recursive tree traversal with multiplier propagation and Map-based deduplication

**Comparison:**
- Purpose: Diff two flattened BOMs to identify changes
- Examples: `js/core/compare.js` `compareBOMs()` function (lines 7-99)
- Pattern: Map-based keyed lookups to find Added (new only), Removed (old only), Changed (both with differences)

**Composite Key:**
- Purpose: Uniquely identify a part across length variants (some parts exist in multiple lengths)
- Examples: `js/core/utils.js` `getCompositeKey()` function (lines 53-58)
- Pattern: `partNumber` for parts without length, or `partNumber|lengthValue` for parts with length

## Entry Points

**Browser Entry Point:**
- Location: `index.html`
- Triggers: Page load
- Responsibilities: DOM structure, style loading, module script tag with `src="js/main.js"`

**Main Module Entry Point:**
- Location: `js/main.js`
- Triggers: `DOMContentLoaded` or immediate if already loaded
- Responsibilities: Import three UI module inits, set up tab switching logic, prevent initial tab display

**Tab UI Inits:**
- Location: `js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js` (each exports `init()`)
- Triggers: Called from `js/main.js`
- Responsibilities: Attach event listeners, set up file uploads, result rendering

## Error Handling

**Strategy:** Try-catch with user-facing messages displayed in message div element

**Patterns:**

- **File Parsing Errors:** Invalid XML (`parsererror` element detected), missing elements ("No transaction element found")
  - Caught in `js/ui/flat-bom.js` line 66-80, display via `showMessage(msg, 'error')`

- **Tree Building Errors:** Missing parent node ("Parent {level} not found"), no root node ("No root node found")
  - Thrown from `js/core/tree.js` lines 56-67, propagate to UI error handler

- **Data Validation:** Empty files, incorrect headers
  - Handled by parser returning empty array or throwing error

- **File Type Detection:** Non-CSV/XML files rejected at upload
  - UI layer validates filename extension before processing

## Cross-Cutting Concerns

**Logging:** Browser console only (`console.log()` statements in parsers and UI modules). No production logging framework.

**Validation:** Implicit via parsing and tree construction - invalid data causes parser errors. No explicit schema validation layer.

**Authentication:** Not applicable - browser-based offline tool, no user accounts or API calls.

**File Type Detection:** Extension-based (.csv vs .xml) in UI layer, then semantic parsing (XML structure, CSV headers) in core.

**Environment Abstraction:** `js/core/environment.js` handles browser vs Node.js runtime differences:
- `DOMParser`: Native in browser, xmldom package in Node.js
- `XLSX`: CDN global in browser, npm package in Node.js
- `isNode` and `isBrowser` flags enable conditional imports

---

*Architecture analysis: 2026-02-10*
