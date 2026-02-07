# Architecture Patterns: Monolithic to Modular Vanilla JS Refactoring

**Domain:** Single-file web application refactoring
**Project:** BOM Tool (4396 lines → multi-file structure)
**Researched:** 2026-02-07

## Executive Summary

Refactoring a 4400-line monolithic HTML file into a multi-file modular architecture requires careful attention to extraction order, dependency management, and global state handling. The recommended approach follows a **leaf-to-root extraction pattern** where zero-dependency utilities are extracted first, followed by core algorithms, then feature modules, and finally initialization code.

**Key insight for 2026:** ES6 modules are the standard. No build tools required initially—use `<script type="module">` with explicit imports. The refactoring priority is optimizing for AI coding assistant navigation, not just human maintainability.

**Critical success factor:** Maintain the existing test harness throughout refactoring. It validates that behavior remains unchanged at each extraction step.

## Recommended Architecture

### Component Hierarchy

```
index.html (entry point, ~100 lines)
├── css/styles.css (styling, ~840 lines)
└── js/
    ├── core/                      # Zero or minimal dependencies
    │   ├── utils.js              # Pure utility functions (15-20 lines each)
    │   ├── parser.js             # File parsing (CSV, XML) (~300 lines)
    │   ├── tree.js               # BOMNode class, tree building (~200 lines)
    │   ├── flatten.js            # BOM flattening algorithm (~150 lines)
    │   └── compare.js            # BOM comparison algorithm (~200 lines)
    ├── ui/                        # UI rendering and event handlers
    │   ├── state.js              # Global state management (~100 lines)
    │   ├── tabs.js               # Tab switching logic (~50 lines)
    │   ├── flat-bom.js           # Flat BOM tab (~400 lines)
    │   ├── comparison.js         # Comparison tab (~600 lines)
    │   └── hierarchy.js          # Hierarchy View tab (~500 lines)
    ├── export/                    # Export functionality
    │   ├── excel.js              # Excel export (~200 lines)
    │   └── html.js               # HTML export (~300 lines)
    └── main.js                    # Initialization and event binding (~200 lines)
```

### Dependency Graph

```
Direction: Bottom-up (leaves first, root last)

Level 0 (No dependencies):
  - utils.js (pure functions)

Level 1 (Depends only on Level 0):
  - parser.js → utils.js
  - tree.js → utils.js

Level 2 (Depends on Level 0-1):
  - flatten.js → tree.js, utils.js
  - compare.js → tree.js, utils.js

Level 3 (UI modules, depend on core + state):
  - state.js → (no dependencies, but imported by all UI)
  - tabs.js → state.js
  - flat-bom.js → state.js, parser.js, tree.js, flatten.js
  - comparison.js → state.js, parser.js, tree.js, flatten.js, compare.js
  - hierarchy.js → state.js, parser.js, tree.js

Level 4 (Export modules, depend on core):
  - excel.js → flatten.js, compare.js
  - html.js → flatten.js, compare.js

Level 5 (Entry point):
  - main.js → imports all UI modules, initializes app
  - index.html → imports main.js as module
```

**Critical pattern:** No circular dependencies. Arrows point only downward in the hierarchy.

## Component Boundaries

### Core Modules (js/core/)

**Philosophy:** Pure business logic. No DOM manipulation, no global state mutation.

| Module | Responsibility | Exports | Imports |
|--------|---------------|---------|---------|
| `utils.js` | Pure utility functions | `parseLength()`, `getParentLevel()`, `getCompositeKey()`, `decimalToFractional()` | None |
| `parser.js` | File format parsing | `parseCSV(text)`, `parseXML(text)` | `utils.js` |
| `tree.js` | Tree structure and building | `BOMNode` class, `buildTree(rows)`, `findNodeByPartNumber()`, `extractSubtree()` | `utils.js` |
| `flatten.js` | BOM flattening algorithm | `flattenBOM(root, unitQty)`, `sortBOM(items)` | `tree.js`, `utils.js` |
| `compare.js` | BOM comparison logic | `compareBOMs(oldFlat, newFlat)`, `createDiff(oldText, newText)` | `tree.js`, `utils.js` |

**Design principle:** Each module has one primary responsibility. Functions are stateless (root metadata is returned, not stored in module).

### UI Modules (js/ui/)

**Philosophy:** Handle user interaction, DOM manipulation, and coordinate core modules.

| Module | Responsibility | Key Functions | Depends On |
|--------|---------------|---------------|------------|
| `state.js` | Global state container | `getState()`, `setState()`, `resetState()` | None |
| `tabs.js` | Tab switching | `switchTab(tabId)`, `initTabs()` | `state.js` |
| `flat-bom.js` | Flat BOM tab | `handleFileUpload()`, `displayFlatResults()`, event handlers | `state.js`, core modules |
| `comparison.js` | Comparison tab | `handleTwoBOMsUpload()`, `displayComparison()`, scoped selection UI | `state.js`, core modules |
| `hierarchy.js` | Hierarchy View tab | `displayHierarchy()`, `renderTreeNode()`, expand/collapse | `state.js`, core modules |

**State management pattern:** All global state lives in `state.js`. UI modules import `getState()` and `setState()` rather than accessing globals directly.

### Export Modules (js/export/)

**Philosophy:** Convert in-memory data to downloadable formats.

| Module | Responsibility | Key Functions | Depends On |
|--------|---------------|---------------|------------|
| `excel.js` | Excel file generation | `exportFlatExcel()`, `exportComparisonExcel()`, `exportHierarchyExcel()` | Core modules, SheetJS |
| `html.js` | Static HTML export | `exportFlatHTML()`, `exportComparisonHTML()`, `exportHierarchyHTML()` | Core modules |

**External dependency:** SheetJS (xlsx.js) loaded via CDN in index.html, available globally.

### Entry Point (main.js)

**Responsibility:** Initialize application, wire up all event handlers.

```javascript
// main.js structure
import { initTabs } from './ui/tabs.js';
import { initFlatBOM } from './ui/flat-bom.js';
import { initComparison } from './ui/comparison.js';
import { initHierarchy } from './ui/hierarchy.js';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initFlatBOM();
    initComparison();
    initHierarchy();
});
```

## Data Flow

### Flat BOM Flow

```
User uploads file
    ↓
flat-bom.js: handleFileUpload()
    ↓
parser.js: parseCSV() or parseXML() → returns row array
    ↓
tree.js: buildTree(rows) → returns root BOMNode
    ↓
State: store tree + metadata
    ↓
flatten.js: flattenBOM(root, unitQty) → returns flat item array
    ↓
flatten.js: sortBOM(items) → sorted array
    ↓
flat-bom.js: displayFlatResults() → renders table
    ↓
User clicks Export Excel
    ↓
excel.js: exportFlatExcel() → downloads file
```

### Comparison Flow

```
User uploads two files
    ↓
comparison.js: handleTwoBOMsUpload()
    ↓
parser.js: parseCSV/XML for both → row arrays
    ↓
tree.js: buildTree() for both → two root nodes
    ↓
State: store both trees
    ↓
flatten.js: flattenBOM() for both → two flat arrays
    ↓
compare.js: compareBOMs(oldFlat, newFlat) → comparison results
    ↓
comparison.js: displayComparison() → renders with filters
    ↓
User clicks Export
    ↓
excel.js or html.js: export functions
```

### Scoped Comparison Flow (Enhancement 1)

```
After loading both BOMs
    ↓
comparison.js: displayTreeSelection() → renders two selection trees
    ↓
User clicks item in tree
    ↓
tree.js: findNodeByPartNumber() → locate node
    ↓
tree.js: extractSubtree() → clone subtree with Qty=1 at root
    ↓
flatten.js: flattenBOM() on subtrees → scoped flat arrays
    ↓
compare.js: compareBOMs() → scoped comparison results
    ↓
Display results with scope annotation
```

### State Flow Direction

**Unidirectional:** User action → Core processing → State update → UI render

**Anti-pattern to avoid:** UI modules should never directly call other UI modules' functions. Communication happens through state changes.

## Global State Management

### Current State (Monolithic)

```javascript
// ~20 global variables scattered throughout script tag
let csvData = null;
let flattenedBOM = null;
let oldBomData = null;
let newBomData = null;
let oldBomTree = null;
let newBomTree = null;
// ... 14 more
```

### Proposed State Module (state.js)

```javascript
// state.js
const appState = {
    // Flat BOM tab
    flatBOM: {
        csvData: null,
        tree: null,
        flattened: null,
        rootInfo: { partNumber: null, revision: null, description: null },
        filename: null
    },

    // Comparison tab
    comparison: {
        oldBOM: {
            data: null,
            tree: null,
            flattened: null,
            rootInfo: {},
            filename: null
        },
        newBOM: {
            data: null,
            tree: null,
            flattened: null,
            rootInfo: {},
            filename: null
        },
        results: [],
        filter: 'all', // 'all', 'Added', 'Removed', 'Changed'
        scopedNodes: {
            old: null,
            new: null
        }
    },

    // Hierarchy View tab
    hierarchy: {
        tree: null,
        rootInfo: {},
        filename: null,
        expandedNodes: new Set() // Track which nodes are expanded
    }
};

export function getState(path) {
    // e.g., getState('comparison.filter') returns 'all'
    if (!path) return appState;
    return path.split('.').reduce((obj, key) => obj?.[key], appState);
}

export function setState(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], appState);
    target[lastKey] = value;
}

export function resetState(tab = null) {
    if (!tab) {
        // Reset all
        Object.keys(appState).forEach(key => {
            if (typeof appState[key] === 'object') {
                resetState(key);
            }
        });
    } else {
        // Reset specific tab state
        // ... implementation
    }
}
```

**Benefits:**
- Single source of truth
- Easier debugging (inspect one object)
- Clearer dependencies (imports `state.js`)
- Enables future state persistence (localStorage)

**Migration strategy:** Extract state module early (after core utilities), update one UI module at a time to use it.

## Extraction Order (Step-by-Step)

**Critical principle:** Extract in **topological order**—leaves first, dependencies last.

### Phase 1: CSS Extraction (LOW RISK)

**What:** Move `<style>` block to external file
**Why first:** Zero dependencies, immediate file size reduction, no JS implications
**Validation:** Visual inspection (refresh page, verify styling intact)

```bash
# Step
1. Copy lines 7-847 to css/styles.css
2. Replace <style> block with <link rel="stylesheet" href="css/styles.css">
3. Test in browser
```

**Estimated time:** 15 minutes

### Phase 2: Pure Utility Functions (LOW RISK)

**What:** Extract zero-dependency utility functions to `js/core/utils.js`

**Functions to extract:**
- `parseLength()` (lines ~1232-1242)
- `getParentLevel()` (lines ~1542-1547)
- `getCompositeKey()` (lines ~1590-1594)
- `decimalToFractional()` (lines ~1645-1672)

**Why early:** No dependencies, widely used, easy to test in isolation

**Migration pattern:**
```javascript
// utils.js
export function parseLength(lengthStr) { /* ... */ }
export function getParentLevel(level) { /* ... */ }
export function getCompositeKey(partNumber, length) { /* ... */ }
export function decimalToFractional(decimal) { /* ... */ }

// index.html <script type="module">
import { parseLength, getParentLevel, getCompositeKey, decimalToFractional } from './js/core/utils.js';
// Replace function definitions with imports
// All call sites remain unchanged (function names same)
```

**Validation:** Test harness should pass (it already extracts these functions independently)

**Estimated time:** 30 minutes

### Phase 3: BOMNode Class and Tree Building (MEDIUM RISK)

**What:** Extract tree-related functions to `js/core/tree.js`

**Extract:**
- `BOMNode` class (lines ~1463-1478)
- `buildTree()` (lines ~1502-1573)
- `findNodeByPartNumber()` (lines ~2424-2433)
- `extractSubtree()` (lines ~2434-2454)

**Dependencies:** Imports `utils.js` (parseLength, getParentLevel)

**Tricky part:** `buildTree()` currently sets global `rootPartNumber`, `rootRevision`, `rootDescription`. Must refactor to return this data.

```javascript
// tree.js
export function buildTree(rows) {
    // ... same logic ...
    return {
        root,
        rootInfo: {
            partNumber: root.partNumber,
            revision: root.revision,
            description: root.description
        }
    };
}

// Call sites update from:
const root = buildTree(rows);
// To:
const { root, rootInfo } = buildTree(rows);
```

**Validation:** Test harness (update to use new return structure)

**Estimated time:** 1 hour

### Phase 4: File Parsers (MEDIUM RISK)

**What:** Extract `js/core/parser.js`

**Extract:**
- `parseCSV()` (lines ~1285-1364)
- `parseXML()` (lines ~1367-1460)

**Dependencies:** None from our code (uses SheetJS global and DOMParser)

**Special consideration:** These are ~300 lines combined. Large file but low complexity.

**Validation:** Test harness parsers match extracted versions

**Estimated time:** 45 minutes

### Phase 5: Core Algorithms (MEDIUM RISK)

**What:** Extract `js/core/flatten.js` and `js/core/compare.js`

**flatten.js extracts:**
- `flattenBOM()` (lines ~1584-1642)
- `sortBOM()` (lines ~1674-1693)

**compare.js extracts:**
- `compareBOMs()` (lines ~2696-2791)
- `createDiff()` (lines ~2794-2828)

**Dependencies:** Both import `tree.js` and `utils.js`

**Validation:** Test harness validates flattening and comparison logic

**Estimated time:** 1 hour

### Phase 6: State Management (HIGH RISK)

**What:** Create `js/ui/state.js` and refactor global variables

**Why risky:** Touches every part of codebase. Must be done carefully.

**Strategy:**
1. Create state.js with structure shown above
2. Update one tab at a time:
   - Flat BOM tab first (simplest)
   - Hierarchy tab second
   - Comparison tab last (most complex)
3. For each tab:
   - Replace `let variable = null` with `setState('tab.variable', null)`
   - Replace `variable` reads with `getState('tab.variable')`
   - Test tab thoroughly before moving to next

**Validation:** All three tabs work independently. Switching between tabs preserves state.

**Estimated time:** 3 hours

### Phase 7: UI Module Extraction (HIGH RISK)

**What:** Extract tab-specific UI code to separate modules

**Order:**
1. `js/ui/tabs.js` (tab switching logic)
2. `js/ui/flat-bom.js` (Flat BOM tab)
3. `js/ui/hierarchy.js` (Hierarchy View tab)
4. `js/ui/comparison.js` (Comparison tab, most complex)

**For each UI module:**
- Identify all DOM manipulation code for that tab
- Identify event handlers specific to that tab
- Export `init<TabName>()` function that sets up event listeners
- Import dependencies (core modules, state module)

**Pattern:**
```javascript
// js/ui/flat-bom.js
import { parseCSV, parseXML } from '../core/parser.js';
import { buildTree } from '../core/tree.js';
import { flattenBOM, sortBOM } from '../core/flatten.js';
import { getState, setState } from './state.js';

export function initFlatBOM() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('csvFile');
    // ... set up all event listeners
    uploadZone.addEventListener('click', () => fileInput.click());
    // ...
}

function handleFileUpload(file) {
    // File handling logic
}

function displayResults() {
    // Rendering logic
}
```

**Validation:** Each tab tested in isolation. All features work.

**Estimated time:** 5 hours (most time-consuming phase)

### Phase 8: Export Module Extraction (MEDIUM RISK)

**What:** Extract `js/export/excel.js` and `js/export/html.js`

**Extract:**
- All `exportExcel()` functions
- All `exportHtml()` functions

**Dependencies:** Import core modules and SheetJS global

**Note:** Export functions are called from UI modules, so UI modules must import export functions.

**Validation:** Export Excel and HTML from all three tabs

**Estimated time:** 1.5 hours

### Phase 9: Entry Point Consolidation (LOW RISK)

**What:** Create `js/main.js` that imports and initializes all modules

**Content:**
```javascript
import { initTabs } from './ui/tabs.js';
import { initFlatBOM } from './ui/flat-bom.js';
import { initComparison } from './ui/comparison.js';
import { initHierarchy } from './ui/hierarchy.js';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initFlatBOM();
    initComparison();
    initHierarchy();
});
```

**index.html becomes:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BOM Tool 2.1</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- ~300 lines of HTML structure only -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

**Validation:** Full application test (all tabs, all features)

**Estimated time:** 30 minutes

### Phase 10: Cleanup and Verification (LOW RISK)

**What:** Remove old monolithic file, verify all tests pass

**Steps:**
1. Run full test suite
2. Manual testing of all features
3. Archive old `index.html` as `index-monolithic-archive.html`
4. Update documentation

**Estimated time:** 1 hour

**Total estimated time:** ~15 hours of focused work

## Test Harness Adaptation

### Current State (test/run-tests.js)

The test harness **already demonstrates the modular pattern**:
- Extracts core functions from HTML file (lines 18-339)
- Runs validation tests against baseline Excel outputs
- Uses ES6 modules (import/export syntax)

**Key observation:** The test harness proves that extraction is feasible. It's already running the same code independently.

### Adaptation Strategy

**Phase-by-phase updates:**

| Refactoring Phase | Test Harness Change | Validation |
|-------------------|---------------------|------------|
| Phase 2: Utils | Replace extracted functions with imports from `js/core/utils.js` | Tests pass unchanged |
| Phase 3: Tree | Replace BOMNode/buildTree with imports from `js/core/tree.js` | Tests pass with new return structure |
| Phase 4: Parser | Replace parseCSV/parseXML with imports from `js/core/parser.js` | Tests pass unchanged |
| Phase 5: Core algorithms | Replace flattenBOM/compareBOMs with imports from core modules | Tests pass unchanged |

**Final test harness structure:**
```javascript
// test/run-tests.js
import { parseLength, getCompositeKey, decimalToFractional } from '../js/core/utils.js';
import { parseCSV, parseXML } from '../js/core/parser.js';
import { BOMNode, buildTree, findNodeByPartNumber, extractSubtree } from '../js/core/tree.js';
import { flattenBOM, sortBOM } from '../js/core/flatten.js';
import { compareBOMs } from '../js/core/compare.js';

// Remove all "EXTRACTED FUNCTIONS" section (lines 18-339)
// Keep only test logic (lines 340-789)
```

**Benefit:** Test harness becomes 450 lines instead of 790 lines. Proves modules work in Node.js context.

### Continuous Validation

**Run tests after each phase:**
```bash
cd test
node run-tests.js
```

**Expected result:** All 4 tests pass at every phase.

**If tests fail:** Rollback that phase's changes, fix issue, retry.

## Build Order and Dependencies

### No Build Tools Initially

**Rationale:** Modern browsers support ES6 modules natively. Avoid complexity during refactoring.

**Module loading:**
```html
<!-- index.html -->
<script type="module" src="js/main.js"></script>
```

Browser automatically resolves imports, maintaining dependency order.

### Dependency Resolution

**ES6 module system handles topological ordering automatically:**
- When `main.js` imports `flat-bom.js`
- Which imports `flatten.js`
- Which imports `tree.js`
- Which imports `utils.js`
- Browser loads `utils.js` first, then `tree.js`, then `flatten.js`, etc.

**No manual load order management needed.**

### Future Build Tool Consideration

**When to add bundler (webpack, rollup, esbuild):**
- When deploying to environments requiring older browser support
- When optimizing for production (minification, tree-shaking)
- When adding TypeScript or JSX

**For now:** YAGNI principle. Don't add build complexity until needed.

## Anti-Patterns to Avoid

### 1. Extracting in Wrong Order (Root Before Leaves)

**Bad:**
```
Step 1: Extract main.js (depends on everything)
Step 2: Extract UI modules (depend on core)
Step 3: Extract core modules (no dependencies)
```

**Why bad:** Step 1 fails because dependencies don't exist yet.

**Good:** Extract in reverse order (leaves first, shown in Phase 1-9 above).

### 2. Creating Circular Dependencies

**Bad:**
```javascript
// flatten.js
import { displayResults } from '../ui/flat-bom.js';

export function flattenBOM(root) {
    const result = /* ... */;
    displayResults(result); // Core module calling UI module!
    return result;
}

// flat-bom.js
import { flattenBOM } from '../core/flatten.js'; // Circular!
```

**Why bad:** ES6 modules don't support circular dependencies well. Leads to undefined imports.

**Good:** Core modules return data, never call UI functions. UI modules orchestrate.

### 3. Hidden Global State in Modules

**Bad:**
```javascript
// parser.js
let lastParsedFilename = null; // Module-scoped state

export function parseCSV(text) {
    lastParsedFilename = 'unknown.csv'; // Side effect!
    // ...
}
```

**Why bad:** Makes testing difficult, hides dependencies, causes bugs when used from multiple contexts.

**Good:** Pure functions or explicit state management (state.js).

### 4. Giant Barrel Exports

**Bad:**
```javascript
// index.js
export * from './core/utils.js';
export * from './core/parser.js';
export * from './core/tree.js';
export * from './core/flatten.js';
export * from './core/compare.js';
// Now everything is one giant import surface

// Usage
import { parseCSV, flattenBOM, BOMNode, getCompositeKey } from './core/index.js';
// Pulls in ALL core modules even if only using parseCSV
```

**Why bad:** Defeats tree-shaking, increases bundle size, obscures dependencies.

**Good:** Import from specific modules: `import { parseCSV } from './core/parser.js'`

### 5. Mixing HTML in JS Modules

**Bad:**
```javascript
// flat-bom.js
export function initFlatBOM() {
    document.body.innerHTML += `
        <div id="flatBOMTab">
            <h2>Flat BOM</h2>
            <!-- 200 lines of HTML -->
        </div>
    `;
}
```

**Why bad:** Mixing concerns. HTML should live in index.html.

**Good:** HTML structure in index.html, JS only manipulates existing DOM elements.

### 6. Premature Abstraction

**Bad (during refactoring):**
```javascript
// Let's create a generic BaseTab class and TabFactory pattern!
class BaseTab { /* ... */ }
class TabFactory { /* ... */ }
```

**Why bad during refactoring:** Adds complexity and risk. Refactoring goal is extraction, not redesign.

**Good:** Extract with minimal changes first. Refactor patterns later in a separate phase.

## Performance Considerations

### Module Loading Performance

**Concern:** Does splitting into 12+ modules slow initial load?

**Reality:**
- HTTP/2 multiplexing means multiple small files load in parallel
- Browser cache works at file granularity (changing one module doesn't invalidate all cached code)
- ES6 module preloading: `<link rel="modulepreload" href="js/core/utils.js">`

**Measurement:** Use browser DevTools Network tab to profile before/after.

**Expected:** Negligible difference (<100ms) for local files. May be faster due to caching.

### Runtime Performance

**Concern:** Do module imports add overhead?

**Reality:**
- Module imports are resolved once at load time, not on every function call
- No runtime overhead vs. functions in same file
- Modern JS engines optimize module boundaries away

**Validation:** Test harness execution time should remain constant.

### Future Optimization

**If needed (unlikely):**
- Bundle for production with rollup/esbuild (single optimized file)
- Keep modular source for development
- Use same test harness to validate bundled output

## Migration Risk Assessment

| Phase | Risk Level | Impact if Failed | Mitigation |
|-------|-----------|------------------|------------|
| CSS Extraction | LOW | Visual only | Easy rollback, visual inspection |
| Utils Extraction | LOW | Test failures | Test harness validates immediately |
| Tree Extraction | MEDIUM | Core functionality broken | Careful testing, git commits per phase |
| Parser Extraction | MEDIUM | File loading fails | Test with real XML/CSV files |
| Algorithm Extraction | MEDIUM | Wrong results | Test harness catches discrepancies |
| State Management | HIGH | State corruption, crashes | Incremental (one tab at a time) |
| UI Module Extraction | HIGH | Features stop working | Test each tab thoroughly, git commits |
| Export Extraction | MEDIUM | Export functions fail | Test all export formats |
| Entry Point | LOW | Initialization fails | Straightforward, low complexity |
| Cleanup | LOW | Documentation | No code changes |

**Overall risk mitigation:**
- Git commit after each phase passes tests
- Test harness validates correctness throughout
- Rollback available at every step
- Incremental approach (don't extract everything at once)

## Success Metrics

### Technical Metrics

- [ ] All 4 validation tests pass
- [ ] No circular dependencies (verify with dependency graph tool)
- [ ] Each module <500 lines (current largest: comparison.js ~600 lines)
- [ ] Zero global variables in window scope (except XLSX from CDN)
- [ ] All modules use ES6 import/export syntax
- [ ] Browser console shows no errors

### Developer Experience Metrics

- [ ] Claude Code can read entire module in one file read (no scrolling 4400 lines)
- [ ] File names clearly indicate purpose (flat-bom.js, not module3.js)
- [ ] Editing export logic doesn't require loading comparison logic
- [ ] Adding new feature requires touching 1-2 modules, not monolithic file
- [ ] Git diffs are clearer (changes to specific modules, not "line 2347 of index.html")

### Functional Metrics

- [ ] All three tabs work
- [ ] File upload (CSV and XML) works
- [ ] BOM flattening produces correct results
- [ ] BOM comparison produces correct results
- [ ] Scoped comparison works
- [ ] Excel export works (all three tabs)
- [ ] HTML export works (all three tabs)
- [ ] Tree expansion/collapse works
- [ ] Filter buttons work in comparison tab

## Maintenance Implications

### Before Refactoring

**To add a new feature:**
1. Open 4400-line index.html
2. Find relevant section (search, scroll)
3. Make changes carefully to avoid breaking unrelated code
4. Test entire application (risk of side effects)

**To fix a bug:**
1. Find bug location in 4400 lines
2. Understand surrounding context
3. Fix carefully
4. Test everything

### After Refactoring

**To add a new feature:**
1. Identify affected modules (1-2 files, <500 lines each)
2. Open only relevant files
3. Make changes with clear boundaries
4. Test affected feature (reduced blast radius)

**To fix a bug:**
1. Module name indicates location (e.g., "comparison bug" → js/ui/comparison.js)
2. Read focused 600-line file, not 4400-line file
3. Fix with confidence (dependencies are explicit)
4. Test affected feature

### For AI Coding Assistants

**Before:** "Read index.html" → 4400 lines in context window, diluted focus

**After:** "Read js/core/flatten.js" → 150 lines, focused context, accurate suggestions

**Benefit multiplier:** Claude Code is more effective with smaller, focused files. This refactoring is optimized for AI-assisted development.

## Appendix: Dependency Graph Visualization

```
                   index.html
                       |
                    main.js
                       |
        +--------------+--------------+
        |              |              |
    tabs.js      flat-bom.js   comparison.js   hierarchy.js
        |              |              |              |
        +----------- state.js --------+              |
                       |                             |
                       |                             |
        +--------------+--------------+--------------+
        |              |              |              |
    flatten.js    compare.js     parser.js      excel.js  html.js
        |              |              |              |       |
        +----------tree.js------------|              |       |
                       |                             |       |
                   utils.js -----------------------+-+-------+

External Dependencies (not in diagram):
  - SheetJS (xlsx.js) via CDN → used by excel.js and parser.js
  - DOMParser (browser native) → used by parser.js
  - Google Fonts → loaded in index.html
```

**Key:** Arrows point from dependent to dependency (e.g., flatten.js depends on tree.js).

## Sources

Research based on 2026 best practices for JavaScript modular architecture and refactoring:

- [JavaScript Modules in 2026: Practical Patterns with CommonJS and ES Modules – TheLinuxCode](https://thelinuxcode.com/javascript-modules-in-2026-practical-patterns-with-commonjs-and-es-modules/)
- [How I Built a Modular Frontend Architecture Using JavaScript: From Spaghetti to Scalable](https://jdavidsmith.medium.com/how-i-built-a-modular-frontend-architecture-using-javascript-from-spaghetti-to-scalable-885c3946e524)
- [Why Developers Are Returning to Vanilla JavaScript](https://talent500.com/blog/developers-ditching-frameworks-for-vanilla-javascript/)
- [State Management in Vanilla JS: 2026 Trends | by Chirag Dave | Medium](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)
- [Modern State Management in Vanilla JavaScript: 2026 Patterns and Beyond | by Orami | Medium](https://medium.com/@orami98/modern-state-management-in-vanilla-javascript-2026-patterns-and-beyond-ce00425f7ac5)
- [Best Practices for JavaScript Modularization - DEV Community](https://dev.to/omriluz1/best-practices-for-javascript-modularization-22b6)
- [JavaScript modules - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html)
- [How Webpack uses dependency graph to build modules - DEV Community](https://dev.to/jasmin/how-dependancy-graph-in-webpack-resolve-module-dependency-5ej4)

---

*Architecture research complete. Ready for roadmap creation.*
