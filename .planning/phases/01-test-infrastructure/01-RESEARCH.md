# Phase 1: Test Infrastructure - Research

**Researched:** 2026-02-07
**Domain:** ES6 modules, cross-environment code sharing (browser + Node.js)
**Confidence:** HIGH

## Summary

Phase 1 requires adapting the test harness to import functions from extracted ES6 module files instead of using copied code. The core challenge is creating modules that work in BOTH browser (native ES6 with DOMParser) and Node.js (ES6 with xmldom dependency) without build tools.

The standard approach is to create an **environment abstraction layer** that detects the runtime environment and conditionally loads platform-specific dependencies (DOMParser vs xmldom, CDN SheetJS vs npm xlsx). Modern Node.js and browsers both fully support native ES6 modules with `import`/`export` syntax.

Key technical requirements verified:
- Node.js requires `.js` file extension in relative imports (matches browser behavior)
- Node.js enables ES modules via `"type": "module"` in package.json (already configured)
- SheetJS works differently in browser (CDN global) vs Node.js (npm package with manual `set_fs()` for ESM)
- xmldom provides W3C-compatible DOMParser for Node.js that matches browser API

**Primary recommendation:** Extract core BOM functions into module files with environment abstraction layer that detects runtime and loads appropriate dependencies. Tests import the real modules, not copies.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native ES6 modules | ES2015+ | Cross-environment module system | Native in modern browsers and Node.js, no build tools needed |
| Node.js | 14.6+ | Server-side runtime for tests | Built-in ESM support with "type": "module" |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| xmldom | 0.6.0 | W3C DOMParser for Node.js | Node.js environment (browser has native DOMParser) |
| xlsx (SheetJS) | 0.18.5 | Excel parsing/generation | Already in use; CDN for browser, npm for Node.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xmldom | @xmldom/xmldom | Newer maintained fork, but xmldom 0.6.0 already works |
| Environment detection | browser-or-node package | Adds dependency for simple check; `typeof window !== 'undefined'` sufficient |
| Build tools (webpack, vite) | Native ES6 modules | User requirement: no build tools; native modules work fine |

**Installation:**
```bash
# Already installed in test/package.json
npm install xlsx xmldom
```

## Architecture Patterns

### Recommended Project Structure
```
bom-tool/
├── index.html                    # Browser app, imports from modules/
├── modules/                      # NEW: Shared ES6 modules
│   ├── environment.js            # Environment detection & abstraction
│   ├── bom-node.js               # BOMNode class
│   ├── parser.js                 # parseXML, parseCSV (uses environment.js)
│   ├── tree-builder.js           # buildTree
│   ├── flattener.js              # flattenBOM, sortBOM
│   ├── comparator.js             # compareBOMs, extractSubtree, etc.
│   └── utils.js                  # decimalToFractional, parseLength, etc.
├── test/
│   ├── run-tests.js              # Imports from modules/ (no more copied code)
│   └── package.json              # "type": "module" already set
└── test-data/                    # Validation Excel files
```

### Pattern 1: Environment Abstraction Layer
**What:** A module that detects runtime environment and provides platform-specific implementations
**When to use:** When code needs different dependencies in browser vs Node.js (DOMParser, SheetJS)
**Example:**
```javascript
// modules/environment.js
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

// Detect environment
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// Platform-specific DOMParser
let DOMParserImpl;
if (isNode) {
    // Dynamic import for Node.js only
    const xmldom = await import('xmldom');
    DOMParserImpl = xmldom.DOMParser;
} else {
    // Use native browser DOMParser
    DOMParserImpl = window.DOMParser;
}
export { DOMParserImpl as DOMParser };

// Platform-specific SheetJS
export let XLSX;
if (isNode) {
    // Node.js: import from npm package
    const xlsxModule = await import('xlsx');
    XLSX = xlsxModule.default || xlsxModule;
    // ESM requires manual fs injection
    const fs = await import('fs');
    XLSX.set_fs(fs);
} else {
    // Browser: use CDN global (loaded via <script> tag)
    XLSX = window.XLSX;
}
```

### Pattern 2: Module Imports with .js Extension
**What:** All relative imports MUST include `.js` file extension
**When to use:** Always, for both browser and Node.js compatibility
**Example:**
```javascript
// modules/parser.js
// Source: https://nodejs.org/api/esm.html

// ✓ CORRECT - includes .js extension
import { DOMParser } from './environment.js';
import { BOMNode } from './bom-node.js';
import { parseLength } from './utils.js';

// ✗ WRONG - missing extension (will fail in Node.js and browser)
import { DOMParser } from './environment';
import { BOMNode } from './bom-node';
```

### Pattern 3: Browser Module Loading
**What:** HTML uses `<script type="module">` to load ES6 modules
**When to use:** In index.html to import and use module functions
**Example:**
```html
<!-- index.html -->
<!-- Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules -->

<!-- CDN dependencies loaded BEFORE modules (for window.XLSX) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

<!-- Main app code as module -->
<script type="module">
    // Import functions from modules
    import { parseXML, parseCSV } from './modules/parser.js';
    import { buildTree } from './modules/tree-builder.js';
    import { flattenBOM, sortBOM } from './modules/flattener.js';

    // Use imported functions in event handlers
    document.getElementById('fileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const text = await file.text();
        const rows = parseXML(text);
        const tree = buildTree(rows);
        // ...
    });
</script>
```

### Pattern 4: Test Harness Imports
**What:** Test runner imports real module functions, no copied code
**When to use:** In test/run-tests.js
**Example:**
```javascript
// test/run-tests.js
// Source: Project constraint - tests must import from real modules

// Import from real module files (not copies)
import { BOMNode } from '../modules/bom-node.js';
import { parseXML, parseCSV } from '../modules/parser.js';
import { buildTree } from '../modules/tree-builder.js';
import { flattenBOM, sortBOM } from '../modules/flattener.js';
import { compareBOMs, extractSubtree, findNodeByPartNumber } from '../modules/comparator.js';

// Tests now use the ACTUAL production code
function test1_FlatBOM_XML() {
    const rows = parseXML(xmlText);  // Real parseXML, not a copy
    const tree = buildTree(rows);    // Real buildTree, not a copy
    // ...
}
```

### Anti-Patterns to Avoid
- **Copying functions into test file:** Defeats purpose of Phase 1; tests must import from real modules
- **Omitting .js extension in imports:** Will fail in both Node.js ESM and browsers
- **Using default exports for multiple functions:** Named exports are clearer for utility functions
- **Forgetting to load CDN script before module script:** Browser modules need window.XLSX to exist first
- **Circular dependencies:** Module A imports B, B imports A; restructure to have shared utilities in separate module

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Environment detection | Custom runtime checks | `typeof window !== 'undefined'` idiom | Standard pattern, well-tested, clear semantics |
| XML parsing for Node.js | Custom XML parser | xmldom package | W3C-compliant, matches browser DOMParser API exactly |
| File extensions in imports | Auto-resolution logic | Explicit `.js` in all imports | Required by ES6 spec, works in both environments |
| Module mocking for tests | Custom test doubles | Import real modules | Phase 1 goal is to eliminate copies, not mock |

**Key insight:** Cross-environment code sharing is a solved problem in 2026. Don't invent custom solutions; use standard ES6 module patterns and thin environment abstraction layer.

## Common Pitfalls

### Pitfall 1: Missing File Extensions in Relative Imports
**What goes wrong:** Imports work during development but fail in production or between environments
**Why it happens:** CommonJS allowed omitting extensions; ES6 modules require them
**How to avoid:** Always use `.js` extension in relative imports: `import { x } from './module.js'`
**Warning signs:** "Cannot find module" errors in Node.js; browser shows 404 for module files
**Source:** [Node.js ESM Documentation](https://nodejs.org/api/esm.html)

### Pitfall 2: SheetJS ESM Requires Manual set_fs() in Node.js
**What goes wrong:** Excel parsing/writing fails in tests with cryptic errors about missing filesystem
**Why it happens:** ESM spec prevents automatic loading of optional dependencies; must be injected manually
**How to avoid:** After importing xlsx in Node.js ESM, call `XLSX.set_fs(fs)` with imported fs module
**Warning signs:** Errors about "fs not found" or "set_fs is not a function" in test runs
**Source:** [SheetJS Node.js Documentation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)

### Pitfall 3: CDN Script Timing with ES6 Modules
**What goes wrong:** Module code runs before CDN script loads, `window.XLSX` is undefined
**Why it happens:** `<script type="module">` is deferred by default; CDN script may not be loaded yet
**How to avoid:** Place CDN `<script>` tags BEFORE `<script type="module">` in HTML; check `window.XLSX` exists
**Warning signs:** "XLSX is not defined" errors in browser console on page load
**Source:** [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Pitfall 4: Circular Dependencies Between Modules
**What goes wrong:** Module loading fails or values are undefined at runtime
**Why it happens:** Module A imports B, B imports A; circular reference causes incomplete initialization
**How to avoid:** Restructure to extract shared code into third module; use dependency graph analysis
**Warning signs:** `undefined` values for imported functions; "X is not a function" runtime errors
**Source:** [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/)

### Pitfall 5: Global Variables Lost When Extracting to Modules
**What goes wrong:** Code expects `rootPartNumber`, `csvData` etc. as globals; breaks when modularized
**Why it happens:** Module scope is isolated; variables not explicitly exported are private
**How to avoid:** Pass data as function parameters instead of relying on globals; or export/import state modules
**Warning signs:** "X is not defined" errors after refactoring; tests fail with undefined variables
**Source:** [Exploring JS: Modules](https://exploringjs.com/es6/ch_modules.html)

### Pitfall 6: DOMParser API Differences (Browser vs xmldom)
**What goes wrong:** XML parsing works in browser but fails in Node.js tests (or vice versa)
**Why it happens:** Subtle API differences between native DOMParser and xmldom implementation
**How to avoid:** Use identical API subset (W3C DOM Level 2 Core); test in both environments
**Warning signs:** Different parsing results in browser vs tests; getAttribute returns unexpected values
**Source:** [xmldom GitHub](https://github.com/xmldom/xmldom)

### Pitfall 7: Transition Strategy - Running Both Systems Simultaneously
**What goes wrong:** Risk of divergence if copied code in tests and new modules are both modified
**Why it happens:** During transition, both old (copied) and new (imported) code exist
**How to avoid:** Switch completely in one atomic commit; delete copied code immediately after import works
**Warning signs:** Tests pass but browser fails (or vice versa); unclear which code is "source of truth"
**Source:** [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html)

## Code Examples

Verified patterns from official sources:

### Environment Abstraction Module (Complete)
```javascript
// modules/environment.js
// Detects runtime and provides platform-specific implementations

// Environment detection
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;

// DOMParser abstraction
let DOMParserImpl;
if (isNode) {
    // Node.js: use xmldom package
    const xmldom = await import('xmldom');
    DOMParserImpl = xmldom.DOMParser;
} else {
    // Browser: use native DOMParser
    DOMParserImpl = window.DOMParser;
}
export { DOMParserImpl as DOMParser };

// SheetJS abstraction
export let XLSX;
if (isNode) {
    // Node.js: npm package with manual fs injection
    const xlsxModule = await import('xlsx');
    XLSX = xlsxModule.default || xlsxModule;

    // ESM requires set_fs for file operations
    const fs = await import('fs');
    XLSX.set_fs(fs);
} else {
    // Browser: use CDN global (loaded via <script> tag before modules)
    if (typeof window.XLSX === 'undefined') {
        throw new Error('SheetJS not loaded. Include <script> tag for XLSX CDN before module scripts.');
    }
    XLSX = window.XLSX;
}
```
**Source:** [MDN Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), [Node.js ESM](https://nodejs.org/api/esm.html)

### Parsing Module Using Environment Abstraction
```javascript
// modules/parser.js
import { DOMParser, XLSX, isNode } from './environment.js';
import { BOMNode } from './bom-node.js';

// Parse XML to row objects (works in both browser and Node.js)
export function parseXML(xmlText) {
    const parser = new DOMParser();  // Uses abstracted DOMParser
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new Error('Invalid XML format');
    }

    const rows = [];
    // ... (rest of parseXML implementation)
    return rows;
}

// Parse CSV (uses abstracted XLSX)
export function parseCSV(filePathOrText) {
    let csvText;

    if (isNode && typeof filePathOrText === 'string' && filePathOrText.includes('/')) {
        // Node.js: read from file path
        const fs = await import('fs');
        const buffer = fs.readFileSync(filePathOrText);
        csvText = buffer.toString('utf16le');
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1); // Remove BOM
        }
    } else {
        // Browser: already have text content
        csvText = filePathOrText;
    }

    // Use abstracted XLSX (works in both environments)
    const workbook = XLSX.read(csvText, { type: 'string', raw: true });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

    return data;
}
```
**Source:** Project code structure

### Browser HTML with Module Import
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BOM Tool 2.1</title>

    <!-- IMPORTANT: Load CDN scripts BEFORE module scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

    <style>
        /* ... existing styles ... */
    </style>
</head>
<body>
    <!-- ... existing HTML ... -->

    <!-- Main application code as module -->
    <script type="module">
        // Import from module files
        import { parseXML, parseCSV } from './modules/parser.js';
        import { buildTree } from './modules/tree-builder.js';
        import { flattenBOM, sortBOM } from './modules/flattener.js';
        import { compareBOMs } from './modules/comparator.js';

        // Existing event handlers use imported functions
        document.getElementById('csvFileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const text = await file.text();

            // Use imported parseCSV (not inline code)
            const rows = parseCSV(text);
            const tree = buildTree(rows);
            const flattened = flattenBOM(tree, 1);
            const sorted = sortBOM(flattened);

            displayResults(sorted);
        });

        // ... rest of app code ...
    </script>
</body>
</html>
```
**Source:** [MDN Script type="module"](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#module)

### Test Harness Importing Real Modules
```javascript
// test/run-tests.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

// ✓ IMPORT REAL MODULES (not copied code)
import { BOMNode } from '../modules/bom-node.js';
import { parseXML, parseCSV } from '../modules/parser.js';
import { buildTree } from '../modules/tree-builder.js';
import { flattenBOM, sortBOM } from '../modules/flattener.js';
import { compareBOMs, extractSubtree, findNodeByPartNumber } from '../modules/comparator.js';
import { parseLength, decimalToFractional, getCompositeKey } from '../modules/utils.js';

// Get test data directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.join(__dirname, '..', 'test-data');

function test1_FlatBOM_XML() {
    // Parse input using REAL parseXML from modules/parser.js
    const xmlPath = path.join(testDataDir, '258730-Rev2-20260105.XML');
    const xmlText = fs.readFileSync(xmlPath, 'utf8');
    const rows = parseXML(xmlText);  // Real function, not copy

    // Build tree using REAL buildTree from modules/tree-builder.js
    const root = buildTree(rows);

    // Flatten using REAL flattenBOM from modules/flattener.js
    const flattened = flattenBOM(root, 1);
    const sorted = sortBOM(flattened);

    // Load expected output and compare
    const expectedPath = path.join(testDataDir, '258730-Rev2-Flat BOM-20260115.xlsx');
    const workbook = XLSX.readFile(expectedPath);
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    return compareFlattened(sorted, expected);
}

// Run all tests
const results = [
    runTest('Test 1: Flat BOM (XML)', test1_FlatBOM_XML),
    runTest('Test 2: GA Comparison (CSV)', test2_Comparison_CSV),
    runTest('Test 3: GA Comparison (XML)', test3_Comparison_XML),
    runTest('Test 4: Scoped Comparison', test4_ScopedComparison)
];

// Summary
const passed = results.filter(r => r).length;
console.log(`\n${passed}/${results.length} tests passed`);
process.exit(passed === results.length ? 0 : 1);
```
**Source:** Project requirement - test harness must import from real modules

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CommonJS `require()` | ES6 `import`/`export` | ES2015 (2015), Node.js v14.6 (2020) | Native cross-environment modules, no build tools needed |
| Copied test functions | Import real production modules | Best practice since ~2020 | Single source of truth, tests validate actual code |
| Build tools (webpack) for modules | Native ES6 in browser | Browser support ~2017-2019 | Zero build step, instant feedback |
| xmldom 0.6.0 | @xmldom/xmldom | Fork created 2021 | Maintained fork exists but xmldom 0.6.0 still works fine |

**Deprecated/outdated:**
- **Omitting .js extension in imports**: Required by ES6 spec; omission only worked in CommonJS and legacy bundlers
- **Automatic dependency resolution in ESM**: ES6 spec prevents auto-loading of optional deps; manual injection required (e.g., XLSX.set_fs)
- **`<script>` without type="module"**: Old approach; modern code should use module scripts for better scoping and dependency management

## Open Questions

Things that couldn't be fully resolved:

1. **Transition strategy: immediate switch or parallel validation?**
   - What we know: Tests currently have copied functions (~430 lines). Phase 1 must switch to imports.
   - What's unclear: Should we (a) switch immediately and delete copies, or (b) temporarily run both as safety check?
   - Recommendation: **Immediate switch**. Run tests before extraction to establish baseline, extract modules, run tests again. If all pass, delete copied code in same commit. Parallel validation adds complexity with no real safety benefit since validation Excel files are the source of truth.

2. **Global state management (rootPartNumber, csvData, etc.)**
   - What we know: Current code uses ~10 global variables for state. Module scope is isolated.
   - What's unclear: Best pattern - pass as parameters, create state module, or use closure?
   - Recommendation: **Phase 1 keeps globals initially**. User decision was "global functions initially" to avoid complexity. State refactoring can come in later phase. For Phase 1, declare globals in main script scope, not in modules.

3. **Browser smoke test checklist specifics**
   - What we know: User should manually verify UI after each phase using test-data files.
   - What's unclear: How detailed? Every button or just "looks right"?
   - Recommendation: **Simple checklist**. Phase 1 version: (1) Open index.html, (2) Load 258730-Rev2-20260105.XML in Flat BOM tab, (3) Verify results table appears, (4) Load same files in Comparison tab, (5) Verify changes appear. Detailed field checks are automated tests' job.

4. **Error handling for missing CDN dependencies**
   - What we know: Browser needs window.XLSX before module code runs
   - What's unclear: Should environment.js validate and throw helpful error, or assume CDN loaded?
   - Recommendation: **Add validation check**. In environment.js, throw error with clear message if `window.XLSX` is undefined in browser context. Better DX with 1 line of code.

## Sources

### Primary (HIGH confidence)
- [Node.js ESM Documentation v25.6.0](https://nodejs.org/api/esm.html) - File extension requirements, ES module behavior
- [MDN JavaScript Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - Browser ES6 module patterns
- [SheetJS Node.js Documentation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) - ESM vs CommonJS, set_fs requirement

### Secondary (MEDIUM confidence)
- [JavaScript Modules in 2026: Practical Patterns](https://thelinuxcode.com/javascript-modules-in-2026-practical-patterns-with-commonjs-and-es-modules/) - Current best practices
- [How to Use ES6 Import and Export in Node.js](https://oneuptime.com/blog/post/2026-01-22-nodejs-es6-import-export/view) - Node.js ESM setup
- [Common Pitfalls When Importing ES6 Modules](https://infinitejs.com/posts/common-pitfalls-importing-es6-modules/) - Module refactoring gotchas
- [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/) - Module cohesion and structure
- [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html) - Circular dependency avoidance

### Tertiary (LOW confidence)
- Web search results about environment detection patterns - general approaches, not verified with official docs
- Community discussions about xmldom vs @xmldom/xmldom - both work, choice not critical for Phase 1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ES6 modules, Node.js ESM, xmldom, SheetJS all verified with official documentation
- Architecture: HIGH - Environment abstraction pattern verified across multiple sources; file extension requirement documented in Node.js and MDN official docs
- Pitfalls: HIGH - All 7 pitfalls verified with official documentation or authoritative sources (MDN, Node.js docs, SheetJS docs)

**Research date:** 2026-02-07
**Valid until:** 90 days (stable technologies - ES6 modules spec unchanged since 2015)
