# Technology Stack: Monolithic-to-Modular Refactoring

**Project:** BOM Tool 2.1
**Researched:** 2026-02-07
**Context:** Splitting 4400-line single-file HTML/CSS/JS app into multiple files WITHOUT build tools

## Executive Summary

**Recommended Approach:** Native ES modules with type="module" script tags, served via GitHub Pages over HTTP/2.

**Confidence Level:** HIGH (verified with MDN official documentation and 2025/2026 industry sources)

**Key Decision:** Native browser ES modules are production-ready in 2025. All modern browsers support them without transpilation. GitHub Pages supports HTTP/2, making multiple file loading performant. No build tools required.

---

## Recommended Stack

### Core Architecture
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **ES Modules (native)** | ES6+ | Module system | Universal browser support, zero dependencies, deferred loading automatic |
| **HTTP/2** | N/A (GitHub Pages default) | Multi-file delivery | Eliminates old HTTP/1.1 penalty for multiple requests via multiplexing |
| **Native JavaScript** | ES6+ | Core logic | Already in use, no migration needed |
| **Vanilla CSS** | CSS3 | Styling | No preprocessor needed for this project scope |

### Script Loading Strategy
| Approach | Use Case | Implementation |
|----------|----------|----------------|
| `<script type="module">` | Main application entry point | `<script type="module" src="js/main.js"></script>` |
| `import { fn } from './module.js'` | Module dependencies | ES6 import syntax with explicit .js extensions |
| `<script nomodule>` | Fallback for old browsers | Optional: load legacy bundle for IE11 (not recommended for 2026) |

### File Organization
| Component | File Structure | Rationale |
|-----------|---------------|-----------|
| HTML | `index.html` (shell only) | Minimal: load CSS, load module entry point |
| CSS | `css/main.css` or split into 3-5 logical files | HTTP/2 makes multiple files viable; start with single file for simplicity |
| JavaScript | `js/main.js` + modular files by feature | ES modules with explicit imports |
| External libs | CDN (SheetJS) | No change; already using CDN |

---

## Module System Deep Dive

### Native ES Modules (HIGH Confidence)

**What:**
- Browser-native import/export system
- No transpilation or bundling required
- Automatic deferred execution (like `defer` attribute)
- Single execution guarantee (modules run once even if imported multiple times)

**How to Use:**

**1. HTML Entry Point:**
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <!-- UI markup -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

**2. Main Module (js/main.js):**
```javascript
// Import with explicit .js extensions (required for browser modules)
import { parseCSV, parseXML } from './parsers.js';
import { buildTree, flattenBOM } from './bom-processing.js';
import { exportToExcel } from './export.js';

// Module-level code runs once on load
console.log('BOM Tool initialized');

// Export functions for use by other modules if needed
export function initApp() {
    // Setup event listeners, etc.
}
```

**3. Feature Modules (js/parsers.js):**
```javascript
// Named exports
export function parseCSV(data) {
    // Implementation
}

export function parseXML(xmlString) {
    // Implementation
}

// Private to this module (not exported)
function helperFunction() {
    // Only accessible within this file
}
```

**Browser Support:** All modern browsers (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+) support ES modules natively. As of 2025, this represents 97%+ of global browser usage.

**Source:** [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

---

## Global State Management

### Problem
Current code uses global variables declared at top of script:
```javascript
let csvData = null;
let flattenedBOM = null;
let rootPartNumber = null;
// ... etc
```

When split into modules, each module has its own scope. Global variables won't work.

### Solution: Centralized State Module (HIGH Confidence)

**Approach:** Create a state module that exports a state object. Import this module wherever state access is needed.

**Implementation:**

**js/state.js:**
```javascript
// Centralized application state
export const state = {
    // Flat BOM Tab
    csvData: null,
    flattenedBOM: null,
    rootPartNumber: null,
    rootRevision: null,
    rootDescription: null,
    uploadedFilename: null,

    // BOM Comparison Tab
    oldBomData: null,
    newBomData: null,
    oldBomFlattened: null,
    newBomFlattened: null,
    oldBomInfo: {},
    newBomInfo: {},
    comparisonResults: [],
    currentFilter: 'all',

    // Scoped Comparison
    oldBomTree: null,
    newBomTree: null,
    oldSelectedNode: null,
    newSelectedNode: null,

    // Hierarchy View Tab
    hierarchyTree: null,
    hierarchyRootInfo: {},
    hierarchyFilename: null
};

// Optional: Add state update helpers for debugging
export function updateState(updates) {
    Object.assign(state, updates);
    console.debug('State updated:', updates);
}

// Optional: Reset functions
export function resetFlatBOMState() {
    state.csvData = null;
    state.flattenedBOM = null;
    state.rootPartNumber = null;
    // ... etc
}
```

**Usage in other modules:**
```javascript
import { state } from './state.js';

export function processCSV(rawData) {
    state.csvData = parseData(rawData);
    state.rootPartNumber = extractRootPN(state.csvData);
}
```

**Why This Works:**
- Object references are shared across imports (same object in memory)
- Mutating object properties works across all modules
- Simple, no library needed
- Debuggable (can log state changes)

**Alternative: Proxy-Based State (MEDIUM Confidence)**

For more sophisticated state management with change detection:

```javascript
// js/state.js
const _state = { /* initial state */ };

const listeners = [];

export const state = new Proxy(_state, {
    set(target, property, value) {
        const oldValue = target[property];
        target[property] = value;

        // Notify listeners
        listeners.forEach(fn => fn(property, value, oldValue));

        return true;
    }
});

export function subscribe(listener) {
    listeners.push(listener);
}
```

**Recommendation:** Start with simple shared object. Add Proxy only if you need reactive UI updates.

**Source:** [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)

---

## CSS Organization

### Current State
- ~840 lines embedded in `<style>` tag in index.html
- CSS custom properties in `:root`
- Card-based layout system
- Print media queries

### Recommended Approach: Start Simple, Split Later (HIGH Confidence)

**Phase 1: Single External File**
```html
<link rel="stylesheet" href="css/main.css">
```

**Why:**
- Simplest migration (cut/paste from `<style>` block)
- HTTP/2 makes multiple CSS files viable, but single file is fine for ~840 lines
- No change to CSS syntax or organization
- Browser caching works immediately

**Phase 2 (Optional): Split by Concern**

If CSS grows or you want better organization:

```html
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/tables.css">
<link rel="stylesheet" href="css/print.css" media="print">
```

**File Structure:**
- `variables.css` - CSS custom properties (`:root` block)
- `layout.css` - Grid, cards, page structure
- `components.css` - Buttons, inputs, tabs
- `tables.css` - Table styling, scrollable containers
- `print.css` - Print-specific overrides

**Why Multiple Files Work in 2025:**
- HTTP/2 multiplexing eliminates old "combine everything" rule
- Better caching (changing one component only invalidates that file)
- Easier navigation for developers
- GitHub Pages serves all requests over HTTP/2

**Performance Impact:** Negligible. Modern testing shows 5-10 CSS files perform identically to one combined file on HTTP/2. Going beyond 30-50 files can degrade performance due to compression inefficiency.

**Recommendation:** Start with single `main.css`. Split only if organization becomes a problem (it probably won't for 840 lines).

**Sources:**
- [Should you combine CSS and JavaScript files in 2025?](https://teamupdraft.com/blog/combine-css-javascript-files/)
- [Managing CSS & JS in an HTTP/2 World](https://www.viget.com/articles/managing-css-js-http-2)

---

## Script Loading: defer vs async vs module

### Quick Reference (HIGH Confidence)

| Attribute | Download | Execution | Order | Use Case |
|-----------|----------|-----------|-------|----------|
| (none) | Blocks parsing | Immediate | In order | Critical inline scripts |
| `defer` | Parallel | After parsing | In order | DOM-dependent scripts with dependencies |
| `async` | Parallel | ASAP (blocks) | No guarantee | Independent scripts (analytics, ads) |
| `type="module"` | Parallel | After parsing | In order | ES modules (automatic defer behavior) |

### Recommendations for This Project

**Primary Approach: ES Modules**
```html
<script type="module" src="js/main.js"></script>
```

**Why:**
- Automatic deferred execution (runs after DOM parsed)
- Maintains execution order across imports
- No need for `defer` attribute (modules defer by default)
- Strict mode automatic
- Module scope prevents global pollution

**External Libraries (CDN):**
```html
<!-- SheetJS - must load before modules that use it -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

<!-- Your module code -->
<script type="module" src="js/main.js"></script>
```

**Key Rule:** External libraries (SheetJS) must load BEFORE module scripts that depend on them, because module scripts execute after parsing but external libraries might need `defer` or manual ordering.

**Better approach for clarity:**
```html
<script defer src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script type="module" src="js/main.js"></script>
```

Both `defer` scripts and `type="module"` scripts execute after parsing in document order, so SheetJS will be available when main.js runs.

**Sources:**
- [MDN - script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [Async vs Defer vs Module: The Ultimate Guide](https://medium.com/web-tech-journals/mastering-javascript-loading-async-defer-and-module-attributes-for-optimal-web-performance-af88d1362f37)

---

## GitHub Pages Deployment

### Good News: No Changes Required (HIGH Confidence)

**What Works Out of Box:**
- HTTP/2 support (automatic for all HTTPS requests)
- ES modules (just static file serving)
- Multiple CSS files via `<link>` tags
- Multiple JS files via `import` statements
- No build process needed

**File Structure on GitHub:**
```
bom-tool/
├── index.html          # Shell with script/link tags
├── css/
│   └── main.css        # Extracted CSS
├── js/
│   ├── main.js         # Entry point (type="module")
│   ├── state.js        # Global state
│   ├── parsers.js      # CSV/XML parsing
│   ├── bom-processing.js  # Tree building, flattening
│   ├── comparison.js   # BOM comparison logic
│   ├── hierarchy.js    # Hierarchy view logic
│   ├── export.js       # Excel/HTML export
│   └── ui.js           # DOM manipulation, event handlers
├── test/               # Test harness (no change)
└── test-data/          # Test files (no change)
```

**Deployment Process:**
1. Push code to `main` branch
2. GitHub Pages automatically serves at `https://[username].github.io/bom-tool/`
3. All paths must be relative or absolute from repo root
4. ES module imports work automatically

**Important Path Rules:**
- Module imports use relative paths: `import { x } from './state.js'`
- Always include `.js` extension (required for browser modules)
- CSS links can use relative: `<link rel="stylesheet" href="css/main.css">`
- For subdirectories, use `../` to go up: `import { x } from '../utils.js'`

**CORS Considerations:**
- Same-origin policy applies (all files served from github.io domain)
- External CDN resources (SheetJS) work via CORS headers
- No issues for static file serving

**Local Development:**
- Must use local server (not `file://` protocol)
- Simple option: `python -m http.server` or VS Code Live Server
- ES modules require HTTP(S) for security (CORS restrictions on file://)

**Source:** [GitHub Pages - ES modules discussion](https://github.com/orgs/community/discussions/112227)

---

## Proposed File Organization

### Recommended Structure (HIGH Confidence)

**Goal:** ~8-12 JavaScript files, each 300-500 lines. Focused, navigable, maintainable.

```
js/
├── main.js                 # Entry point, app initialization (~150 lines)
├── state.js                # Global state object (~100 lines)
├── bom-node.js             # BOMNode class definition (~50 lines)
├── parsers.js              # parseCSV, parseXML (~400 lines)
├── tree-builder.js         # buildTree, getParentLevel (~200 lines)
├── flattening.js           # flattenBOM, aggregation logic (~300 lines)
├── comparison.js           # compareBOMs, diff logic (~400 lines)
├── hierarchy.js            # Hierarchy view rendering (~400 lines)
├── export-excel.js         # Excel export functions (~300 lines)
├── export-html.js          # HTML export functions (~300 lines)
├── ui-flat-bom.js          # Flat BOM tab UI (~300 lines)
├── ui-comparison.js        # Comparison tab UI (~400 lines)
├── ui-hierarchy.js         # Hierarchy tab UI (~300 lines)
└── utils.js                # Shared utilities (date formatting, etc.) (~150 lines)
```

**Total:** ~3650 lines across 14 files (vs 3200 lines in one file currently)

**Module Dependencies (import graph):**
```
main.js
  ├─> state.js
  ├─> ui-flat-bom.js
  │     ├─> state.js
  │     ├─> parsers.js
  │     ├─> tree-builder.js
  │     ├─> flattening.js
  │     ├─> export-excel.js
  │     └─> export-html.js
  ├─> ui-comparison.js
  │     ├─> state.js
  │     ├─> parsers.js
  │     ├─> tree-builder.js
  │     ├─> flattening.js
  │     ├─> comparison.js
  │     ├─> export-excel.js
  │     └─> export-html.js
  └─> ui-hierarchy.js
        ├─> state.js
        ├─> parsers.js
        ├─> tree-builder.js
        ├─> hierarchy.js
        ├─> export-excel.js
        └─> export-html.js

parsers.js ──> bom-node.js
tree-builder.js ──> bom-node.js
flattening.js ──> bom-node.js
hierarchy.js ──> bom-node.js

All modules can import utils.js as needed
```

### Migration Strategy

**Phase 1: Extract CSS**
- Move `<style>` content to `css/main.css`
- Replace with `<link>` tag
- Test (should work immediately)

**Phase 2: Create Module Shell**
- Create `js/main.js` with empty module structure
- Add `<script type="module" src="js/main.js"></script>`
- Test module loading (console.log in main.js)

**Phase 3: Extract State**
- Create `js/state.js` with all global variables
- Import state in main.js
- Test state access works

**Phase 4: Extract Classes**
- Move `BOMNode` class to `js/bom-node.js`
- Export class, import where needed
- Test tree building still works

**Phase 5: Extract Core Logic (iterative)**
- One feature at a time:
  1. Parsers (CSV/XML)
  2. Tree builder
  3. Flattening
  4. Comparison
  5. Hierarchy
  6. Export functions
- Test after each extraction

**Phase 6: Extract UI Handlers**
- Split UI code by tab
- Event listener setup in main.js
- Handler functions in tab-specific modules

**Phase 7: Validation**
- Run full test suite
- Manual testing of all features
- Compare Excel outputs to baseline

---

## What NOT to Do

### 1. Do NOT Use Build Tools (HIGH Confidence)

**Avoid:**
- Webpack, Rollup, Vite, Parcel
- Babel transpilation
- TypeScript compilation
- PostCSS/SASS preprocessing

**Why:**
- Adds complexity for zero-coding-experience owner
- Native ES modules work without build step
- GitHub Pages serves static files; no build needed
- Maintenance burden of Node.js dependencies
- npm security vulnerabilities to manage

**Exception:** If you later want minification for production, use a simple build step ONLY for production. Keep development workflow build-free.

### 2. Do NOT Use Bundlers for This Project (HIGH Confidence)

**Avoid:**
- Concatenating all JS into single bundle
- Tree-shaking or dead code elimination
- Code splitting by route

**Why:**
- HTTP/2 makes bundling unnecessary for ~10-15 files
- Debugging is harder with bundled code
- Browser DevTools work perfectly with source modules
- Incremental caching works better with multiple files

**Exception:** If app grows to 50+ modules or performance degrades measurably, reconsider.

### 3. Do NOT Use Bare Import Specifiers (MEDIUM Confidence)

**Avoid:**
```javascript
import { something } from 'my-module';  // ❌ Bare specifier
```

**Why:**
- Browsers require full paths or relative paths
- Bare specifiers need import maps (newer feature, requires config)
- Relative paths work everywhere: `import { x } from './my-module.js'`

**Use:**
```javascript
import { something } from './my-module.js';  // ✅ Relative path
import { another } from '../utils/helper.js';  // ✅ Relative with directory
```

**Exception:** Import maps are supported in modern browsers (2023+), but add complexity. Use relative paths for simplicity.

### 4. Do NOT Skip `.js` Extensions (HIGH Confidence)

**Avoid:**
```javascript
import { parse } from './parsers';  // ❌ No extension
```

**Why:**
- Browsers require explicit `.js` extension for ES modules
- Node.js allows omitting extensions; browsers don't
- Build tools auto-resolve extensions; browsers don't

**Use:**
```javascript
import { parse } from './parsers.js';  // ✅ Explicit extension
```

**Source:** [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### 5. Do NOT Use Dynamic Imports for Core Features (MEDIUM Confidence)

**Avoid:**
```javascript
button.addEventListener('click', async () => {
    const module = await import('./feature.js');  // ❌ For core features
    module.doSomething();
});
```

**Why:**
- Core BOM processing features are always needed
- Dynamic imports add loading delay
- More complex error handling
- No benefit for small app with all features visible

**Use Static Imports:**
```javascript
import { doSomething } from './feature.js';  // ✅ Loaded upfront

button.addEventListener('click', () => {
    doSomething();  // Available immediately
});
```

**Exception:** Dynamic imports are useful for truly optional features (e.g., a tutorial overlay, optional plugin). Not applicable to this BOM tool where all three tabs are always present.

### 6. Do NOT Convert to TypeScript (MEDIUM Confidence)

**Avoid:**
- Migrating from `.js` to `.ts` files
- Adding TypeScript compiler to workflow

**Why:**
- Requires build step (tsc compilation)
- Owner has zero coding experience (types add learning curve)
- Project is validated and working; low benefit
- JavaScript + JSDoc comments provide type hints in VS Code without compilation

**Alternative:**
Use JSDoc comments for type documentation:
```javascript
/**
 * @param {BOMNode} node
 * @param {number} multiplier
 * @returns {Object[]}
 */
export function flattenBOM(node, multiplier) {
    // Implementation
}
```

VS Code recognizes JSDoc and provides IntelliSense without TypeScript compilation.

### 7. Do NOT Use Global `window` Object for State (HIGH Confidence)

**Avoid:**
```javascript
window.appState = { /* state */ };  // ❌ Old pattern
```

**Why:**
- Pollutes global namespace
- ES modules provide proper scoping
- Harder to track dependencies
- Risk of name collisions

**Use Module-Based State:**
```javascript
// state.js
export const state = { /* state */ };  // ✅ Explicit imports
```

### 8. Do NOT Use IIFEs for Modules (HIGH Confidence)

**Avoid:**
```javascript
(function() {
    // Old module pattern
})();
```

**Why:**
- Pre-ES6 pattern for scope isolation
- ES modules provide native scope isolation
- Unnecessary wrapper code
- More verbose

**Use ES Modules:**
```javascript
// Code at top level is scoped to module automatically
const privateVar = 'only visible in this file';

export function publicFn() {
    return privateVar;
}
```

---

## External Dependencies

### SheetJS (xlsx.js) - No Change (HIGH Confidence)

**Current:**
```html
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
```

**Recommendation:** Keep using CDN. No change needed.

**Why:**
- Already working
- CDN provides caching, global availability
- No need to vendor (copy into repo)
- SheetJS is stable at 0.18.5

**Module Integration:**
SheetJS loads as global `XLSX` object. Access it directly:
```javascript
// export-excel.js
export function exportToExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data);  // Global XLSX available
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
}
```

No import needed; library defines global.

**Alternative (not recommended):** Install via npm and use ES module version:
```bash
npm install xlsx
```
```javascript
import * as XLSX from './node_modules/xlsx/xlsx.mjs';
```

**Why not recommended:**
- Requires shipping node_modules folder or vendoring file
- Larger repo size
- Adds npm as dependency (complexity for owner)
- CDN approach works fine

### Google Fonts - No Change (HIGH Confidence)

**Current:**
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Work+Sans&display=swap" rel="stylesheet">
```

**Recommendation:** Keep using Google Fonts CDN. No change needed.

---

## Testing Considerations

### Existing Test Harness (test/run-tests.js)

**Current Approach:**
- Extracts functions from HTML via regex
- Runs in Node.js
- Validates against baseline Excel outputs

**Impact of Modularization:**
Testing becomes EASIER:
- Import actual modules instead of extracting via regex
- Node.js supports ES modules natively (`.mjs` or `"type": "module"` in package.json)
- Can test individual modules in isolation

**Updated Test Approach:**

**test/package.json:**
```json
{
    "name": "bom-tool-tests",
    "version": "1.0.0",
    "type": "module",
    "dependencies": {
        "xlsx": "^0.18.5",
        "xmldom": "^0.6.0"
    }
}
```

**test/run-tests.js:**
```javascript
// Import actual modules (not regex extraction)
import { parseCSV, parseXML } from '../js/parsers.js';
import { buildTree } from '../js/tree-builder.js';
import { flattenBOM } from '../js/flattening.js';
import { compareBOMs } from '../js/comparison.js';

// Run tests...
```

**Benefits:**
- Tests use production code directly (no duplication)
- Can test individual functions easily
- Node.js native ES module support (no transpilation)

**Source:** [Node.js ES modules documentation](https://nodejs.org/api/esm.html)

---

## Browser Compatibility

### Target Browsers (HIGH Confidence)

**ES Modules Support:**
- Chrome 61+ (Sept 2017)
- Firefox 60+ (May 2018)
- Safari 11+ (Sept 2017)
- Edge 16+ (Oct 2017)

**Market Coverage (2025):** 97%+ of browsers support ES modules natively.

**Unsupported:**
- Internet Explorer 11 (retired June 2022)
- Older mobile browsers (pre-2018)

**Recommendation:** Do NOT support IE11. Microsoft officially ended support. If legacy browser support is required, use `<script nomodule>` fallback:

```html
<script type="module" src="js/main.js"></script>
<script nomodule src="js/legacy-bundle.js"></script>
```

Modern browsers load `type="module"`, ignore `nomodule`.
Old browsers skip `type="module"`, load `nomodule`.

**For this project:** Unnecessary. Internal tool, users have modern browsers.

**Source:** [Can I Use - ES6 Modules](https://caniuse.com/es6-module)

---

## Performance Considerations

### HTTP/2 on GitHub Pages (HIGH Confidence)

**Fact:** GitHub Pages serves all HTTPS requests over HTTP/2 automatically.

**Implications:**
- Multiple file requests happen in parallel over single connection
- No 6-connection limit (HTTP/1.1 restriction)
- Header compression reduces overhead
- Multiple CSS/JS files have negligible performance impact

**Measurement:**
- 1 file @ 4400 lines: 1 request, ~150KB transfer
- 14 files @ 300 lines each: 14 requests, ~150KB total transfer

**Result:** Nearly identical performance. HTTP/2 multiplexing means 14 parallel requests take roughly the same time as 1 request.

**Edge Case:** Beyond ~50 files, compression efficiency degrades slightly. Not a concern for 10-15 file structure.

**Source:** [Managing CSS & JS in an HTTP/2 World](https://www.viget.com/articles/managing-css-js-http-2)

### Caching Benefits (HIGH Confidence)

**Single File Approach:**
- Change one function → entire 150KB file cache invalidated

**Multi-File Approach:**
- Change one function → only that ~15KB file cache invalidated
- Other 13 files served from browser cache

**Result:** Better caching efficiency with multiple files.

### Load Order (HIGH Confidence)

**ES Modules Load Sequence:**
1. HTML parsed
2. Module script tag encountered: `<script type="module" src="main.js">`
3. Browser fetches `main.js` (non-blocking)
4. Browser parses `main.js`, discovers imports
5. Browser fetches all imported modules (parallel)
6. After HTML parsing complete, execute modules in dependency order

**Result:** All modules loaded and ready before execution. No race conditions. Automatic deferred behavior.

**Source:** [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

---

## Migration Risks and Mitigations

### Risk 1: Breaking Production Tool (HIGH Risk)

**Mitigation:**
- Use git branches: create `refactor/modular` branch
- Keep `main` branch stable
- Test thoroughly before merging
- Validate all test cases pass
- Manual testing of all features

### Risk 2: Module Import Errors (MEDIUM Risk)

**Common Issues:**
- Missing `.js` extension: `import { x } from './module'` fails
- Wrong path: `import { x } from 'module.js'` needs `./module.js`
- Cyclic imports: Module A imports B, B imports A (usually solvable by extracting shared code)

**Mitigation:**
- Follow strict path rules (`.js` extension always, relative paths)
- Test each module extraction incrementally
- Use browser DevTools console to catch import errors immediately
- Modern browsers give clear error messages for module issues

### Risk 3: Global Variable Refactoring Errors (MEDIUM Risk)

**Issue:** Forgetting to import state in a module that needs it.

**Mitigation:**
- Search codebase for all references to global variables before extracting
- Test after each state reference is converted to `state.x` import
- Use browser console warnings (accessing undefined variables)

### Risk 4: SheetJS Global Access (LOW Risk)

**Issue:** XLSX global might not be available when module executes.

**Mitigation:**
- Ensure SheetJS `<script>` tag loads before `<script type="module">`
- Use `defer` on SheetJS script to guarantee loading order
- Test Excel export immediately after refactor

### Risk 5: Local Development Setup (LOW Risk)

**Issue:** ES modules require HTTP server; `file://` protocol fails with CORS errors.

**Mitigation:**
- Document local server requirement in README
- Provide simple command: `python -m http.server`
- Or use VS Code Live Server extension
- Owner already tests via GitHub Pages (no issue)

---

## Alternatives Considered

### Alternative 1: Keep Single File

**Pros:**
- Zero risk of breaking changes
- No refactor effort
- Simplest possible deployment

**Cons:**
- 4400 lines hard to navigate
- Future features add to monolith
- Hard for Claude Code to assist (large context)
- Merge conflicts more likely if multiple features worked on

**Why Not Recommended:**
IFP Merge Tool feature is next (~400 new lines). Better to refactor now while codebase is stable, then add new feature to clean modular structure.

### Alternative 2: Use Vite or Rollup for Dev Experience

**Pros:**
- Hot module replacement (instant refresh on save)
- Better error messages
- Can use TypeScript without manual config

**Cons:**
- Requires Node.js, npm dependencies
- Build step (even in dev)
- Owner has zero coding experience
- Maintenance burden

**Why Not Recommended:**
Benefit doesn't justify complexity for this project. Native ES modules + simple file watching (browser refresh) is sufficient.

### Alternative 3: Import Maps for Cleaner Imports

**Example:**
```html
<script type="importmap">
{
    "imports": {
        "state": "./js/state.js",
        "parsers": "./js/parsers.js"
    }
}
</script>
```

Then use bare specifiers:
```javascript
import { state } from 'state';
```

**Pros:**
- Cleaner import statements
- Easier refactoring (change paths in one place)

**Cons:**
- Newer feature (2023+ browsers, 90% support)
- Adds configuration complexity
- Relative paths work fine for this small project

**Why Not Recommended:**
Relative paths are clearer and work everywhere. Import maps add complexity without significant benefit for ~10-15 modules.

---

## Tooling Recommendations

### Code Editor: VS Code (HIGH Confidence)

**Why:**
- Native ES module support
- IntelliSense for imports (auto-complete module paths)
- Built-in git integration
- Live Server extension for local testing
- Free and widely used

**Extensions:**
- **Live Server** (ritwickdey.LiveServer) - Local dev server with auto-reload
- **ESLint** (optional) - Catch common mistakes
- **Path Intellisense** (optional) - Auto-complete file paths in imports

### Local Testing: Live Server (HIGH Confidence)

**Option 1: VS Code Live Server Extension**
- Right-click `index.html` → "Open with Live Server"
- Auto-refreshes on file save
- Proper HTTP server (ES modules work)

**Option 2: Python Built-in Server**
```bash
cd bom-tool
python -m http.server 8000
# Open http://localhost:8000
```

**Option 3: Node.js http-server**
```bash
npx http-server -p 8000
```

**Recommendation:** VS Code Live Server (easiest for owner).

### Debugging: Browser DevTools (HIGH Confidence)

**Chrome/Edge DevTools:**
- Sources tab shows all modules individually
- Set breakpoints in any module file
- Console shows module import errors clearly
- Network tab shows module loading waterfall

**Key Advantage:** Browser DevTools work perfectly with unbundled ES modules. Source maps not needed.

### Version Control: Git (HIGH Confidence)

**No change** - Already using git. Refactoring creates logical commits:

```bash
git checkout -b refactor/modular
git commit -m "Extract CSS to css/main.css"
git commit -m "Create module shell with state.js"
git commit -m "Extract BOMNode class to bom-node.js"
git commit -m "Extract parsers to parsers.js"
# ... etc
```

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|-----------|-----------|
| **ES Modules** | HIGH | MDN official docs, 97% browser support, 2025 standard |
| **HTTP/2 on GitHub Pages** | HIGH | GitHub docs confirm HTTP/2, verified in search results |
| **State Management** | HIGH | Simple shared object pattern is well-established |
| **CSS Multiple Files** | MEDIUM | HTTP/2 research confirms viability, but single file also works |
| **Script Loading Order** | HIGH | MDN official docs on defer/async/module behavior |
| **No Build Tools** | HIGH | Native ES modules remove need for bundlers |
| **Migration Risks** | MEDIUM | Refactors are inherently risky; mitigations documented |
| **Performance Impact** | MEDIUM | HTTP/2 theory solid, but no specific benchmarks for this app |

---

## Summary Recommendations

### 1. Use Native ES Modules (HIGH Confidence)
- `<script type="module">` for entry point
- Explicit `.js` extensions in imports
- Relative paths (`./module.js`)
- No build tools needed

### 2. Centralized State Module (HIGH Confidence)
- Create `js/state.js` exporting shared state object
- Import `state` in modules that need it
- Mutate object properties across modules

### 3. Single CSS File Initially (HIGH Confidence)
- Extract `<style>` to `css/main.css`
- Split later only if needed (probably not)

### 4. SheetJS via CDN (HIGH Confidence)
- No change to current approach
- Use `defer` on script tag for clarity

### 5. 10-15 JavaScript Files (HIGH Confidence)
- Organized by feature/responsibility
- Each file 200-500 lines
- Clear import dependencies

### 6. Test After Each Step (HIGH Confidence)
- Incremental refactoring
- Validate with test harness
- Manual testing of all features

### 7. Use Git Branches (HIGH Confidence)
- Create `refactor/modular` branch
- Keep `main` stable
- Merge after full validation

---

## Next Steps for Roadmap Creation

Based on this research, the refactoring roadmap should:

1. **Phase 1: Extract CSS** (Low risk, immediate validation)
2. **Phase 2: Module Shell** (Create state.js, main.js entry point)
3. **Phase 3: Extract Classes** (BOMNode to separate file)
4. **Phase 4: Extract Core Logic** (Parsers, tree builder, flattening, etc.)
5. **Phase 5: Extract UI Logic** (Tab-specific modules)
6. **Phase 6: Update Test Harness** (Use direct imports)
7. **Phase 7: Full Validation** (All tests, manual testing)

Each phase should be a separate git commit for easy rollback.

---

## Sources

### Official Documentation (HIGH Confidence)
- [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN - script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [Node.js ES modules](https://nodejs.org/api/esm.html)

### 2025/2026 Industry Sources (MEDIUM-HIGH Confidence)
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)
- [Should you combine CSS and JavaScript files in 2025?](https://teamupdraft.com/blog/combine-css-javascript-files/)
- [Managing CSS & JS in an HTTP/2 World](https://www.viget.com/articles/managing-css-js-http-2)
- [Async vs Defer vs Module: The Ultimate Guide](https://medium.com/web-tech-journals/mastering-javascript-loading-async-defer-and-module-attributes-for-optimal-web-performance-af88d1362f37)

### GitHub Community (MEDIUM Confidence)
- [GitHub Pages ES modules discussion](https://github.com/orgs/community/discussions/112227)
- [GitHub Pages HTTP/2 support discussion](https://github.com/isaacs/github/issues/1204)

### Additional References (LOW-MEDIUM Confidence)
- [Back to the Future With ES Modules: JS Without Build](https://betterprogramming.pub/back-to-the-future-with-es-modules-js-without-build-ee2c207a4439)
- [Going Buildless: ES Modules: Modern Web](https://modern-web.dev/guides/going-buildless/es-modules/)
- [Writing Modern JavaScript without a Bundler](https://playfulprogramming.com/posts/modern-js-bundleless/)

---

**END OF STACK.MD**
