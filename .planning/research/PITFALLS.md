# Domain Pitfalls: Monolithic-to-Modular Vanilla JavaScript Refactoring

**Domain:** Refactoring production single-file web application to multi-file modular architecture
**Researched:** 2026-02-07
**Context:** Mission-critical tool (4400 lines → ~15 files), zero tolerance for breakage, non-technical owner

## Critical Pitfalls

Mistakes that cause production breakage or require complete rollback.

### Pitfall 1: Script Load Order Dependency Violations

**What goes wrong:** Functions called before they're defined. Module A imports Module B which calls function from Module A before A finishes loading.

**Why it happens:**
- In single file, all functions are hoisted or sequentially available in one parse pass
- With modules, browser loads in parallel and dependency order matters
- Event listeners attached to `DOMContentLoaded` may fire before module scripts finish executing
- Module scripts are deferred by default but execution order between modules isn't guaranteed without explicit dependency chains

**Consequences:**
- `Uncaught ReferenceError: [function] is not defined`
- Event handlers silently fail (listener attached to non-existent function)
- Intermittent failures (race conditions based on network speed)
- Works in dev, breaks in production (caching/timing differences)

**Prevention:**
1. Map all function call dependencies BEFORE splitting files
2. Use explicit ES6 `import` statements to declare dependencies (forces correct load order)
3. Test on slow network connection (DevTools throttling) to expose race conditions
4. For event listeners: Use `addEventListener` inside module after DOM elements exist, not at module top-level
5. Verify `document.readyState` before attaching listeners if using module scripts

**Detection:**
- Console errors: `ReferenceError` or `TypeError: [X] is not a function`
- Features that "sometimes work" (race condition)
- Works in browser cache, fails on hard refresh

**Phase mapping:** Phase 1 (Dependency Analysis) must create explicit dependency graph before any file splitting.

**Severity:** CATASTROPHIC - Production breakage

**Sources:**
- [JavaScript modules - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [DOMContentLoaded Event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [Module Loading Order Patterns](https://exploringjs.com/es6/ch_modules.html)

---

### Pitfall 2: Global State Fragmentation

**What goes wrong:** Global variables split across modules become inaccessible or duplicated. ~20 global variables in BOM Tool (csvData, flattenedBOM, oldBomData, etc.) must remain shared across all modules.

**Why it happens:**
- Module scope isolates variables by default (modules have their own scope, not global)
- Developer assumes `let csvData` in module A is same as `csvData` in module B
- Each module gets its own copy if not explicitly exported/imported
- Top-level code in modules runs at import time, potentially initializing state multiple times

**Consequences:**
- Tab switching breaks (each tab's module has different state instance)
- File uploads don't propagate to comparison logic
- Silent data corruption (writing to wrong state instance)
- Memory leaks (multiple copies of large BOM datasets)

**Prevention:**
1. Create single `state.js` module exporting all global variables as named exports
2. All other modules import state from single source: `import { csvData, flattenedBOM } from './state.js'`
3. Mutation must happen on imported references (objects/arrays work, primitives need wrapper or state setters)
4. Document state ownership: which module reads vs writes each variable
5. Consider state getter/setter pattern for primitives:
   ```javascript
   // state.js
   let _rootPartNumber = null;
   export function getRootPartNumber() { return _rootPartNumber; }
   export function setRootPartNumber(val) { _rootPartNumber = val; }
   ```

**Detection:**
- Features work in isolation but break when combined
- "Works first time, breaks on second use"
- Tab A doesn't see data from Tab B
- Console logging shows different values in different modules

**Phase mapping:** Phase 2 (State Module Design) must run before any business logic splitting.

**Severity:** CATASTROPHIC - Core functionality breaks silently

**Sources:**
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)
- [JavaScript Scope and Closures](https://medium.com/samsung-internet-dev/javascript-scope-and-closures-3666c4fdf2c2)
- [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/)

---

### Pitfall 3: CDN Dependency Timing Violations

**What goes wrong:** SheetJS (xlsx.js) loaded from CDN must be available before any parsing code runs. If module scripts execute before CDN script loads, `XLSX` global is undefined.

**Why it happens:**
- Regular `<script src="cdn...">` loads and executes in document order
- `<script type="module">` scripts are deferred by default (execute after HTML parsed)
- But if CDN is slow, module may execute before CDN script completes
- Module loading is parallel and non-blocking; doesn't wait for non-module scripts

**Consequences:**
- `Uncaught ReferenceError: XLSX is not defined`
- All Excel export features break
- Error appears intermittent (depends on CDN speed vs module load time)
- Works with browser cache, fails without

**Prevention:**
1. Load CDN libraries as modules if available: `<script type="module" src="...">`
2. If library isn't ES6 module, use dynamic import to ensure availability:
   ```javascript
   // Instead of assuming XLSX exists globally
   async function exportExcel() {
       if (!window.XLSX) {
           throw new Error('XLSX library not loaded');
       }
       // ... use XLSX
   }
   ```
3. Wait for CDN load before module execution:
   ```javascript
   // In module that uses XLSX
   await new Promise(resolve => {
       if (window.XLSX) resolve();
       else {
           const checkXLSX = setInterval(() => {
               if (window.XLSX) { clearInterval(checkXLSX); resolve(); }
           }, 50);
       }
   });
   ```
4. Or bundle SheetJS with modules (increases file size but removes timing dependency)
5. Add error handling with clear message if CDN fails

**Detection:**
- `ReferenceError: XLSX is not defined` in console
- Excel export buttons don't work
- Fails on first load, works after refresh (cache)
- Network tab shows module scripts finish before CDN script

**Phase mapping:** Phase 3 (External Dependencies) must address CDN timing before feature modules are split.

**Severity:** CATASTROPHIC - Core feature (Excel export) completely broken

**Sources:**
- [ES6 Modules + Other Libraries](https://discourse.threejs.org/t/es6-modules-other-three-libraries/17500)
- [Real World Experience with ES6 Modules in Browsers](https://salomvary.com/es6-modules-in-browsers.html)
- [ESM>CDN Documentation](https://esm.sh/)

---

### Pitfall 4: DOM Reference Timing (Event Listeners Before Elements Exist)

**What goes wrong:** Code like `document.getElementById('uploadZone').addEventListener(...)` executes before DOM element exists. In single file this works because script is at bottom after HTML. With modules, execution timing changes.

**Why it happens:**
- Module scripts defer by default, but may execute before `DOMContentLoaded`
- During refactor, DOM query code moves from bottom of file to module top-level
- If module imports run initialization code, elements may not exist yet
- `document.readyState` may be "interactive" when module executes (HTML parsed, but `DOMContentLoaded` not fired)

**Consequences:**
- `Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')`
- All event handlers fail silently (no error if check exists: `element?.addEventListener`)
- Upload zones, buttons, dropdowns don't respond
- Tab switching breaks

**Prevention:**
1. Wrap DOM initialization in function, call after `DOMContentLoaded`:
   ```javascript
   // module.js
   export function initUploadHandlers() {
       const uploadZone = document.getElementById('uploadZone');
       uploadZone.addEventListener('click', ...);
   }

   // main.js
   if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', initUploadHandlers);
   } else {
       initUploadHandlers(); // DOM already ready
   }
   ```
2. Never execute DOM queries at module top-level
3. Check `document.readyState` before attaching listeners in modules
4. Use defensive checks: `element?.addEventListener` or `if (element) { element.addEventListener }`
5. Keep module code pure (functions that take DOM elements as parameters, not queries)

**Detection:**
- `TypeError: Cannot read properties of null`
- Buttons and upload zones don't respond to clicks
- Console shows `null` for `document.getElementById` calls
- Works when called from browser console (after DOMContentLoaded), fails on load

**Phase mapping:** Phase 4 (Event Binding Architecture) must establish DOM-ready pattern before UI modules split.

**Severity:** CATASTROPHIC - All user interactions broken

**Sources:**
- [DOMContentLoaded vs load Events](https://javascript.info/onload-ondomcontentloaded)
- [JavaScript DOMContentLoaded Event](https://www.javascripttutorial.net/javascript-dom/javascript-domcontentloaded/)
- [DOM Manipulation Best Practices](https://curriculum.turing.edu/module2/lessons/js_intro_to_dom_manipulation)

---

### Pitfall 5: Circular Dependencies (Module A ↔ Module B)

**What goes wrong:** Module A imports function from Module B. Module B imports function from Module A. JavaScript can't resolve which loads first; one module gets incomplete exports.

**Why it happens:**
- In single file, all functions are available in same scope (no import/export)
- During refactor, natural grouping creates cycles:
  - `parser.js` needs `buildTree()` from `tree.js`
  - `tree.js` needs `parseLength()` from `parser.js`
- Looks fine logically but breaks module loading

**Consequences:**
- `Uncaught ReferenceError` for functions from circularly dependent module
- Modules execute in partial state (some exports undefined)
- Hard to debug (error location points to import statement, not logical error)
- Works in some bundlers (Webpack), fails in native ES6 modules in browser

**Prevention:**
1. Detect circular dependencies BEFORE committing:
   - Use `madge` CLI tool: `npx madge --circular src/`
   - ESLint rule: `import/no-cycle`
2. Break cycles by extracting shared code to third module:
   ```
   BEFORE (circular):
   parser.js → tree.js → parser.js

   AFTER (acyclic):
   parser.js → utils.js
   tree.js → utils.js
   ```
3. Move shared utilities (`parseLength`, `getParentLevel`) to `utils.js`
4. Design rule: "Leaf modules" (utils, helpers) import nothing. "Branch modules" (features) import leaves only.
5. If cycle is unavoidable, use dynamic import: `const { fn } = await import('./module.js')`

**Detection:**
- `ReferenceError` at import statement
- Some exports are `undefined` when imported
- Code works when functions are inline, breaks when modularized
- `madge` or ESLint reports cycles

**Phase mapping:** Phase 1 (Dependency Analysis) must map dependency graph and flag potential cycles.

**Severity:** CATASTROPHIC - Modules fail to load

**Sources:**
- [How to Fix Circular Dependencies in JavaScript](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de)
- [Eliminating Circular Dependencies](https://spin.atomicobject.com/circular-dependencies-javascript/)
- [Analyzing ES6 Circular Dependencies](https://railsware.com/blog/how-to-analyze-circular-dependencies-in-es6/)

---

### Pitfall 6: Test Harness Breakage (Function Extraction Pattern Fails)

**What goes wrong:** Existing test harness uses regex to extract functions from single HTML file. After splitting into modules, extraction regex fails or becomes impossibly complex.

**Why it happens:**
- Current approach: Read HTML file, extract `<script>` block, eval functions
- After refactor: Functions spread across 15+ files with import/export syntax
- Test harness assumes single-file structure
- Can't easily eval ES6 modules (module scope, import statements)

**Consequences:**
- All automated tests break immediately
- No validation that refactor preserves behavior
- Forced to test manually (slow, error-prone, insufficient for 4400 lines)
- Zero confidence in production deployment

**Prevention:**
1. Refactor test harness BEFORE or IN PARALLEL with code refactor
2. New test approach options:
   - **Option A (Native ES6):** Import modules directly in Node.js test runner (requires Node.js 14+)
   - **Option B (JSDOM):** Use JSDOM to load HTML with modules in test environment
   - **Option C (Bundler):** Bundle modules for testing (Rollup/esbuild), test bundle output
3. Update test harness first in separate commit
4. Validate test harness works with single-file version before refactor
5. Run tests continuously during refactor (CI pipeline)

**Test harness refactor steps:**
```javascript
// Before (regex extraction from HTML)
const scriptContent = fs.readFileSync('index.html', 'utf8')
    .match(/<script>([\s\S]+)<\/script>/)[1];
eval(scriptContent);

// After (ES6 module imports)
import { buildTree, flattenBOM, compareBOMs } from '../src/bom-logic.js';
// Tests use imported functions directly
```

**Detection:**
- Test runner throws syntax errors on `import`/`export` statements
- Tests can't find functions (extraction regex fails)
- Tests pass on old version, fail on refactored version with identical logic

**Phase mapping:** Phase 0 (Test Infrastructure Upgrade) must happen BEFORE any code refactoring.

**Severity:** CRITICAL - Cannot validate refactor correctness without tests

**Sources:**
- [JavaScript Test Harness Documentation](https://web-platform-tests.org/writing-tests/testharness.html)
- [Testing Strategies 2026](https://www.qable.io/blog/top-5-javascript-test-automation-frameworks-in-2026)
- [React Testing Library Guide](https://thinksys.com/qa-testing/react-testing-library-complete-guide-2023/)

---

## Major Pitfalls

Mistakes that cause significant issues but don't break core functionality.

### Pitfall 7: CSS Selector Decoupling

**What goes wrong:** JavaScript relies on specific CSS class names (`uploadZone`, `dragover`, `has-file`). After refactoring, CSS classes are renamed or element structure changes, breaking styling.

**Why it happens:**
- Single file keeps HTML, CSS, JavaScript together (easy to see dependencies)
- After split, CSS in separate file, developer changes class names for "clarity"
- JavaScript still references old class names
- No compile-time error (class names are strings)

**Consequences:**
- Upload zones don't show visual feedback on drag/drop
- Buttons don't show hover states
- Tables lose styling (look broken but function works)
- Doesn't break functionality, but looks unprofessional/broken to users

**Prevention:**
1. Document CSS classes used by JavaScript (comment in CSS file)
2. Use data attributes for JavaScript selectors, classes for styling:
   ```html
   <!-- Before -->
   <div id="uploadZone" class="upload-zone">

   <!-- After (decoupled) -->
   <div id="uploadZone" class="upload-zone" data-js="file-upload">

   // JavaScript
   document.querySelector('[data-js="file-upload"]')
   ```
3. Test visual appearance after refactor (screenshot comparison)
4. Keep CSS class names in sync with JavaScript constants
5. Use TypeScript or JSDoc to type CSS class strings

**Detection:**
- Elements visible but unstyled
- Drag-and-drop visual states don't change
- Buttons don't highlight on hover
- Console warnings: "Element not found" but functionality works

**Phase mapping:** Phase 5 (UI Module Split) must maintain CSS class contracts.

**Severity:** MAJOR - Breaks user experience, not functionality

**Sources:**
- [Stop Using CSS Selectors for Non-CSS](https://css-tricks.com/stop-using-css-selectors-non-css/)
- [CSS Selectors Not Working](https://blog.pixelfreestudio.com/css-selectors-not-working-heres-what-you-might-be-missing/)
- [Refactoring DOM Heavy JS](https://www.jackfranklin.co.uk/blog/refactoring-js/)

---

### Pitfall 8: Module Scope Closure Breakage

**What goes wrong:** Functions that relied on closure over outer scope variables break when moved to different module.

**Example from BOM Tool:**
```javascript
// Before (single file)
let rootPartNumber = null; // Global
function buildTree(rows) {
    rootPartNumber = rows[0]['Part Number']; // Closure captures global
}
function displayResults() {
    console.log(rootPartNumber); // Accesses captured global
}

// After (broken - modules have own scope)
// tree.js
let rootPartNumber = null; // Module-scoped (not same as state.js)
export function buildTree(rows) {
    rootPartNumber = rows[0]['Part Number']; // Sets LOCAL var
}

// display.js
import { rootPartNumber } from './state.js'; // Different instance!
export function displayResults() {
    console.log(rootPartNumber); // Still null (state.js not mutated)
}
```

**Why it happens:**
- JavaScript closures capture variable references from outer scopes
- Module scope replaces global scope, breaking closure chains
- Variables with same name in different modules are different instances

**Consequences:**
- Functions read stale/null values
- State mutations in one module don't propagate
- "Worked fine before refactor" syndrome

**Prevention:**
1. Audit all closures before splitting (search for `let`/`const`/`var` at top of script)
2. Shared state must be in single module, imported as reference
3. For primitive mutations, use setter pattern or object wrapper:
   ```javascript
   // state.js
   export const state = {
       rootPartNumber: null // Object property can be mutated
   };

   // tree.js
   import { state } from './state.js';
   state.rootPartNumber = 'ABC-123'; // Mutates shared object

   // display.js
   import { state } from './state.js';
   console.log(state.rootPartNumber); // Sees mutation
   ```

**Detection:**
- Functions return undefined/null unexpectedly
- State seems to "reset" between function calls
- Values correct in one module, wrong in another

**Phase mapping:** Phase 2 (State Module Design) must identify all closure dependencies.

**Severity:** MAJOR - Data flow breaks between modules

**Sources:**
- [JavaScript Closures and Module Pattern](https://www.joezimjs.com/javascript/javascript-closures-and-the-module-pattern/)
- [Understanding Scope and Closure Issues](https://codedamn.com/news/javascript/javascript-scope-and-closure-issues)
- [Variable Scope and Closures](https://javascript.info/closure)

---

### Pitfall 9: File Organization Chaos (No Clear Structure)

**What goes wrong:** Files split randomly by size/convenience, not logical boundaries. After refactor: 15 files with unclear responsibilities, confusing imports.

**Why it happens:**
- Developer starts splitting without plan: "This function is big, move it to new file"
- No coherent architecture (utils mixed with business logic mixed with UI)
- Import graph becomes tangled web
- Can't find where functionality lives

**Consequences:**
- Maintenance nightmare (where does this function go?)
- New features don't have obvious home
- Import chains become deeply nested (`a → b → c → d → e`)
- Refactor effort wasted (just as hard to navigate as single file)

**Prevention:**
1. Design file structure BEFORE splitting (architectural phase)
2. Organize by domain, not file size:
   ```
   src/
   ├── core/
   │   ├── parser.js       (CSV/XML parsing)
   │   ├── tree.js         (BOMNode, buildTree)
   │   └── flattener.js    (flattenBOM logic)
   ├── features/
   │   ├── comparison.js   (compareBOMs)
   │   └── hierarchy.js    (tree rendering)
   ├── ui/
   │   ├── upload.js       (file upload handlers)
   │   ├── display.js      (table rendering)
   │   └── export.js       (Excel/HTML export)
   ├── utils/
   │   ├── math.js         (decimalToFractional, parseLength)
   │   └── dom.js          (DOM helpers)
   └── state.js            (global state)
   ```
3. Rule: "Each file has single clear responsibility (one sentence description)"
4. Limit import depth (max 3 levels: leaf → branch → root)
5. Document file structure in README

**Detection:**
- Developer can't find where feature is implemented
- Multiple files with overlapping responsibilities
- Import statements span 5+ files in chain
- "Where does this go?" conversations

**Phase mapping:** Phase 1 (Architecture Design) must define file structure before splitting.

**Severity:** MAJOR - Long-term maintenance cost, not immediate breakage

**Sources:**
- [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/)
- [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html)
- [Common JavaScript Module Mistakes](https://moldstud.com/articles/p-common-javascript-module-mistakes-tips-to-avoid-common-pitfalls)

---

### Pitfall 10: Export Quality Degradation (Named vs Default Exports)

**What goes wrong:** Mixing default and named exports inconsistently. Auto-import tools fail, refactoring becomes risky.

**Why it happens:**
- JavaScript allows both: `export default fn` and `export { fn }`
- Default exports seem simpler initially
- But when renaming, default exports don't update in consumers
- No editor autocomplete for default export names

**Consequences:**
- Rename function in source file, consumers still use old name (no error)
- Can't tree-shake unused exports with default
- Import statements inconsistent: `import X from 'a'` vs `import { Y } from 'b'`
- Editor autocomplete doesn't work reliably

**Prevention:**
1. RULE: Use named exports only (no default exports)
   ```javascript
   // BAD
   export default function flattenBOM() { ... }

   // GOOD
   export function flattenBOM() { ... }
   ```
2. Exception: If module exports single class/function AND name matches filename
3. Benefits of named exports:
   - Refactoring safe (rename updates all imports)
   - Tree-shaking works better
   - Editor autocomplete works
   - Consistent import style

**Detection:**
- Mix of `import X` and `import { Y }` statements
- Renaming function doesn't update all references
- Autocomplete suggestions incomplete

**Phase mapping:** Phase 1 (Module Export Standards) establishes export conventions.

**Severity:** MAJOR - Quality of life, not breakage

**Sources:**
- [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/)
- [Common JavaScript Module Mistakes](https://moldstud.com/articles/p-common-javascript-module-mistakes-tips-to-avoid-common-pitfalls)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 11: GitHub Pages MIME Type Issues

**What goes wrong:** Browser refuses to load `.js` files with incorrect MIME type. Console error: "Failed to load module script: The server responded with a non-JavaScript MIME type".

**Why it happens:**
- Some servers require explicit MIME type configuration for `.js` files
- GitHub Pages handles this correctly, but other hosts may not
- Developer tests locally (works) but breaks on deployment

**Consequences:**
- All modules fail to load (blank page)
- Console error about MIME type
- Only happens in production, not local dev

**Prevention:**
1. GitHub Pages serves `.js` files correctly (already configured)
2. If deploying elsewhere, verify server config
3. Use `.mjs` extension for ES6 modules (explicit MIME type)
4. Test on actual GitHub Pages before launch

**Detection:**
- Console error: "non-JavaScript MIME type"
- Network tab shows `.js` files with wrong Content-Type header
- Works locally, fails on GitHub Pages

**Phase mapping:** Phase 7 (Deployment) must verify MIME types before production.

**Severity:** MINOR - GitHub Pages handles correctly; other hosts need config

**Sources:**
- [Understanding ES6 Modules](https://www.sitepoint.com/understanding-es6-modules/)
- [GitHub Pages ES6 Modules Support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

---

### Pitfall 12: Browser Cache Confusion During Development

**What goes wrong:** After refactor, browser loads cached old version. Developer sees old bugs that were fixed, or fixes don't appear.

**Why it happens:**
- Browser caches JavaScript files aggressively
- Single-file to multi-file changes confuse cache
- HTML loads new version but modules still cached

**Consequences:**
- "I fixed that bug!" but it still appears
- Changes don't seem to take effect
- Intermittent behavior (cached vs fresh load)

**Prevention:**
1. Hard refresh during development: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Disable cache in DevTools (Network tab, "Disable cache" checkbox)
3. Add cache-busting to production:
   ```html
   <script type="module" src="main.js?v=20260207"></script>
   ```
4. Use browser incognito mode for testing fresh loads

**Detection:**
- Changes don't appear after refresh
- Old console logs still showing
- Network tab shows "from disk cache" instead of 200 status

**Phase mapping:** All phases - development workflow consideration.

**Severity:** MINOR - Developer workflow issue, not production bug

---

### Pitfall 13: Import Path Mistakes (Relative vs Absolute)

**What goes wrong:** Import statements use wrong path: `import { fn } from 'utils.js'` (missing `./`) or wrong relative depth `../../utils.js`.

**Why it happens:**
- ES6 modules require explicit relative paths (`./`, `../`)
- Bare imports (`'utils'`) only work with import maps or bundlers
- Easy to miscount directory depth

**Consequences:**
- `Failed to resolve module specifier` error
- Module not found
- Works in bundler, fails in browser

**Prevention:**
1. RULE: Always use relative paths in browser modules: `./utils.js` or `../core/parser.js`
2. Use editor autocomplete for imports (suggests correct path)
3. Test in browser without bundler (catches bare import mistakes)
4. Consider import maps if many shared utilities:
   ```html
   <script type="importmap">
   {
       "imports": {
           "utils/": "./src/utils/"
       }
   }
   </script>
   ```

**Detection:**
- Console error: "Failed to resolve module specifier"
- 404 errors for module files in Network tab

**Phase mapping:** All phases - code review standard.

**Severity:** MINOR - Easy to catch and fix

---

## Phase-Specific Warnings

Mapping pitfalls to roadmap phases for prevention planning.

| Phase Topic | Critical Pitfalls | Detection Strategy | Mitigation |
|-------------|-------------------|-------------------|------------|
| Phase 0: Test Infrastructure | Pitfall 6 (Test harness) | Run existing tests after harness refactor | Refactor test harness first, validate against single-file version |
| Phase 1: Dependency Analysis | Pitfall 1 (Load order), Pitfall 5 (Circular deps) | Map dependency graph, use `madge` for cycles | Create acyclic dependency map before splitting |
| Phase 2: State Module | Pitfall 2 (Global state), Pitfall 8 (Closures) | Audit all `let`/`const` at script root, trace mutations | Create single state module, use object wrapper for primitives |
| Phase 3: External Dependencies | Pitfall 3 (CDN timing) | Test without browser cache, slow network throttling | Add CDN availability checks, error handling |
| Phase 4: Event Binding | Pitfall 4 (DOM timing) | Hard refresh testing, check `document.readyState` | Wrap DOM init in function, call after DOMContentLoaded |
| Phase 5: UI Module Split | Pitfall 7 (CSS decoupling) | Visual regression testing, screenshot comparison | Document CSS/JS coupling, use data attributes |
| Phase 6: Feature Modules | Pitfall 9 (File organization) | Code review: "Can you find X feature in 10 seconds?" | Define file structure upfront, enforce single responsibility |
| Phase 7: Deployment | Pitfall 11 (MIME types) | Test on actual GitHub Pages staging environment | Verify MIME types in production before launch |

---

## Refactoring Safety Net

Zero-downtime strategies for mission-critical production tool.

### Feature Toggle Approach (Recommended)

Add toggle to HTML allowing user to switch between old and new implementations:

```html
<div class="settings">
    <label>
        <input type="checkbox" id="useModularVersion">
        Use new modular version (experimental)
    </label>
</div>

<script>
    // Load appropriate version based on toggle
    const useModular = localStorage.getItem('useModular') === 'true';
    if (useModular) {
        import('./src/main.js'); // New modular version
    } else {
        // Keep old single-file logic inline
    }
</script>
```

**Benefits:**
- Instant rollback (uncheck box)
- Side-by-side comparison testing
- Gradual rollout (owner tests new version before forcing it)
- Zero deployment risk

### Blue-Green Deployment

Keep both versions live during transition:

1. Deploy modular version to new GitHub Pages branch (`refactor` branch)
2. Test extensively at `username.github.io/bom-tool/refactor`
3. After validation, merge to `main` (or keep both URLs available)
4. Redirect old URL to new version after burn-in period

### Automated Testing Validation

Run full test suite on both versions:

```javascript
// Validate behavior equivalence
const oldResults = runWithSingleFile(input);
const newResults = runWithModules(input);
assert.deepEqual(oldResults, newResults, 'Outputs must match exactly');
```

**Critical tests:**
- All 4 existing validation test cases
- Edge cases (empty BOMs, huge BOMs, malformed input)
- All three tabs (Flat, Comparison, Hierarchy)
- All export formats (Excel, HTML)

---

## Owner Communication Strategy

User has zero coding experience - must understand risks/benefits without technical jargon.

### What to Communicate

**Before refactor:**
- "We're reorganizing the code to make future features easier to add"
- "Functionality stays identical - this is like reorganizing a workshop"
- "You'll have a toggle to switch back to old version instantly if anything seems wrong"

**During refactor:**
- "Test new version in 'experimental mode' - if anything looks different, let me know"
- "Keep using old version for production work until we validate the new one"

**After refactor:**
- "New version validated - switching to it by default"
- "Old version still available as backup for 2 weeks"

### Warning Signs to Watch For

Teach owner to recognize breakage (they can test even without coding knowledge):

- Upload buttons don't respond
- Excel export produces empty file
- Comparison shows wrong results (compare with old version side-by-side)
- Tabs don't switch
- Drag-and-drop doesn't work

"If you see any of these, click the toggle to switch back and let me know."

---

## Summary: Critical Success Factors

For zero-breakage refactor of mission-critical tool:

1. **Test infrastructure first** - Cannot validate without working tests
2. **Explicit dependency graph** - Must map before splitting
3. **Single state module** - All global variables in one place
4. **DOM-ready architecture** - Never query DOM at module top-level
5. **No circular dependencies** - Use `madge` to detect before deployment
6. **Feature toggle** - Owner can instantly rollback
7. **Automated validation** - Full test suite on both versions
8. **Gradual rollout** - Experimental mode → default mode → remove old version

**Zero tolerance for breakage = Zero shortcuts on safety measures.**

---

## Confidence Assessment

| Pitfall Category | Confidence | Validation Method |
|------------------|------------|-------------------|
| Script Load Order | HIGH | Verified with MDN official docs + current codebase analysis |
| Global State Issues | HIGH | Cross-referenced multiple 2026 sources on module scope |
| CDN Timing | HIGH | Confirmed with ES6 module loading specifications |
| DOM Timing | HIGH | Verified with DOMContentLoaded documentation |
| Circular Dependencies | HIGH | Multiple authoritative sources + tool recommendations |
| Test Harness | HIGH | Analyzed existing test harness code + refactoring strategies |
| CSS Decoupling | MEDIUM | Best practices from multiple sources, not BOM-specific |
| Closures | HIGH | JavaScript fundamentals + module scope interactions |
| File Organization | MEDIUM | Architectural best practices, subjective element |
| Export Quality | HIGH | ES6 module standards |
| MIME Types | HIGH | GitHub Pages documentation confirms |
| Browser Cache | HIGH | Standard web development issue |
| Import Paths | HIGH | ES6 module specification |

**Overall confidence: HIGH** - Pitfalls are well-documented in 2026 sources with specific prevention strategies applicable to BOM Tool's architecture.

---

## Sources

**Module Loading and Dependencies:**
- [JavaScript modules - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Module Loading Order Patterns](https://exploringjs.com/es6/ch_modules.html)
- [JavaScript Modules in 2026: Practical Patterns](https://thelinuxcode.com/javascript-modules-in-2026-practical-patterns-with-commonjs-and-es-modules/)

**State Management:**
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)
- [Modern State Management in Vanilla JavaScript: 2026 Patterns](https://medium.com/@orami98/modern-state-management-in-vanilla-javascript-2026-patterns-and-beyond-ce00425f7ac5)
- [JavaScript Scope and Closures](https://medium.com/samsung-internet-dev/javascript-scope-and-closures-3666c4fdf2c2)

**Circular Dependencies:**
- [How to Fix Circular Dependencies in JavaScript](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de)
- [Eliminating Circular Dependencies from JavaScript](https://spin.atomicobject.com/circular-dependencies-javascript/)
- [Analyzing ES6 Circular Dependencies](https://railsware.com/blog/how-to-analyze-circular-dependencies-in-es6/)

**DOM and Event Handling:**
- [DOMContentLoaded Event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [Page: DOMContentLoaded, load, beforeunload, unload](https://javascript.info/onload-ondomcontentloaded)
- [JavaScript DOMContentLoaded Event](https://www.javascripttutorial.net/javascript-dom/javascript-domcontentloaded/)
- [Removing Event Listeners with Vanilla JavaScript](https://gomakethings.com/removing-an-event-listener-with-vanilla-javascript/)

**CSS and JavaScript Coupling:**
- [Stop Using CSS Selectors for Non-CSS](https://css-tricks.com/stop-using-css-selectors-non-css/)
- [CSS Selectors Not Working](https://blog.pixelfreestudio.com/css-selectors-not-working-heres-what-you-might-be-missing/)
- [Refactoring DOM Heavy JS](https://www.jackfranklin.co.uk/blog/refactoring-js/)

**External Dependencies:**
- [ES6 Modules + Other Libraries](https://discourse.threejs.org/t/es6-modules-other-three-libraries/17500)
- [Real World Experience with ES6 Modules in Browsers](https://salomvary.com/es6-modules-in-browsers.html)
- [Understanding ES6 Modules](https://www.sitepoint.com/understanding-es6-modules/)

**Testing and Refactoring:**
- [JavaScript Test Harness Documentation](https://web-platform-tests.org/writing-tests/testharness.html)
- [Top 5 JavaScript Test Automation Frameworks in 2026](https://www.qable.io/blog/top-5-javascript-test-automation-frameworks-in-2026)
- [Zero-Downtime Refactoring](https://www.in-com.com/blog/zero-downtime-refactoring-how-to-refactor-systems-without-taking-them-offline/)

**Best Practices:**
- [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/)
- [Common JavaScript Module Mistakes](https://moldstud.com/articles/p-common-javascript-module-mistakes-tips-to-avoid-common-pitfalls)
- [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html)
- [Code Refactoring Best Practices](https://www.tembo.io/blog/code-refactoring)
