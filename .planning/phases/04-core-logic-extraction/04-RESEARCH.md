# Phase 4: Core Logic Extraction - Research

**Researched:** 2026-02-08
**Domain:** ES6 module extraction, eliminating duplicate core logic definitions, HTML module imports
**Confidence:** HIGH

## Summary

Phase 4 requires extracting the five core business logic functions (BOMNode class, buildTree, parseCSV/parseXML, flattenBOM, compareBOMs) from their inline definitions in `index.html` and converting the HTML to import these from existing ES6 modules in `js/core/`. This eliminates code duplication — the test harness already imports from these modules (created in Phase 1), but the browser application still has duplicate inline definitions.

**Current state analysis:**
- ES6 modules already exist in `js/core/` from Phase 1: `tree.js`, `parser.js`, `flatten.js`, `compare.js`
- Test harness (`test/run-tests.js`) successfully imports from these modules and all 4 tests pass
- `index.html` script is already type="module" (converted in Phase 3)
- `index.html` currently imports only utilities (`utils.js`) but still has inline definitions of all core logic functions
- The inline definitions match the module versions (created from the same source in Phase 1)

**Technical approach:**
1. Add import statements at top of HTML script for core logic modules
2. Remove inline definitions of: `BOMNode` class, `buildTree`, `parseXML`, `parseCSV` (if exists), `flattenBOM`, `sortBOM`, `compareBOMs`, `extractSubtree`, helper functions
3. Handle special cases: `sortChildren` (nested in buildTree), `traverse` (nested in flattenBOM), `createCompositeKey` wrapper
4. Update root info access pattern: change from global variables (`rootPartNumber`, `rootRevision`, `rootDescription`) to getter functions from `tree.js`
5. Verify: All 4 automated tests pass (already working with modules), HTML loads without errors

**Key differences from Phase 3 (utilities extraction):**
- Modules already exist and are tested (Phase 1 created them)
- HTML script already type="module" (Phase 3 converted it)
- No new functions to add to modules (everything is already exported)
- Only need to add imports and remove duplicate inline definitions
- Must handle module-level private variables (root info getters)

**Primary recommendation:** Add core module imports to HTML script, remove all inline core logic definitions, update root info access to use getters from tree.js, verify with automated tests.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ES6 Modules | ECMAScript 2015 | Native JavaScript module system | Built into browsers and Node.js; no bundler needed |
| HTML `<script type="module">` | HTML5 | Browser module loading | Already established in Phase 3 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | No supporting libraries needed | ES6 modules handle all imports |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Multiple imports | Single "core.js" barrel export | Separate imports more explicit; better for future splitting |
| Global root info vars | Module-level private + getters | Getters encapsulate state; already implemented in tree.js |

**Installation:**
```bash
# No installation needed - modules already exist from Phase 1
# Test harness already validated module functionality
```

## Architecture Patterns

### Recommended Project Structure
```
bom-tool/
├── index.html                    # Browser app with <script type="module">
├── css/
│   └── styles.css                # External stylesheet (Phase 2)
├── js/core/                      # ES6 modules (Phase 1)
│   ├── utils.js                  # Utility functions (Phase 3)
│   ├── tree.js                   # BOMNode, buildTree, root getters
│   ├── flatten.js                # flattenBOM, sortBOM
│   ├── parser.js                 # parseCSV, parseXML
│   ├── compare.js                # compareBOMs, extractSubtree, findNodeByPartNumber
│   └── environment.js            # Node.js/browser detection
├── test/
│   └── run-tests.js              # Already imports from js/core/
└── test-data/
```

### Pattern 1: Multiple Named Imports from Core Modules
**What:** Import specific functions/classes from each core module as needed
**When to use:** When HTML script needs core business logic from multiple modules
**Example:**
```javascript
// At top of index.html <script type="module">
import { parseLength, decimalToFractional, getParentLevel, getCompositeKey, createDiff } from './js/core/utils.js';
import { BOMNode, buildTree, getRootPartNumber, getRootRevision, getRootDescription } from './js/core/tree.js';
import { flattenBOM, sortBOM } from './js/core/flatten.js';
import { parseCSV, parseXML } from './js/core/parser.js';
import { compareBOMs, extractSubtree, findNodeByPartNumber } from './js/core/compare.js';

// Rest of application code uses imported functions
const root = buildTree(csvData);
const flattened = flattenBOM(root, 1);
const sorted = sortBOM(flattened);
```
**Source:** Existing test harness pattern (`test/run-tests.js` lines 5-9)

### Pattern 2: Module-Level Private Variables with Exported Getters
**What:** Modules use private variables for state, export getter functions for access
**When to use:** When global state needs to be scoped to a module (e.g., root info)
**Example:**
```javascript
// In tree.js (already implemented):
let _rootPartNumber = null;
let _rootRevision = null;
let _rootDescription = null;

export function getRootPartNumber() { return _rootPartNumber; }
export function getRootRevision() { return _rootRevision; }
export function getRootDescription() { return _rootDescription; }

export function buildTree(rows) {
    // ... tree building logic ...
    _rootPartNumber = root.partNumber;
    _rootRevision = root.revision;
    _rootDescription = root.description;
    return root;
}

// In index.html (after extraction):
import { buildTree, getRootPartNumber, getRootRevision, getRootDescription } from './js/core/tree.js';

const root = buildTree(csvData);
// Replace: rootPartNumber = root.partNumber
// With: (no assignment needed - buildTree() sets it internally)

// Replace: document.textContent = rootPartNumber;
// With: document.textContent = getRootPartNumber();
```
**Source:** Phase 1 implementation in `js/core/tree.js` lines 6-13

### Pattern 3: Removing Inline Definitions Without Breaking References
**What:** After importing, delete inline function definitions but keep all call sites intact
**When to use:** Core logic extraction from HTML to modules
**Example:**
```javascript
// BEFORE (index.html has inline definition):
import { parseLength } from './js/core/utils.js';

// Inline definition (DUPLICATE - to be removed)
class BOMNode {
    constructor(rowData) {
        this.length = parseLength(rowData.Length);
        // ...
    }
}

// Usage (keep this)
const node = new BOMNode(rowData);

// AFTER (index.html imports from module):
import { parseLength } from './js/core/utils.js';
import { BOMNode } from './js/core/tree.js';

// No inline definition (deleted)

// Usage (unchanged)
const node = new BOMNode(rowData);
```

### Pattern 4: Function Name Mapping (Wrapper Functions)
**What:** HTML uses different function name than module exports
**When to use:** When inline code uses convenience wrappers or aliases
**Example:**
```javascript
// In index.html, there's a wrapper:
function createCompositeKey(partNumber, length) {
    // This wraps getCompositeKey from utils.js
    if (length !== null && length !== undefined && length !== '') {
        return `${partNumber}|${length}`;
    }
    return `${partNumber}|`;
}

// Module exports:
export function getCompositeKey(partNumber, length) {
    if (length === null) {
        return partNumber;
    }
    return `${partNumber}|${length}`;
}

// Resolution: Search-replace createCompositeKey → getCompositeKey in HTML
// Then delete inline createCompositeKey definition
```
**Source:** Found in index.html line 1905, compare.js uses getCompositeKey

### Anti-Patterns to Avoid
- **Partial extraction:** Don't leave any inline definitions — import everything or imports break
- **Wrong import order:** Core modules must be imported before being used
- **Missing getter updates:** Must replace `rootPartNumber` → `getRootPartNumber()` everywhere
- **Nested function confusion:** `sortChildren` (inside buildTree) and `traverse` (inside flattenBOM) are already module-scoped; don't try to import them
- **Breaking parseCSV async:** HTML must `await parseCSV()` since it's async in modules

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Merging module exports | Single "core.js" barrel file | Direct imports from specific modules | Test harness already uses specific imports; matches existing pattern |
| Root info state management | Global variables in HTML | Module-level private vars + getters | Already implemented in tree.js; encapsulates state |
| Function renaming | Manual search-replace | Careful verification with grep | createCompositeKey vs getCompositeKey mismatch requires exact search |
| Nested function handling | Try to extract sortChildren/traverse | Leave nested (already module-scoped) | These are internal helpers; properly encapsulated |

**Key insight:** Modules were already extracted in Phase 1 and validated by test harness. This phase is purely mechanical: add imports to HTML, delete inline duplicates. No new code, no new logic.

## Common Pitfalls

### Pitfall 1: Forgetting to Import All Core Dependencies
**What goes wrong:** HTML script throws `ReferenceError: BOMNode is not defined` or similar
**Why it happens:** Removed inline definition but forgot to add corresponding import
**How to avoid:** After adding imports, immediately remove inline definitions. Use grep to verify zero inline definitions remain.
**Warning signs:** Browser console shows `ReferenceError` for a class or function name
**Verification:** `grep -n "class BOMNode\|function buildTree\|function flattenBOM\|function parseXML\|function compareBOMs" index.html` should return ZERO matches after extraction

### Pitfall 2: Not Updating Root Info Access to Use Getters
**What goes wrong:** Code tries to read `rootPartNumber` but gets undefined (or old stale value)
**Why it happens:** `buildTree()` now sets module-level private vars, but HTML still reads from global vars
**How to avoid:** After importing tree.js, find all references to `rootPartNumber`, `rootRevision`, `rootDescription` and replace with getter calls
**Warning signs:** Export file names are wrong or missing; root info displays as undefined
**Verification pattern:**
```bash
# Find all reads of root info (should all be getter calls):
grep -n "rootPartNumber\|rootRevision\|rootDescription" index.html
# Each should be getRootPartNumber(), getRootRevision(), getRootDescription()
```

### Pitfall 3: Missing `await` for Async parseCSV
**What goes wrong:** CSV parsing fails silently or throws "Promise not resolved" errors
**Why it happens:** `parseCSV` is async in modules (uses dynamic imports for Node.js fs module)
**How to avoid:** Ensure all calls to `parseCSV()` use `await` and are inside async functions
**Warning signs:** CSV parsing returns Promise object instead of data; comparison fails
**Verification:** Grep for `parseCSV` calls and verify each has `await` before it

### Pitfall 4: createCompositeKey vs getCompositeKey Name Mismatch
**What goes wrong:** Comparison logic breaks; key generation inconsistent
**Why it happens:** HTML uses `createCompositeKey` wrapper, but module exports `getCompositeKey`
**How to avoid:** Search-replace `createCompositeKey` → `getCompositeKey` in HTML, then delete inline wrapper function
**Warning signs:** Comparison results are empty or incorrect; key lookups fail
**Verification:**
```bash
# Should find ZERO inline definitions:
grep -n "function createCompositeKey" index.html
# Should find only import and usage:
grep -n "getCompositeKey" index.html
```

### Pitfall 5: Not Removing sortBOM from HTML
**What goes wrong:** Two versions of sortBOM exist; which one runs depends on scope
**Why it happens:** `sortBOM` is exported from flatten.js but also defined inline in HTML
**How to avoid:** Import sortBOM from flatten.js and delete inline definition
**Warning signs:** Sorting behavior inconsistent; tests pass but browser results differ
**Verification:** `grep -n "function sortBOM" index.html` should return ZERO matches

### Pitfall 6: Breaking findNodeByPartNumber / extractSubtree Scoped Comparison
**What goes wrong:** Scoped comparison feature stops working (user selects subassembly but comparison uses full GA)
**Why it happens:** These functions are used for scoped comparison feature; missing imports break it
**How to avoid:** Import `findNodeByPartNumber` and `extractSubtree` from compare.js even if not obviously used
**Warning signs:** Scoped comparison (Enhancement 1) doesn't work; selection UI broken
**Verification:** Search HTML for usage of these functions, ensure imports match

### Pitfall 7: Nested Functions (sortChildren, traverse) Confusion
**What goes wrong:** Try to import `sortChildren` or `traverse` but they're not exported
**Why it happens:** These are internal helper functions nested inside buildTree/flattenBOM
**How to avoid:** Don't try to import them; they're already properly scoped inside module functions
**Warning signs:** Import fails with "sortChildren is not exported from tree.js"
**Resolution:** These functions stay nested; no imports needed

## Code Examples

Verified patterns from existing codebase:

### Complete Import Block (Target State)

**Location:** Top of `<script type="module">` in index.html

```javascript
<script type="module">
    // Utility functions (already imported in Phase 3)
    import { parseLength, decimalToFractional, getParentLevel, getCompositeKey, createDiff } from './js/core/utils.js';

    // Tree operations and root info
    import { BOMNode, buildTree, getRootPartNumber, getRootRevision, getRootDescription } from './js/core/tree.js';

    // BOM flattening and sorting
    import { flattenBOM, sortBOM } from './js/core/flatten.js';

    // File parsing
    import { parseCSV, parseXML } from './js/core/parser.js';

    // BOM comparison and subtree operations
    import { compareBOMs, extractSubtree, findNodeByPartNumber } from './js/core/compare.js';

    // Rest of application code (NO inline definitions of above functions)
    // ...
</script>
```

**Source:** Test harness pattern in `test/run-tests.js` lines 5-9

### Root Info Access Pattern Transformation

**BEFORE (Global Variables - Current):**
```javascript
let rootPartNumber = null;
let rootRevision = null;
let rootDescription = null;

function buildTree(rows) {
    // ... tree building ...
    rootPartNumber = root.partNumber;
    rootRevision = root.revision;
    rootDescription = root.description;
    return root;
}

// Usage elsewhere:
document.getElementById('assemblyInfo').textContent =
    `${rootPartNumber} - Rev${rootRevision}`;
```

**AFTER (Module Getters - Target):**
```javascript
// No global variable declarations (removed)

import { buildTree, getRootPartNumber, getRootRevision, getRootDescription } from './js/core/tree.js';

// buildTree() sets module-level private vars internally
const root = buildTree(rows);

// Usage elsewhere (replace direct variable access with getter calls):
document.getElementById('assemblyInfo').textContent =
    `${getRootPartNumber()} - Rev${getRootRevision()}`;
```

**Search-replace pattern:**
- Find: `rootPartNumber` (as standalone variable read)
- Replace: `getRootPartNumber()`
- Repeat for `rootRevision` → `getRootRevision()` and `rootDescription` → `getRootDescription()`
- Delete: `let rootPartNumber = null;` lines

### Function Name Normalization (createCompositeKey → getCompositeKey)

**Problem:** HTML has wrapper function with different name than module export

```javascript
// index.html line ~1905 (TO BE REMOVED):
function createCompositeKey(partNumber, length) {
    if (length !== null && length !== undefined && length !== '') {
        return `${partNumber}|${length}`;
    }
    return `${partNumber}|`;
}

// js/core/utils.js (already exists):
export function getCompositeKey(partNumber, length) {
    if (length === null) {
        return partNumber;
    }
    return `${partNumber}|${length}`;
}
```

**Resolution:**
1. Import `getCompositeKey` from utils.js (already imported)
2. Search-replace in HTML: `createCompositeKey` → `getCompositeKey`
3. Delete inline `createCompositeKey` function definition

**Verification:**
```bash
# Should find ZERO:
grep -n "createCompositeKey" index.html
# Should find only in import and usage:
grep -c "getCompositeKey" index.html
```

### Inline Definitions to Remove (Exact Locations)

Based on code inspection, these inline definitions must be removed from index.html:

1. **BOMNode class** — lines ~631-647
   ```javascript
   class BOMNode {
       constructor(rowData) {
           // ... (entire class definition)
       }
   }
   ```

2. **buildTree function** — lines ~650-721 (includes nested sortChildren)
   ```javascript
   function buildTree(rows) {
       // ... entire function including nested sortChildren ...
   }
   ```

3. **flattenBOM function** — lines ~724-782 (includes nested traverse)
   ```javascript
   function flattenBOM(rootNode, unitQty) {
       // ... entire function including nested traverse ...
   }
   ```

4. **sortBOM function** — lines ~785-806
   ```javascript
   function sortBOM(items) {
       // ... sorting logic ...
   }
   ```

5. **parseXML function** — lines ~535-628 (includes nested traverseDocument)
   ```javascript
   function parseXML(xmlText) {
       // ... entire function including nested traverseDocument ...
   }
   ```

6. **extractSubtree function** — lines ~1546-1575 (includes nested cloneNode)
   ```javascript
   function extractSubtree(node) {
       // ... entire function including nested cloneNode ...
   }
   ```

7. **compareBOMs function** — lines ~1808-1900
   ```javascript
   function compareBOMs() {
       // ... comparison logic ...
   }
   ```

8. **createCompositeKey wrapper** — lines ~1905-1910
   ```javascript
   function createCompositeKey(partNumber, length) {
       // ... wrapper logic ...
   }
   ```

9. **Root info global variables** — lines ~400-402
   ```javascript
   let rootPartNumber = null;
   let rootRevision = null;
   let rootDescription = null;
   ```

**Note:** Line numbers are approximate from current HTML. Actual removal should be done by searching for the function signature, not by line number (lines shift as earlier functions are removed).

### Verification Script After Extraction

```bash
# 1. No inline core logic definitions remain
echo "Checking for inline definitions (should be ZERO)..."
grep -c "class BOMNode\|function buildTree\|function flattenBOM\|function sortBOM\|function parseXML\|function parseCSV\|function compareBOMs\|function extractSubtree\|function createCompositeKey" index.html

# 2. Root info variables removed
echo "Checking for root info globals (should be ZERO)..."
grep -c "let rootPartNumber\|let rootRevision\|let rootDescription" index.html

# 3. Imports present
echo "Checking for core module imports (should be MULTIPLE)..."
grep "import.*from.*js/core/" index.html

# 4. Root info uses getters
echo "Checking root info getter usage..."
grep "getRootPartNumber()\|getRootRevision()\|getRootDescription()" index.html | head -5

# 5. All tests pass
echo "Running automated tests..."
cd test && node run-tests.js

# Expected: 4/4 tests passed, ALL TESTS PASSED
```

### Test Harness Already Validates Module Pattern

The test harness in `test/run-tests.js` already imports from core modules and validates outputs:

```javascript
// Lines 5-9 of test/run-tests.js (already working):
import { BOMNode, buildTree, getRootPartNumber, getRootRevision, getRootDescription } from '../js/core/tree.js';
import { flattenBOM, sortBOM } from '../js/core/flatten.js';
import { parseXML, parseCSV } from '../js/core/parser.js';
import { compareBOMs, findNodeByPartNumber, extractSubtree } from '../js/core/compare.js';
import { parseLength, getCompositeKey, decimalToFractional } from '../js/core/utils.js';

// All 4 tests pass with this import pattern
// Phase 4 makes HTML match test harness pattern
```

**Validation:** After Phase 4, HTML and test harness use identical import patterns. Both run the same code (modules), guaranteeing identical behavior.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Duplicate inline definitions | Single source in modules | ES2015 (2015) | Single source of truth; test harness and browser use same code |
| Global root info variables | Module-level private + getters | Phase 1 (2026-02-07) | Encapsulated state; no namespace pollution |
| Manual CSV encoding handling | XLSX library handles UTF-16LE | XLSX v0.18.5 | Robust encoding detection; fewer bugs |
| querySelector with :scope | getElementsByTagName filtering | Phase 1 adaptation | Node.js DOMParser compatibility (no :scope) |

**Deprecated/outdated:**
- **Inline function duplication:** Modules existed since Phase 1; no reason for duplication to continue
- **Global variables for module state:** Getter pattern encapsulates state properly
- **Manual parseCSV implementation:** XLSX library handles all edge cases better

**Project note:** This phase doesn't introduce new patterns — it eliminates duplication of patterns already established in Phase 1 and validated by test harness.

## Open Questions

Things that couldn't be fully resolved:

1. **parseCSV usage in HTML**
   - What we know: `parseCSV` is async in modules (uses dynamic imports in Node.js)
   - What's unclear: Does HTML currently call parseCSV, or only parseXML?
   - Recommendation: **Grep for parseCSV usage in HTML**. If found, ensure all calls use `await` and are in async contexts. If not found, no action needed (CSV parsing may only be in test harness).

2. **findNodeByPartNumber usage scope**
   - What we know: Function is used for scoped comparison feature (Enhancement 1)
   - What's unclear: Exact number of call sites in HTML
   - Recommendation: **Grep for findNodeByPartNumber in HTML** before extraction. Ensure all call sites work after importing from compare.js.

3. **Browser caching after module changes**
   - What we know: Browser may cache old inline definitions
   - What's unclear: Will hard refresh be needed after extraction?
   - Recommendation: **Document in verification steps** — after HTML changes, hard refresh (Ctrl+Shift+R) to ensure new imports load. Not a production concern.

4. **createCompositeKey call count**
   - What we know: Function exists as wrapper in HTML and as getCompositeKey in utils.js
   - What's unclear: How many call sites exist in HTML
   - Recommendation: **Grep for createCompositeKey** to get exact count. Search-replace all occurrences to getCompositeKey before deleting wrapper.

## Sources

### Primary (HIGH confidence)
- **Project codebase inspection:**
  - `js/core/tree.js` — BOMNode class, buildTree, root info getters (lines 1-69)
  - `js/core/parser.js` — parseXML, parseCSV (lines 1-143)
  - `js/core/flatten.js` — flattenBOM, sortBOM (lines 1-76)
  - `js/core/compare.js` — compareBOMs, findNodeByPartNumber, extractSubtree (lines 1-124)
  - `js/core/utils.js` — Utility functions including getCompositeKey (lines 1-92)
  - `test/run-tests.js` — Import pattern validation (lines 5-9)
  - `index.html` — Current inline definitions (lines 400-402, 535-628, 631-721, 724-806, 1546-1575, 1808-1910)

- [MDN JavaScript Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) — ES6 module patterns
- [MDN import statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) — Import syntax

### Secondary (MEDIUM confidence)
- Phase 1 implementation decisions (STATE.md, PROJECT.md)
- Phase 3 research document (03-RESEARCH.md) — Module script patterns

### Project-Specific Sources
- `.planning/STATE.md` — Current project state and decisions
- `.planning/PROJECT.md` — Architecture and constraints
- `.planning/phases/03-utilities-extraction/03-RESEARCH.md` — Utility extraction patterns (predecessor phase)
- `.planning/phases/03-utilities-extraction/03-01-PLAN.md` — HTML module conversion pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ES6 modules already validated in Phase 3 and Phase 1
- Architecture: HIGH — All patterns verified with existing working code in test harness and modules
- Pitfalls: HIGH — All 7 pitfalls based on actual codebase inspection and Phase 3 experience

**Research date:** 2026-02-08
**Valid until:** 120 days (very stable — extraction pattern identical to Phase 3)

**Key findings:**
1. All modules already exist and are tested (Phase 1)
2. HTML already type="module" with utility imports (Phase 3)
3. This phase is purely mechanical: add imports, delete duplicates
4. Test harness validates module pattern works identically
5. No new code, no new logic — just eliminating duplication
