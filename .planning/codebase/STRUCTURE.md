# Codebase Structure

**Analysis Date:** 2026-02-10

## Directory Layout

```
bom-tool/
├── index.html              # Page layout and structure (no inline JS)
├── css/
│   └── styles.css          # All styling, grid layout, theme variables
├── js/
│   ├── main.js             # Entry point - initializes all UI modules
│   ├── core/               # Data processing logic (parsing, trees, flattening, comparison)
│   │   ├── parser.js       # XML and CSV parsing
│   │   ├── tree.js         # BOMNode class and tree building
│   │   ├── flatten.js      # BOM flattening and sorting
│   │   ├── compare.js      # BOM comparison logic
│   │   ├── utils.js        # Helper functions (length parsing, compositing, diffs)
│   │   └── environment.js  # Platform detection and dependency abstraction
│   ├── ui/                 # User interface and state management
│   │   ├── state.js        # Centralized app state object
│   │   ├── flat-bom.js     # Flat BOM tab logic
│   │   ├── comparison.js   # BOM Comparison tab logic
│   │   └── hierarchy.js    # Hierarchy View tab logic
│   └── export/             # Report generation
│       ├── excel.js        # Excel export for all tabs
│       ├── html.js         # HTML report export for all tabs
│       └── shared.js       # Export utilities (filenames, formatting)
├── test/
│   ├── run-tests.js        # Automated validation test suite
│   ├── inspect-excel.js    # Utility for debugging Excel output
│   └── investigate-*.js    # Ad-hoc investigation scripts
├── test-data/              # Test BOM files (CSV, XML)
├── package.json            # Node.js dependencies (for testing only)
└── .planning/              # Project planning documents (not part of app code)
```

## Directory Purposes

**js/core/:**
- Purpose: All file parsing and BOM transformation logic, completely independent of UI
- Contains: Parser implementations, tree data structure, algorithms for flattening and comparison
- Key files: `parser.js` (handles XML + CSV), `tree.js` (BOMNode + buildTree), `flatten.js` (aggregation), `compare.js` (diff logic)
- Testable: Yes - all exports used by `test/run-tests.js` in Node.js environment

**js/ui/:**
- Purpose: User interaction, tab management, result rendering, state centralization
- Contains: Event listeners, DOM manipulation, result table generation, message display
- Key files: `state.js` (single state object), `flat-bom.js` (workflow 1), `comparison.js` (workflow 2), `hierarchy.js` (workflow 3)
- Pattern: Each tab module (`flat-bom.js`, `comparison.js`, `hierarchy.js`) exports `init()` function called from `main.js`

**js/export/:**
- Purpose: Generate downloadable reports in multiple formats
- Contains: Excel workbook construction, HTML template generation, filename formatting
- Key files: `excel.js` (XLSX workbook creation), `html.js` (HTML document generation), `shared.js` (utilities)
- Dependency: SheetJS (XLSX) library via CDN or npm

**css/:**
- Purpose: All visual styling, layout, theme colors
- Contains: CSS Grid layout for tables, Flexbox for buttons, color variables, responsive design
- Key files: `styles.css` (single unified stylesheet, no preprocessor)

**test/:**
- Purpose: Automated validation and debugging
- Contains: Test runner, test data paths, validation logic, comparison helpers
- Key files: `run-tests.js` (main test suite with 4 validation tests)
- Usage: Run via `cd test && node run-tests.js`

## Key File Locations

**Entry Points:**
- `index.html`: Single HTML page, loads styles, imports SheetJS CDN, imports `js/main.js` as ES6 module
- `js/main.js`: Imports all three UI module inits, sets up tab switching

**Configuration:**
- No build config, no bundler, no environment variables (app is offline)
- `package.json`: Only lists dev dependencies for testing

**Core Logic:**
- `js/core/parser.js`: Exports `parseXML()` and `parseCSV()` - entry points for file parsing
- `js/core/tree.js`: Exports `BOMNode` class, `buildTree()`, root info getters
- `js/core/flatten.js`: Exports `flattenBOM()` and `sortBOM()`
- `js/core/compare.js`: Exports `compareBOMs()` and subtree operations
- `js/core/utils.js`: Exports `parseLength()`, `decimalToFractional()`, `getCompositeKey()`, `createDiff()`

**Testing:**
- `test/run-tests.js`: Test runner - runs 4 validation tests against baseline Excel files
- `test-data/`: Contains test BOM files and baseline Excel outputs
- Tests validate: XML parsing + flattening, CSV parsing + flattening, XML comparison, CSV comparison

**UI Logic:**
- `js/ui/state.js`: Single exported `state` object with all global state
- `js/ui/flat-bom.js`: Flat BOM tab - file upload, flatten button, results table, exports
- `js/ui/comparison.js`: Comparison tab - two file uploads, tree selection, compare button, filtering, exports
- `js/ui/hierarchy.js`: Hierarchy tab - file upload, view tree structure, expand/collapse, exports

## Naming Conventions

**Files:**
- Kebab-case: `flat-bom.js`, `export-excel.js`
- Descriptive names: `parser.js` (not `p.js`), `flatten.js` (not `flat.js`)
- Module suffix only where needed: `compare.js` not `comparator.js`

**Functions:**
- camelCase: `flattenBOM()`, `buildTree()`, `parseXML()`, `getCompositeKey()`
- Verb-noun pattern: `parseLength()`, `extractSubtree()`, `createDiff()`, `showMessage()`
- Getter pattern: `getRootPartNumber()`, `getRootRevision()`

**Variables:**
- camelCase: `flattenedBOM`, `treeRoot`, `uploadedFilename`
- Boolean: `isXML`, `isNode`, `isBrowser`, `hasChildren`
- Map/collection: `aggregatedItems`, `resultMap`, `nodesMap`

**Types / Classes:**
- PascalCase: `BOMNode`

**DOM IDs:**
- Kebab-case: `uploadZone`, `flattenBtn`, `resultsBody`, `compareTab`
- Descriptive: `oldBomFile` not `oldFile`, `newBomFile` not `newFile`

## Where to Add New Code

**New Feature (e.g., new export format):**
- Primary code: `js/export/[format].js` (new export module)
- Update: `js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js` to call new export function
- Test: Add test case to `test/run-tests.js` if output needs validation

**New Data Processing Algorithm (e.g., BOM merging):**
- Implementation: `js/core/[feature].js` (new module)
- Exports: Pure functions with no side effects
- Test: Add Node.js test before UI integration

**New Tab / Workflow:**
- Module: `js/ui/[workflow].js` with `init()` export
- HTML: Add `<div class="tab-content" id="[workflow]Tab">` to `index.html`
- CSS: Add styles to `css/styles.css`
- Call: Import and call from `js/main.js`

**New Utility Function:**
- Location: `js/core/utils.js` if used by multiple modules, otherwise inline in consuming module
- Pattern: Pure function, no side effects, descriptive name

**New UI Helper (message display, table rendering, etc.):**
- Consider: Add as sub-function in consuming UI module first
- Extract: Move to shared location only if used by 2+ UI modules
- Avoid: Creating unnecessary shared modules

## Special Directories

**test/:**
- Purpose: Test infrastructure
- Generated: No
- Committed: Yes
- Notes: Run tests with `cd test && node run-tests.js`. All 4 tests must pass after any code change.

**test-data/:**
- Purpose: Test BOM files (XML and CSV) and baseline Excel outputs for validation
- Generated: No
- Committed: Yes
- Notes: Baseline files represent "correct" flattening/comparison output. Tests compare actual output against these baselines.

**.planning/:**
- Purpose: Project planning documents, roadmap, phase tracking
- Generated: Yes (by GSD commands)
- Committed: Yes
- Notes: Not part of application code, used for development coordination

**css/:**
- Purpose: All styling
- Generated: No
- Committed: Yes
- Notes: Single `styles.css` file, no preprocessor. CSS Grid and Flexbox for layout.

## Module Import Patterns

**Core modules import from core only:**
```javascript
import { parseLength, getParentLevel } from './utils.js';
import { BOMNode } from './tree.js';
```

**UI modules import core + state:**
```javascript
import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree } from '../core/tree.js';
import { flattenBOM } from '../core/flatten.js';
```

**Export modules import core + utils:**
```javascript
import { formatDateString } from './shared.js';
import { decimalToFractional } from '../core/utils.js';
```

**No circular imports:** Core modules never import UI modules, export modules never import UI modules.

---

*Structure analysis: 2026-02-10*
