# Phase 3: Utilities Extraction - Research

**Researched:** 2026-02-07
**Domain:** ES6 module extraction, HTML script type=module integration, utility function migration
**Confidence:** HIGH

## Summary

Phase 3 requires completing the extraction of utility functions that are currently duplicated between `js/core/utils.js` (already contains 4 of 5 functions) and `index.html` (still has all 5 functions inline). The core challenge is removing the inline utility function definitions from the HTML file and making the HTML script load these functions from the ES6 module instead.

**Current state analysis:**
- `js/core/utils.js` already exists with 4/5 utility functions exported: `parseLength`, `decimalToFractional`, `getParentLevel`, `getCompositeKey`
- **Missing from module:** `createDiff` (line 2030 in index.html) - word-level diff for comparison view
- `index.html` still has inline definitions of ALL 5 functions (lines 648, 661, 742, 811, 2030)
- The HTML `<script>` tag is NOT type="module" yet (line 393) - it's a classic script
- Test harness already imports from `js/core/utils.js` and passes all 4 tests

**Technical approach:**
1. Add `createDiff` function to `js/core/utils.js` (extract from line 2030)
2. Convert HTML `<script>` tag from classic script to `type="module"`
3. Add `import` statement at top of HTML script for all 5 utility functions
4. Remove the 5 inline function definitions from HTML script
5. Verify: tests pass, browser loads correctly, all three tabs work

The standard pattern for browser ES6 modules is `<script type="module" src="file.js">` or inline `<script type="module">` with imports at the top. Modules are automatically deferred, use strict mode, and have their own scope (not global). The key gotcha is that `import`/`export` only work in module scripts - classic scripts will throw SyntaxError.

**Primary recommendation:** Add `createDiff` to utils.js, change HTML script to `type="module"`, import all 5 utilities at top, delete inline definitions, verify with tests and browser smoke test.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ES6 Modules | ECMAScript 2015 | Native JavaScript module system | Built into browsers and Node.js; no bundler needed |
| HTML `<script type="module">` | HTML5 | Browser module loading | W3C standard since 2018; supported in all modern browsers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | No supporting libraries needed | Native ES6 modules are sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native ES6 modules | Webpack/Rollup bundler | Bundlers add build complexity; ES6 modules work natively in all modern browsers |
| `type="module"` | Classic script with global functions | Module scope prevents pollution; easier to maintain |
| Named exports | Default exports | Named exports allow multiple exports per file; better for utility collections |

**Installation:**
```bash
# No installation needed - native browser and Node.js feature
# Module files already exist in js/core/ from Phase 1
```

## Architecture Patterns

### Recommended Project Structure
```
bom-tool/
├── index.html                    # Browser app with <script type="module">
├── css/
│   └── styles.css                # External stylesheet (Phase 2)
├── js/core/                      # ES6 modules
│   ├── utils.js                  # Utility functions (Phase 3 - nearly complete)
│   ├── tree.js                   # Tree operations (Phase 1)
│   ├── flatten.js                # BOM flattening (Phase 1)
│   ├── parser.js                 # File parsing (Phase 1)
│   ├── compare.js                # BOM comparison (Phase 1)
│   └── environment.js            # Node.js/browser detection (Phase 1)
├── test/
│   └── run-tests.js              # Already imports from js/core/
└── test-data/
```

### Pattern 1: Inline Module Script with Imports
**What:** HTML `<script type="module">` with inline JavaScript that imports from external modules
**When to use:** When main application logic lives in HTML file but uses modular utilities
**Example:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BOM Tool 2.1</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- HTML structure -->

    <script type="module">
        // Import utility functions from module
        import { parseLength, decimalToFractional, getParentLevel, getCompositeKey, createDiff } from './js/core/utils.js';

        // Rest of application code uses imported functions
        class BOMNode {
            constructor(rowData) {
                this.length = parseLength(rowData.Length);  // Uses imported function
                // ...
            }
        }

        // More application code...
    </script>
</body>
</html>
```
**Source:** [MDN JavaScript Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Pattern 2: Named Export Collection (Utility Module)
**What:** Single module file exports multiple related utility functions as named exports
**When to use:** For collections of independent helper functions (no shared state)
**Example:**
```javascript
// js/core/utils.js

// Parse length (null for empty, "-", or non-numeric)
export function parseLength(lengthStr) {
    if (typeof lengthStr === 'number') {
        return isNaN(lengthStr) ? null : lengthStr;
    }
    if (!lengthStr || lengthStr.trim() === '' || lengthStr === '-') {
        return null;
    }
    const num = parseFloat(lengthStr);
    return isNaN(num) ? null : num;
}

// Convert decimal to fractional (1/16" increments)
export function decimalToFractional(decimal) {
    if (decimal === null) return '';
    // ... implementation ...
}

// Get parent level from level string
export function getParentLevel(level) {
    const parts = level.split('.');
    if (parts.length === 1) return null;
    return parts.slice(0, -1).join('.');
}

// Generate composite key
export function getCompositeKey(partNumber, length) {
    if (length === null) return partNumber;
    return `${partNumber}|${length}`;
}

// Create word-level diff for comparison
export function createDiff(oldText, newText) {
    if (!oldText && !newText) return { old: '-', new: '-' };
    // ... implementation ...
}
```
**Source:** [MDN export statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)

### Pattern 3: Cross-Environment Module (Browser + Node.js)
**What:** Module works identically in both browser (via `<script type="module">`) and Node.js (via `import`)
**When to use:** When same code needs to run in test harness (Node.js) and production (browser)
**Example:**
```javascript
// js/core/utils.js - No environment-specific code needed

// These utility functions work identically in both environments
// because they only use standard JavaScript (no DOM, no Node.js APIs)

export function parseLength(lengthStr) {
    // Pure JavaScript - works everywhere
    if (typeof lengthStr === 'number') {
        return isNaN(lengthStr) ? null : lengthStr;
    }
    return parseFloat(lengthStr) || null;
}

// Browser usage:
// <script type="module">
//   import { parseLength } from './js/core/utils.js';
// </script>

// Node.js usage (test harness):
// import { parseLength } from '../js/core/utils.js';
```
**Note:** Current project already uses this pattern in Phase 1. Environment-specific code lives in `environment.js`.

### Pattern 4: Module Loading Order and Dependencies
**What:** Browsers execute module imports before the main script, ensuring dependencies load first
**When to use:** Always with modules - automatic behavior
**Example:**
```html
<script type="module">
    // Import statements execute FIRST, before any other code
    import { parseLength } from './js/core/utils.js';
    import { buildTree } from './js/core/tree.js';

    // This code runs AFTER all imports complete
    console.log('Modules loaded, application starting');

    // No need for DOMContentLoaded wrapper around imports
    // (though still needed for DOM manipulation)
</script>
```
**Source:** [MDN Modules - Imports are hoisted](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Anti-Patterns to Avoid
- **Keeping duplicate function definitions:** Do NOT keep inline definitions after importing - delete them completely
- **Using classic script with imports:** `import` statements require `type="module"` - classic scripts will throw SyntaxError
- **Importing inside functions:** Imports are hoisted to top; put all imports at module top for clarity
- **Adding `.js` extension inconsistently:** Always include `.js` in browser imports (required); Node.js allows omitting it
- **Circular dependencies between modules:** Utility functions should be leaf modules with no circular imports
- **Global scope assumptions:** Module scope is local, not global - don't expect variables to leak to window

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module bundling | Custom concatenation script | Native ES6 modules | Browsers load modules natively; HTTP/2 makes multiple files efficient |
| Code transformation | Manual find-replace | Exact extraction with testing | Tests catch behavioral differences; manual edits miss edge cases |
| Environment detection | Custom runtime checks | `js/core/environment.js` | Already implemented in Phase 1; handles Node.js/browser differences |
| Import path resolution | Custom path logic | Browser/Node.js native resolution | Relative paths work identically; just include `.js` extension |

**Key insight:** ES6 modules are fully standardized and work natively in both environments. The only work needed is mechanical extraction and ensuring `type="module"` is set. Don't overcomplicate with build tools.

## Common Pitfalls

### Pitfall 1: Forgetting `type="module"` in HTML Script Tag
**What goes wrong:** Browser throws `SyntaxError: Cannot use import statement outside a module`
**Why it happens:** `import`/`export` statements only work in module context, not classic scripts
**How to avoid:** Change `<script>` to `<script type="module">` before adding import statements
**Warning signs:** Console shows `SyntaxError` on first import line; application doesn't load
**Source:** [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Pitfall 2: Not Including `.js` Extension in Browser Imports
**What goes wrong:** Browser throws error: `Failed to resolve module specifier "utils"`
**Why it happens:** Browsers require explicit file extensions in module specifiers (unlike Node.js)
**How to avoid:** Always write `import { parseLength } from './js/core/utils.js'` with `.js` extension
**Warning signs:** Browser console shows "Failed to resolve module specifier"; 404 for module file
**Source:** [MDN import statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

### Pitfall 3: CORS Errors When Opening HTML File Directly
**What goes wrong:** Browser throws CORS error when loading modules from `file://` protocol
**Why it happens:** Browser security prevents modules from loading with `file://` URLs
**How to avoid:** Use local web server (VS Code Live Server, Python `http.server`, etc.)
**Warning signs:** Console shows `CORS policy` error; modules fail to load
**Source:** [SitePoint - Using ES Modules](https://www.sitepoint.com/using-es-modules/)
**Project note:** Not a concern - user already opens via double-click, which uses default `file://` handler. However, for development during extraction, a local server is recommended.

### Pitfall 4: Leaving Inline Function Definitions After Importing
**What goes wrong:** Two versions of same function exist; which one is used depends on scope
**Why it happens:** Incomplete extraction - import added but inline definition not removed
**How to avoid:** After adding imports, search for and DELETE all inline function definitions
**Warning signs:** Browser DevTools shows two definitions with same name; behavior inconsistent
**Verification:** Grep for `function parseLength`, `function decimalToFractional`, etc. - should find ZERO in HTML

### Pitfall 5: Incorrect Import Path (Absolute vs Relative)
**What goes wrong:** Browser can't find module; 404 error in Network tab
**Why it happens:** Import path doesn't match actual file location relative to HTML file
**How to avoid:** From `index.html`, path to `js/core/utils.js` is `./js/core/utils.js` (relative path)
**Warning signs:** Network tab shows 404 for module file; console shows "Failed to load module"
**Source:** [MDN import statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)

### Pitfall 6: Module Scope vs Global Scope Confusion
**What goes wrong:** Variables or functions not accessible where expected
**Why it happens:** Module scope is local; imported names don't leak to global scope
**How to avoid:** Import functions wherever they're needed; don't expect module imports to be globally accessible
**Warning signs:** `ReferenceError` in browser console; function undefined in DevTools console
**Source:** [MDN Modules - Module scope](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
**Project note:** Not a risk for Phase 3 - all utility functions are used within the same script context after importing

### Pitfall 7: Not Testing createDiff in Browser (HTML Context)
**What goes wrong:** `createDiff` function creates HTML strings with `<span>` tags - needs verification in browser rendering
**Why it happens:** Function was tested in Node.js (test harness) but not verified in actual browser comparison view
**How to avoid:** After extraction, run BOM comparison with real data and verify red/green highlighting works
**Warning signs:** Comparison table shows no colored diffs; HTML tags appear as literal text
**Verification:** Smoke test must specifically check BOM Comparison tab with changed descriptions

## Code Examples

Verified patterns from official sources:

### Complete HTML Script Conversion (Before and After)

**BEFORE (Classic Script - Current State):**
```html
<script>
    // Inline utility function definitions
    function parseLength(lengthStr) {
        if (typeof lengthStr === 'number') {
            return isNaN(lengthStr) ? null : lengthStr;
        }
        if (!lengthStr || lengthStr.trim() === '' || lengthStr === '-') {
            return null;
        }
        const num = parseFloat(lengthStr);
        return isNaN(num) ? null : num;
    }

    function getParentLevel(level) {
        const parts = level.split('.');
        if (parts.length === 1) return null;
        return parts.slice(0, -1).join('.');
    }

    // ... more inline functions ...

    // Application code using inline functions
    class BOMNode {
        constructor(rowData) {
            this.length = parseLength(rowData.Length);
            // ...
        }
    }
</script>
```

**AFTER (Module Script - Target State):**
```html
<script type="module">
    // Import utility functions from module
    import { parseLength, decimalToFractional, getParentLevel, getCompositeKey, createDiff } from './js/core/utils.js';

    // Application code using imported functions (no inline definitions)
    class BOMNode {
        constructor(rowData) {
            this.length = parseLength(rowData.Length);  // Same usage, imported function
            // ...
        }
    }

    // All utility function calls work identically
    // No inline definitions needed
</script>
```

### Extract createDiff Function to Module

**Location in index.html:** Line 2030
**Purpose:** Word-level diff for BOM comparison view (highlights added/removed words)

```javascript
// ADD to js/core/utils.js:

// Create word-level diff for comparison view
export function createDiff(oldText, newText) {
    if (!oldText && !newText) return { old: '-', new: '-' };
    if (!oldText) return { old: '-', new: newText };
    if (!newText) return { old: oldText, new: '-' };
    if (oldText === newText) return { old: oldText, new: newText };

    // Split into words
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);

    // Find common and different words
    const oldSet = new Set(oldWords);
    const newSet = new Set(newWords);

    // Build highlighted versions
    let oldHtml = oldWords.map(word => {
        if (!newSet.has(word)) {
            return `<span class="diff-removed">${word}</span>`;
        }
        return word;
    }).join(' ');

    let newHtml = newWords.map(word => {
        if (!oldSet.has(word)) {
            return `<span class="diff-added">${word}</span>`;
        }
        return word;
    }).join(' ');

    return { old: oldHtml, new: newHtml };
}
```

**CRITICAL:** Copy this EXACTLY from line 2030-2060 in index.html. Do not modify logic.

### Verification: No Inline Definitions Remain

After extraction, verify all inline definitions are removed:

```bash
# Search for function definitions in HTML (should return ONLY the import line, not definitions)
grep -n "function parseLength\|function decimalToFractional\|function getParentLevel\|function getCompositeKey\|function createDiff" index.html

# Expected: NO results (or only results in comments/strings)
# If any function definitions found, extraction is incomplete
```

### Browser Smoke Test for Utilities

```bash
# After changes, test in browser:

1. Open index.html in browser (with local server if needed)

2. Check browser console for errors:
   - No "SyntaxError: Cannot use import" (means type="module" is set)
   - No "Failed to resolve module specifier" (means paths are correct)
   - No "CORS policy" errors (means serving correctly)

3. Test Flat BOM tab:
   - Upload test-data/258730-Rev2-20260105.XML
   - Verify fractional lengths display correctly (tests decimalToFractional)
   - Verify Part Number-Length composite keys work (tests getCompositeKey, parseLength)

4. Test BOM Comparison tab:
   - Upload old and new XML files
   - Run comparison
   - **CRITICAL:** Find a "Changed" item and verify red/green word highlighting appears
   - This specifically tests createDiff() in browser HTML rendering context

5. Test Hierarchy View tab:
   - Upload XML file
   - Verify tree renders correctly (tests getParentLevel, parseLength)
   - Check expand/collapse works

6. Check DevTools Network tab:
   - Verify js/core/utils.js loads successfully (200 status)
   - No 404 errors for module files
```

### Automated Test Verification

```bash
# Run test suite after extraction
cd test
node run-tests.js

# Expected output (IDENTICAL to before extraction):
# Test 1: PASS - Flat BOM for 258730-Rev2 (201 items)
# Test 2: PASS - Flat BOM for 254960-Rev4 (201 items)
# Test 3: PASS - BOM Comparison 258730-Rev1 vs Rev2 (41 added, 41 removed, 19 changed)
# Test 4: PASS - Scoped Comparison (same counts)
#
# 4/4 tests passed
# ALL TESTS PASSED

# If any test fails, extraction introduced behavioral change - ROLLBACK
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Copy functions into HTML | ES6 module imports | ES2015 (2015) | Single source of truth; no duplication |
| Global function scope | Module scope | ES2015 (2015) | No namespace pollution; explicit dependencies |
| Manual script ordering | Module dependency graph | ES2015 (2015) | Browser manages load order automatically |
| Concatenation/bundlers | Native module loading | HTTP/2 adoption (~2018) | No build step needed; modules load efficiently |

**Deprecated/outdated:**
- **AMD/RequireJS:** Pre-ES6 module systems; replaced by native ES6 modules
- **CommonJS in browsers:** Node.js module system; doesn't work in browsers without bundler
- **Script concatenation:** No longer needed; HTTP/2 multiplexing makes multiple files efficient
- **Global namespace patterns (IIFE):** Module scope eliminates need for namespace management

**Project note:** BOM Tool already uses ES6+ JavaScript throughout (class syntax, arrow functions, template literals). Adding ES6 module imports is consistent with existing code style. No compatibility concerns.

## Open Questions

Things that couldn't be fully resolved:

1. **Local server requirement for development testing**
   - What we know: ES6 modules throw CORS errors when loaded via `file://` protocol
   - What's unclear: Does user's current workflow (double-click HTML) work with modules, or does it need a server?
   - Recommendation: **Test both ways**. If `file://` fails, document local server requirement (VS Code Live Server, Python `http.server -m 8000`). Note: GitHub Pages deployment (future) will use `https://` so no issue in production.

2. **Module script execution timing vs DOMContentLoaded**
   - What we know: Modules are automatically deferred; they execute after HTML parsing
   - What's unclear: Does existing `DOMContentLoaded` wrapper still work correctly with module scripts?
   - Recommendation: **Keep existing DOMContentLoaded wrapper**. It's defensive and ensures DOM is ready. Module script timing + DOMContentLoaded is redundant but harmless. Don't change timing-sensitive code in extraction phase.

3. **Browser caching of module files during development**
   - What we know: Browsers cache JavaScript modules aggressively
   - What's unclear: Will developer (non-coder user) understand "hard refresh" (Ctrl+Shift+R) when changes don't appear?
   - Recommendation: **Document in verification steps**. Add note: "If changes don't appear, hard refresh (Ctrl+Shift+R) to bypass cache." Not a production concern.

4. **Test harness validation of createDiff HTML output**
   - What we know: `createDiff` returns objects with `old` and `new` HTML strings containing `<span>` tags
   - What's unclear: Does test harness validate HTML string format, or just that function runs without error?
   - Recommendation: **Browser smoke test is primary validation for createDiff**. Test harness validates data flow; browser validates HTML rendering. Ensure smoke test checks comparison tab with changed items.

## Sources

### Primary (HIGH confidence)
- [MDN JavaScript Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - Complete guide to ES6 modules in browsers
- [MDN import statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) - Import syntax and patterns
- [MDN export statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) - Export syntax and named exports
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html) - ECMAScript modules in Node.js (for test harness)

### Secondary (MEDIUM confidence)
- [SitePoint - Using ES Modules](https://www.sitepoint.com/using-es-modules/) - Browser module loading patterns and gotchas
- [DigitalOcean - ES6 Modules Tutorial](https://www.digitalocean.com/community/tutorials/js-modules-es6) - Import/export examples
- [Web Dev Simplified - ES6 Modules](https://blog.webdevsimplified.com/2021-11/es6-modules/) - Practical module patterns

### Project-Specific Sources
- `index.html` lines 648, 661, 742, 811, 2030 - Current inline utility function definitions
- `js/core/utils.js` - Existing module file with 4/5 functions already extracted
- `test/run-tests.js` line 8 - Test harness already imports from utils.js

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ES6 modules are W3C/ECMA standard, verified with MDN official documentation
- Architecture: HIGH - All patterns verified with MDN official sources and existing project code from Phase 1
- Pitfalls: HIGH - All 7 pitfalls based on MDN documentation and common ES6 module issues

**Research date:** 2026-02-07
**Valid until:** 120 days (very stable - ES6 modules unchanged since 2015; browser support since 2018)

**Key verification sources:**
- [MDN Web Docs](https://developer.mozilla.org) - All ES6 module specifications
- Project codebase inspection (index.html, js/core/utils.js, test/run-tests.js)
- Phase 1 implementation patterns (existing ES6 module usage validated)
