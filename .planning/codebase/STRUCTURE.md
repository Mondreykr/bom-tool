# Codebase Structure

**Analysis Date:** 2026-02-07

## Directory Layout

```
bom-tool/
├── index.html                                    # Main application (4396 lines)
├── CLAUDE.md                                     # Development guidelines and architecture reference
├── BOM Tool Handoff 20251209.md                  # Comprehensive project documentation
├── BOM Tool Enhancements 20260115.md             # Feature requirements (all complete)
├── .planning/
│   └── codebase/                                 # GSD planning documents
│       ├── ARCHITECTURE.md                       # Architecture analysis
│       └── STRUCTURE.md                          # This file
├── archive/                                      # Historical documents (not in active use)
│   ├── context-original-20251209.md
│   ├── IFP Release Challenge.md
│   ├── IFP BOM Merge Tool PRD.md
│   └── IFP BOM Merge Tool - Codebase Reality Check.md
├── test/                                         # Test harness for validation
│   ├── run-tests.js                             # Node.js test runner (extracts functions from HTML)
│   ├── inspect-excel.js                         # Excel inspection utility
│   └── package.json                             # Dependencies: xlsx, xmldom
└── test-data/                                    # Test inputs and baseline outputs
    ├── BOM Tool 2.1 Validation Testing Plan 20260115.md
    ├── 1032401-Rev1-20260105.XML
    ├── 1032401-Rev2-20260112.XML
    ├── 258730-Rev0-As Built.csv
    ├── 258730-Rev1-As Built.csv
    ├── 258730-Rev2-20260112.XML
    ├── 258754-Rev0-20251220.XML
    ├── 258754-Rev1-20260112.XML
    └── [baseline Excel comparison files]
```

## Directory Purposes

**Root Directory:**
- Purpose: Main application file and documentation
- Contains: Single executable HTML file + guidance/reference docs
- Key files:
  - `index.html`: Complete application (no build step needed)
  - `CLAUDE.md`: Developer reference for future modifications
  - `.md` files: Business logic and feature documentation

**.planning/codebase/:**
- Purpose: GSD mapping outputs for code navigation and planning
- Contains: ARCHITECTURE.md and STRUCTURE.md (this analysis)
- Generated: Not committed (outputs from `/gsd:map-codebase`)
- Used by: `/gsd:plan-phase` and `/gsd:execute-phase` commands

**archive/:**
- Purpose: Historical context and future feature planning
- Contains: Original project spec, problem statements for IFP Merge feature
- Key files:
  - `IFP BOM Merge Tool PRD.md`: Full specification for next major feature (~400 lines to implement)
- Status: Reference only; not active

**test/:**
- Purpose: Automated validation of core business logic
- Contains: Node.js test runner that extracts functions from HTML
- Key files:
  - `run-tests.js`: Test suite with baseline comparisons
  - `package.json`: Dependencies (xlsx, xmldom for parsing)
- How to run: `node run-tests.js` (requires Node.js + npm)

**test-data/:**
- Purpose: Test input files and baseline outputs for validation
- Contains: Real SOLIDWORKS PDM exports (CSV and XML) + validation plan
- Key files:
  - XML files: Full hierarchical BOMs from SOLIDWORKS PDM
  - CSV files: UTF-16LE encoded BOMs with BOM headers
  - XLSX files: Baseline output files for comparison testing
- Size: Real-world BOMs (27KB-400KB each)

## Key File Locations

**Entry Points:**

- `index.html` (lines 844-856): Tab navigation buttons that switch between three modes
  - `<button data-tab="flatten">` activates Flat BOM workflow
  - `<button data-tab="compare">` activates BOM Comparison workflow
  - `<button data-tab="hierarchy">` activates Hierarchy View workflow

**Configuration:**

- `index.html` (lines 17-32): CSS custom properties (colors, spacing)
  - `--primary: #1e40af` (primary blue)
  - `--gray-50` through `--gray-900` (color scale)
  - Google Fonts imports (JetBrains Mono for data, Work Sans for UI)

**Core Logic:**

**Flat BOM Processing:**
- `parseXML()` (lines 1367-1478): Parse SOLIDWORKS XML exports
- `buildTree()` (lines 1502-1573): Convert flat rows to BOMNode hierarchy
- `flattenBOM()` (lines 1584-1642): Aggregate quantities by composite key
- `decimalToFractional()` (lines 1645-1671): Convert decimals to 1/16" fractions
- `sortBOM()` (lines 1673-1723): Sort flattened results
- `displayResults()` (lines 1725-2170): Render table and statistics

**BOM Comparison Processing:**
- `renderSelectionTree()` (lines 2268-2274): Display tree selection UI
- `handleNodeSelection()` (lines 2385-2419): Track node selection for scoping
- `extractSubtree()` (lines 2434-2520): Clone selected subtree for scoped comparison
- `handleCompareFile()` (lines 2522-2628): Parse and process comparison file
- `compareBOMs()` (lines 2696-2791): Compare two flattened BOMs
- `createDiff()` (lines 2864-2894): Generate word-level diffs for descriptions
- `displayComparisonResults()` (lines 2800-2842): Render comparison table with filters

**Hierarchy View Processing:**
- `handleHierarchyFile()` (lines 3572-3621): Parse file for hierarchy view
- `displayHierarchyTree()` (lines 3664-3685): Prepare tree for rendering
- `renderTreeNode()` (lines 3687-3827): Recursively render tree with connectors
  - Uses ancestorContinues array to track multi-level vertical lines
  - Draws L-shaped and T-shaped connectors
  - Handles expand/collapse toggle state

**UI Utilities:**
- `showMessage()` (lines 2172-2266): Display success/error messages
- `showCompareMessage()` (lines 2630-2694): Display comparison-tab messages
- `showHierarchyMessage()` (lines 3623-3662): Display hierarchy-tab messages

**Testing:**
- `test/run-tests.js`: Extracts core functions (parseXML, buildTree, flattenBOM, etc.) and runs validation against test-data/

## Naming Conventions

**Files:**

- Main file: `index.html` (no version number in filename; tracked via git commits)
- Test runner: `run-tests.js` (JavaScript Node.js script)
- Test data: `{AssemblyPN}-Rev{N}-{YYYYMMDD}.{xml|csv}` (matches exported BOM naming)
- Documentation: `{Description} {YYYYMMDD}.md` (date for version tracking)

**Directories:**

- `test/`: Test harness (lowercase, no underscore)
- `test-data/`: Test input/output files (hyphenated)
- `archive/`: Historical documents (lowercase)
- `.planning/`: GSD planning outputs (dot-prefixed)

**JavaScript Identifiers:**

**Global Variables:**
- Flat BOM tab: `csvData`, `flattenedBOM`, `treeRoot`, `rootPartNumber`, `rootRevision`, `rootDescription`, `uploadedFilename`
- Comparison tab: `oldBomData`, `newBomData`, `oldBomFlattened`, `newBomFlattened`, `oldBomTree`, `newBomTree`, `oldSelectedNode`, `newSelectedNode`, `comparisonResults`, `currentFilter`
- Hierarchy tab: `hierarchyTree`, `hierarchyRootInfo`, `hierarchyFilename`
- UI elements: Prefixed with all lowercase or camelCase (e.g., `uploadZone`, `csvFile`, `flattenBtn`, `resultsBody`)

**Functions:**
- camelCase: `handleFile()`, `parseXML()`, `buildTree()`, `flattenBOM()`, `decimalToFractional()`, `displayResults()`, `compareBOMs()`, `createDiff()`, `renderTreeNode()`, `toggleChildren()`
- Single responsibility: Function names describe exact action (e.g., `getCompositeKey()`, `getParentLevel()`, `extractSubtree()`)

**Classes:**
- PascalCase: `BOMNode` (single class in codebase)

**CSS Classes:**
- kebab-case: `.upload-zone`, `.file-info`, `.tree-cell`, `.tree-toggle`, `.diff-removed`, `.diff-added`, `.card`, `.btn-primary`, `.filter-btn`
- BEM-ish: `.tree-selection-panel`, `.tree-panel-header`, `.tree-panel-filename` (parent-child relationship)
- Utility: `.active`, `.show`, `.has-file`, `.dragover`, `.expanded`, `.last-child` (state classes)

**Data Attributes:**
- Kebab-case: `data-tab="flatten"`, `data-filter="Added"`

## Where to Add New Code

**New Feature - Tab-Based Feature:**
If adding a 4th feature tab:
1. Add `<button class="tab-btn" data-tab="featureName">` to tab navigation (line ~854)
2. Add `<div class="tab-content" id="featureTab">` section for UI (follow pattern of lines 859-1220)
3. Add JavaScript event listeners and handlers after other tab code
4. Add tab-switching CSS for `.tab-content.active` visibility
5. Follow naming convention: `featureTab`, `handleFeatureFile()`, etc.

**New Processing Function:**
- Location: Add to main `<script>` block (after line 1227, before closing `</script>`)
- Pattern: Match existing function style (camelCase, console logging, try-catch error handling)
- Scope: Keep global state organized by tab (don't pollute other tab variables)
- Example location for new flattening algorithm: ~line 1584 (near existing `flattenBOM()`)

**New Export Format:**
1. Create export function following pattern of `exportExcelBtn` click handler (~line 2155)
2. Use SheetJS for Excel (already included via CDN at line 7)
3. For non-Excel formats:
   - Create HTML string with inline styles
   - Use `document.createElement()` and table generation
4. Use `URL.createObjectURL()` + `<a>` tag for download

**New UI Component:**
- Location: Add to appropriate `<div class="tab-content">` section
- Pattern: Use `.card` wrapper, `.input-group` for forms, `.button-group` for buttons
- Styling: Add to `<style>` block (lines 8-841)
- CSS variables: Reference `var(--primary)`, `var(--gray-*)`
- Fonts: Use `font-family: 'JetBrains Mono', monospace` for data; `'Work Sans'` for UI text

**Utilities/Helpers:**
- Location: Group near related functions
- Example: `parseLength()` (line 1482), `getParentLevel()` (line 1495) near tree building

**Test Coverage:**
When adding features:
1. Add test case to `test/run-tests.js`
2. Create test input file in `test-data/` with expected output
3. Run `node test/run-tests.js` to validate against baseline
4. Commit baseline Excel output with test code

## Special Directories

**.git/:**
- Purpose: Git version control metadata
- Generated: Yes (created by git init)
- Committed: Yes (git internals, not code)
- Contains: Commit history, branch info, hooks

**.claude/:**
- Purpose: Claude IDE settings (local, not shared)
- Generated: Yes (created by Claude Code editor)
- Committed: No (in .gitignore for local IDE config)
- Contains: Editor preferences, local settings

**node_modules/ (in test/):**
- Purpose: Test dependencies (xlsx, xmldom for Node.js parsing)
- Generated: Yes (npm install)
- Committed: No (not in git, only package-lock.json)
- Contains: Package code for running tests outside browser

**Screenshots/ (not documented in repo):**
- Purpose: UI reference images (if added)
- Generated: Manual (taken by user)
- Committed: Yes (project documentation)

---

## File Organization Summary

**~4400 lines in single file, organized by:**

| Section | Lines | Purpose |
|---------|-------|---------|
| DOCTYPE, meta, imports | 1-7 | HTML structure |
| `<style>` CSS | 8-841 | All styling |
| `<body>` HTML markup | 844-1220 | UI layout for 3 tabs |
| Global variables | 1227-1235 | State variables |
| **Tab 1: Flat BOM** | 1237-2170 | File upload, flatten, display, export |
| **Tab 2: Comparison** | 2172-3570 | File uploads, compare, scoped selection, export |
| **Tab 3: Hierarchy** | 3572-4260 | File upload, tree display, export |
| Closing tags | 4261-4396 | `</script>`, `</body>`, `</html>` |

---

*Structure analysis: 2026-02-07*
