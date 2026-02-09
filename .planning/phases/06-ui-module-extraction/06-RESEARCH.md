# Phase 6: UI Module Extraction - Research

**Researched:** 2026-02-09
**Domain:** Vanilla JavaScript ES6 UI module organization and event handler extraction
**Confidence:** HIGH

## Summary

Phase 6 extracts tab-specific UI logic from `index.html` into independent ES6 modules (`js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js`). The BOM Tool currently has ~2600 lines of JavaScript embedded in a single script tag, organized by tab but not yet modularized. Each tab has distinct responsibilities: Flat BOM handles single-file flattening (~600 lines), Comparison handles two-file diff display with scoped selection (~1100 lines), and Hierarchy displays expandable tree view (~850 lines). The tab switching logic (~25 lines) can remain in index.html or move to a separate tab-switcher module.

Modern vanilla JavaScript UI extraction follows clear patterns: export init functions from each module, call them after DOMContentLoaded, use `js-*` prefix classes to decouple behavioral hooks from styling, cache DOM element references during initialization, and keep event handler logic colocated with the UI it controls. The key risk is timing issues—modules must not query the DOM until after DOMContentLoaded fires and before any dynamic elements are rendered.

**Primary recommendation:** Extract each tab's logic into an init-function-based module, initialize all three tabs in sequence after DOMContentLoaded, use simple getElementById selectors (already in place), and validate that event listeners fire correctly for all user interactions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ES6 Modules | Native | Code organization, namespacing | Built into JavaScript (2015+), no build tools required, browser-native |
| DOMContentLoaded | Native | Safe DOM initialization timing | Standard DOM lifecycle event, ensures elements exist before module access |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Revealing Module Pattern | Pattern | Namespace isolation, privacy control | When using IIFEs for encapsulation (alternative to ES6 modules) |
| Event Delegation | Pattern | Efficient event handling | When dealing with dynamic content or many similar elements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native ES6 Modules | Build tools (webpack, Rollup) | Bundlers add complexity but enable tree-shaking and transpilation for older browsers |
| DOMContentLoaded | Inline script at end of body | Inline scripts work but are less maintainable for multi-file architectures |
| Init functions | Top-level module code | Top-level code executes during import, harder to control timing and test in isolation |

**Installation:**
```bash
# No installation required - using native browser features
# Existing dependencies: SheetJS (already loaded via CDN)
```

## Architecture Patterns

### Recommended Project Structure
```
js/
├── ui/
│   ├── state.js           # ✅ Already exists - centralized state
│   ├── flat-bom.js        # NEW - Flat BOM tab logic
│   ├── comparison.js      # NEW - Comparison tab logic
│   └── hierarchy.js       # NEW - Hierarchy View tab logic
```

### Pattern 1: Init Function per Module
**What:** Each UI module exports a single `init()` function that sets up DOM references and event listeners
**When to use:** Always for DOM-dependent modules—allows caller to control timing

**Example:**
```javascript
// js/ui/flat-bom.js
import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree } from '../core/tree.js';
import { flattenBOM, sortBOM } from '../core/flatten.js';

export function init() {
    // Cache DOM references
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('csvFile');
    const flattenBtn = document.getElementById('flattenBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Attach event listeners
    uploadZone.addEventListener('click', () => fileInput.click());
    flattenBtn.addEventListener('click', handleFlatten);
    resetBtn.addEventListener('click', handleReset);

    // Define handlers (closures capture cached DOM refs)
    function handleFlatten() {
        const unitQty = parseInt(document.getElementById('unitQty').value);
        state.treeRoot = buildTree(state.csvData);
        state.flattenedBOM = sortBOM(flattenBOM(state.treeRoot, unitQty));
        displayResults(state.flattenedBOM, unitQty);
    }

    function handleReset() {
        state.csvData = null;
        state.flattenedBOM = null;
        uploadZone.classList.remove('has-file');
        // ... more reset logic
    }

    function displayResults(items, unitQty) {
        // ... render logic
    }
}
```

**Source:** [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), [JavaScript.info DOMContentLoaded](https://javascript.info/onload-ondomcontentloaded)

### Pattern 2: DOMContentLoaded with Readiness Check
**What:** Check `document.readyState` before initializing to handle both "still loading" and "already loaded" cases
**When to use:** In the main script tag when initializing UI modules

**Example:**
```javascript
// index.html <script type="module">
import { init as initFlatBom } from './js/ui/flat-bom.js';
import { init as initComparison } from './js/ui/comparison.js';
import { init as initHierarchy } from './js/ui/hierarchy.js';

function initializeUI() {
    initFlatBom();
    initComparison();
    initHierarchy();
    initTabSwitching(); // Or extract to separate module
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}
```

**Source:** [JavaScript.info - Page DOMContentLoaded, load](https://javascript.info/onload-ondomcontentloaded)

### Pattern 3: Separation of Concerns - Logic vs. Presentation
**What:** Keep business logic (data processing) separate from presentation logic (DOM manipulation)
**When to use:** Always—already achieved in Phase 4 (core logic) and Phase 5 (state), Phase 6 completes the separation

**Current state:**
- ✅ Business logic: `js/core/*` (parseXML, flattenBOM, compareBOMs, etc.)
- ✅ State management: `js/ui/state.js` (22 state variables)
- ⏳ Presentation logic: Still in `index.html` (event handlers, DOM updates)

**Example:**
```javascript
// ✅ GOOD: UI module calls core logic, updates DOM
function handleFlatten() {
    const unitQty = parseInt(unitQtyInput.value);
    state.treeRoot = buildTree(state.csvData);        // Core logic
    state.flattenedBOM = sortBOM(flattenBOM(state.treeRoot, unitQty)); // Core logic
    displayResults(state.flattenedBOM, unitQty);      // Presentation logic
}

// ❌ BAD: Core logic manipulating DOM
function flattenBOM(root, unitQty) {
    // ... flattening logic
    document.getElementById('totalItems').textContent = items.length; // Don't do this
    return items;
}
```

**Source:** [Understanding JavaScript Modules: Common Pitfalls](https://dev.to/ayako_yk/understanding-javascript-modules-from-basics-to-common-pitfalls-4bmf)

### Pattern 4: Class-Based Behavioral Hooks (Decoupling)
**What:** Use `js-*` prefixed classes for JavaScript hooks, separate from styling classes
**When to use:** When CSS class names might change or when multiple developers work on styling vs. behavior

**Current BOM Tool state:** Already uses simple `id` attributes for behavioral hooks (e.g., `id="flattenBtn"`, `id="uploadZone"`). This is acceptable and arguably simpler than adding `js-*` classes everywhere.

**Recommendation:** Keep existing `getElementById` pattern—it's already decoupled (IDs are stable, classes are for styling). Only consider `js-*` classes if class-based selection becomes necessary.

**Example (IF class-based selection were needed):**
```html
<!-- ✅ GOOD: Behavioral hook separate from styling -->
<button class="btn-primary js-flatten-btn" id="flattenBtn">Flatten BOM</button>

<!-- ❌ RISKY: Coupling behavior to presentation class -->
<button class="btn-primary" id="flattenBtn">Flatten BOM</button>
const btn = document.querySelector('.btn-primary'); // Breaks if styling changes
```

**Source:** [Philip Walton - Decoupling HTML, CSS, and JavaScript](https://philipwalton.com/articles/decoupling-html-css-and-javascript/)

### Pattern 5: Event Delegation for Dynamic Content
**What:** Attach event listeners to parent containers instead of individual dynamic elements
**When to use:** When elements are added/removed dynamically (e.g., tree nodes, table rows)

**Example from BOM Tool:**
```javascript
// Hierarchy View: Tree nodes added dynamically
function renderTreeNode(node, container, depth) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span class="tree-toggle collapsed">+</span> ${node.partNumber}</td>
    `;
    container.appendChild(row);

    // ❌ BAD: Attach listener to each toggle (hundreds of listeners)
    row.querySelector('.tree-toggle').addEventListener('click', toggleChildren);

    // ✅ BETTER: Single delegated listener on parent table
    // (Implemented as inline onclick in current code, could be refactored)
}

// Event delegation pattern
hierarchyTreeBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('tree-toggle')) {
        toggleChildren(e.target.closest('tr'));
    }
});
```

**Note:** Current BOM Tool uses inline `onclick="toggleNode(this)"` for hierarchy toggles—this works but could be modernized to event delegation during extraction.

**Source:** [JavaScript.info - Event Delegation](https://javascript.info/event-delegation), [Patterns for Efficient DOM Manipulation](https://blog.logrocket.com/patterns-efficient-dom-manipulation-vanilla-javascript/)

### Anti-Patterns to Avoid
- **Top-level DOM queries in module scope:** Variables declared at module level execute during import, before DOMContentLoaded
  ```javascript
  // ❌ BAD: Executes immediately on import, DOM may not exist
  const uploadZone = document.getElementById('uploadZone');
  export function init() { uploadZone.addEventListener(...); }

  // ✅ GOOD: Query DOM inside init function, called after DOMContentLoaded
  export function init() {
      const uploadZone = document.getElementById('uploadZone');
      uploadZone.addEventListener(...);
  }
  ```

- **Mixing state mutation with DOM updates in core logic:** Core functions should return data, not update UI
  ```javascript
  // ❌ BAD: Core logic updating DOM
  export function flattenBOM(root, unitQty) {
      const items = [/* flattening logic */];
      document.getElementById('totalItems').textContent = items.length;
      return items;
  }

  // ✅ GOOD: UI module handles display
  function handleFlatten() {
      state.flattenedBOM = flattenBOM(state.treeRoot, unitQty);
      document.getElementById('totalItems').textContent = state.flattenedBOM.length;
  }
  ```

- **Circular imports between UI modules:** If comparison.js imports flat-bom.js and vice versa, initialization order becomes fragile
  ```javascript
  // ❌ BAD: Circular dependency
  // flat-bom.js
  import { showCompareMessage } from './comparison.js';

  // comparison.js
  import { showMessage } from './flat-bom.js';

  // ✅ GOOD: Extract shared utilities to separate module
  // ui/messages.js
  export function showMessage(text, type, elementId) { /* ... */ }

  // Both tabs import from messages.js (no circular dependency)
  ```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module initialization timing | Custom "ready" state tracker | DOMContentLoaded event + readyState check | Native browser API handles all edge cases (deferred scripts, dynamic imports, etc.) |
| Event cleanup/unbinding | Manual listener tracking arrays | Module-scoped init (single initialization) | BOM Tool doesn't dynamically reload tabs—listeners attach once and persist for page lifetime |
| DOM element caching | Global element registry object | Local variables in init closure | Closures naturally scope element references to the module that needs them |
| Tab state isolation | Custom pub/sub system | Centralized state object (already exists: `js/ui/state.js`) | Phase 5 already solved this—22 state variables in single object |

**Key insight:** Vanilla JavaScript in 2026 has mature native patterns for UI initialization and event management. The complexity of custom frameworks (React, Vue) is unnecessary for static tab-based UIs where modules initialize once and persist for the page lifetime.

## Common Pitfalls

### Pitfall 1: Querying DOM Before Elements Exist
**What goes wrong:** Module tries to call `document.getElementById()` at top level, before DOMContentLoaded fires—returns `null`, event listeners fail silently
**Why it happens:** ES6 module imports are hoisted and execute immediately when the module loads
**How to avoid:** Always wrap DOM queries inside an `init()` function called after DOMContentLoaded
**Warning signs:** `Cannot read property 'addEventListener' of null` errors, event handlers not firing

**Example:**
```javascript
// ❌ BAD: Executes during module load (DOM not ready)
const flattenBtn = document.getElementById('flattenBtn'); // null!
export function init() {
    flattenBtn.addEventListener('click', handleFlatten); // Error: flattenBtn is null
}

// ✅ GOOD: Query inside init (after DOMContentLoaded)
export function init() {
    const flattenBtn = document.getElementById('flattenBtn'); // Element exists
    flattenBtn.addEventListener('click', handleFlatten);
}
```

### Pitfall 2: Forgetting to Call init Functions
**What goes wrong:** UI module exports `init()` but developer forgets to call it in the main script—tab appears broken, no interactions work
**Why it happens:** Module code doesn't automatically execute; only imported functions run when explicitly called
**How to avoid:** Create a checklist: one `init()` call per UI module in the DOMContentLoaded handler
**Warning signs:** No console errors, but clicks/uploads do nothing; checking DevTools shows no event listeners attached

**Example:**
```javascript
// index.html <script type="module">
import { init as initFlatBom } from './js/ui/flat-bom.js';
import { init as initComparison } from './js/ui/comparison.js';
import { init as initHierarchy } from './js/ui/hierarchy.js';

document.addEventListener('DOMContentLoaded', () => {
    initFlatBom();
    initComparison();
    initHierarchy(); // ⚠️ Easy to forget one!
});
```

### Pitfall 3: Inline Event Handlers Break After Extraction
**What goes wrong:** HTML contains `onclick="toggleNode(this)"`, but `toggleNode` is now inside a module and not globally accessible
**Why it happens:** Inline event handlers require global function scope; module functions are scoped to the module
**How to avoid:** Replace inline handlers with `addEventListener` during extraction
**Warning signs:** `Uncaught ReferenceError: toggleNode is not defined` in console

**Current BOM Tool affected areas:**
- Hierarchy View: `<span class="tree-toggle" onclick="toggleNode(this)">` (line 2686 in index.html)

**Fix:**
```javascript
// ❌ OLD: Inline handler (requires global function)
row.innerHTML = `<span class="tree-toggle" onclick="toggleNode(this)">+</span>`;
window.toggleNode = function(toggle) { /* ... */ }; // Pollution!

// ✅ NEW: Event listener (module-scoped function)
row.innerHTML = `<span class="tree-toggle">+</span>`;
export function init() {
    // Event delegation on parent table
    document.getElementById('hierarchyTreeBody').addEventListener('click', (e) => {
        if (e.target.classList.contains('tree-toggle')) {
            toggleNode(e.target);
        }
    });
}
function toggleNode(toggle) { /* ... */ } // Private to module
```

### Pitfall 4: Element ID Conflicts Across Tabs
**What goes wrong:** Two tabs use the same element ID (e.g., both have `id="message"`), getElementById returns the first match only
**Why it happens:** Developer copy-pastes HTML structure between tabs without renaming IDs
**How to avoid:** Prefix element IDs with tab name (e.g., `flattenMessage`, `compareMessage`, `hierarchyMessage`)
**Warning signs:** Messages appear in wrong tab, events trigger wrong handlers

**Current BOM Tool state:** Already uses prefixed IDs correctly:
- Flat BOM: `id="message"`, `id="uploadZone"`, `id="flattenBtn"`
- Comparison: `id="compareMessage"`, `id="oldBomZone"`, `id="compareBtn"`
- Hierarchy: `id="hierarchyMessage"`, `id="hierarchyUploadZone"`, `id="viewHierarchyBtn"`

**Verification:** `grep -o 'id="[^"]*"' index.html | sort | uniq -d` should return no duplicates.

### Pitfall 5: State Variables Declared in Module Scope (Avoided)
**What goes wrong:** Module declares `let csvData = null;` at top level, multiple imports create isolated copies
**Why it happens:** Misunderstanding ES6 module semantics—each module executes once, but state should be centralized
**How to avoid:** Use a shared state module (already done in Phase 5: `js/ui/state.js`)
**Warning signs:** One tab updates state, but another tab doesn't see the change

**BOM Tool status:** ✅ Already avoided—Phase 5 centralized all 22 state variables into `js/ui/state.js`.

### Pitfall 6: Breaking Export Functions After Extraction
**What goes wrong:** Flat BOM export functions (Excel, HTML) currently defined inline near the "Export Excel" button handler—moving them to `js/export/` (Phase 7) before extracting UI logic (Phase 6) creates import coupling issues
**Why it happens:** Export functions and UI logic are intertwined in current code
**How to avoid:** Phase 6 extracts UI first, Phase 7 extracts exports—UI modules will temporarily contain export logic, then Phase 7 refactors it out
**Warning signs:** Excel export fails after UI extraction with "function not defined" errors

**Recommendation:** Phase 6 moves export functions along with the UI module they belong to (e.g., `exportFlatBomExcel` moves to `js/ui/flat-bom.js`). Phase 7 later extracts them to `js/export/excel.js`.

## Code Examples

Verified patterns from official sources and current BOM Tool code:

### Example 1: Complete Init Function Pattern
```javascript
// js/ui/flat-bom.js
import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree } from '../core/tree.js';
import { flattenBOM, sortBOM } from '../core/flatten.js';

export function init() {
    // 1. Cache all DOM element references
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('csvFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileNameDisplay = document.getElementById('fileName');
    const fileMeta = document.getElementById('fileMeta');
    const unitQtyInput = document.getElementById('unitQty');
    const flattenBtn = document.getElementById('flattenBtn');
    const resetBtn = document.getElementById('resetBtn');
    const message = document.getElementById('message');
    const results = document.getElementById('results');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportHtmlBtn = document.getElementById('exportHtmlBtn');

    // 2. Attach all event listeners
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xml'))) {
            handleFile(file);
        } else {
            showMessage('Please upload a CSV or XML file', 'error');
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    flattenBtn.addEventListener('click', handleFlatten);
    resetBtn.addEventListener('click', handleReset);
    exportExcelBtn.addEventListener('click', handleExportExcel);
    exportHtmlBtn.addEventListener('click', handleExportHtml);

    // 3. Define handler functions (closures capture DOM refs)
    function handleFile(file) {
        // ... file parsing logic (uses state.csvData, state.uploadedFilename)
        // ... updates fileInfo, fileNameDisplay, fileMeta, flattenBtn, etc.
    }

    function handleFlatten() {
        const unitQty = parseInt(unitQtyInput.value);
        state.treeRoot = buildTree(state.csvData);
        state.flattenedBOM = sortBOM(flattenBOM(state.treeRoot, unitQty));
        displayResults(state.flattenedBOM, unitQty);
        showMessage('BOM flattened successfully!', 'success');
    }

    function handleReset() {
        state.csvData = null;
        state.flattenedBOM = null;
        state.treeRoot = null;
        state.uploadedFilename = null;
        uploadZone.classList.remove('has-file');
        fileInfo.classList.remove('show');
        flattenBtn.disabled = true;
        results.classList.remove('show');
        message.classList.remove('show');
    }

    function displayResults(items, unitQty) {
        // ... render table rows, update stats, show export buttons
    }

    function handleExportExcel() {
        // ... Excel export logic (Phase 7 will extract this)
    }

    function handleExportHtml() {
        // ... HTML export logic (Phase 7 will extract this)
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = `message ${type} show`;
        setTimeout(() => message.classList.remove('show'), 5000);
    }
}
```

**Source:** Adapted from BOM Tool current code (lines 404-1013 in index.html) + [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Example 2: Main Initialization Script (index.html)
```javascript
// index.html <script type="module">
import { init as initFlatBom } from './js/ui/flat-bom.js';
import { init as initComparison } from './js/ui/comparison.js';
import { init as initHierarchy } from './js/ui/hierarchy.js';

function initializeUI() {
    // Initialize all three tab modules
    initFlatBom();
    initComparison();
    initHierarchy();

    // Initialize tab switching (can remain inline or extract to js/ui/tabs.js)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => {
                if (content.id === targetTab + 'Tab') {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

// Handle both "still loading" and "already loaded" cases
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI(); // DOM already ready (e.g., dynamically loaded script)
}
```

**Source:** [JavaScript.info - DOMContentLoaded](https://javascript.info/onload-ondomcontentloaded)

### Example 3: Event Delegation for Dynamic Elements (Hierarchy View)
```javascript
// js/ui/hierarchy.js
export function init() {
    const hierarchyTreeBody = document.getElementById('hierarchyTreeBody');
    const viewHierarchyBtn = document.getElementById('viewHierarchyBtn');
    const expandAllBtn = document.getElementById('hierarchyExpandAllBtn');
    const collapseAllBtn = document.getElementById('hierarchyCollapseAllBtn');

    viewHierarchyBtn.addEventListener('click', handleViewHierarchy);
    expandAllBtn.addEventListener('click', handleExpandAll);
    collapseAllBtn.addEventListener('click', handleCollapseAll);

    // Event delegation: single listener for all tree toggles
    hierarchyTreeBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('tree-toggle')) {
            toggleNode(e.target);
        }
    });

    function handleViewHierarchy() {
        state.hierarchyTree = buildTree(state.hierarchyData);
        displayHierarchyTree(state.hierarchyTree);
    }

    function displayHierarchyTree(root) {
        hierarchyTreeBody.innerHTML = '';
        renderTreeNode(root, hierarchyTreeBody, 0);
    }

    function renderTreeNode(node, container, depth) {
        const row = document.createElement('tr');
        row.dataset.level = depth;
        row.innerHTML = `
            <td>
                <span class="tree-indent" style="width: ${depth * 1.5}rem;"></span>
                ${node.children.length > 0 ? '<span class="tree-toggle collapsed">+</span>' : ''}
                <span class="part-number">${node.partNumber}</span>
            </td>
            <td>${node.description}</td>
            <td>${node.quantity}</td>
        `;
        container.appendChild(row);

        // Recursively render children (initially hidden)
        if (node.children.length > 0) {
            node.children.forEach(child => {
                const childRow = renderTreeNode(child, container, depth + 1);
                childRow.classList.add('hidden');
            });
        }

        return row;
    }

    function toggleNode(toggle) {
        const row = toggle.closest('tr');
        const depth = parseInt(row.dataset.level);
        const isCollapsed = toggle.classList.contains('collapsed');

        if (isCollapsed) {
            toggle.textContent = '−';
            toggle.classList.remove('collapsed');
            // Show immediate children
            let nextRow = row.nextElementSibling;
            while (nextRow && parseInt(nextRow.dataset.level) === depth + 1) {
                nextRow.classList.remove('hidden');
                nextRow = nextRow.nextElementSibling;
            }
        } else {
            toggle.textContent = '+';
            toggle.classList.add('collapsed');
            // Hide all descendants
            let nextRow = row.nextElementSibling;
            while (nextRow && parseInt(nextRow.dataset.level) > depth) {
                nextRow.classList.add('hidden');
                // Collapse any expanded grandchildren
                const childToggle = nextRow.querySelector('.tree-toggle');
                if (childToggle && !childToggle.classList.contains('collapsed')) {
                    childToggle.textContent = '+';
                    childToggle.classList.add('collapsed');
                }
                nextRow = nextRow.nextElementSibling;
            }
        }
    }

    function handleExpandAll() {
        const allToggles = hierarchyTreeBody.querySelectorAll('.tree-toggle.collapsed');
        allToggles.forEach(toggle => {
            toggle.textContent = '−';
            toggle.classList.remove('collapsed');
        });
        const allRows = hierarchyTreeBody.querySelectorAll('tr.hidden');
        allRows.forEach(row => row.classList.remove('hidden'));
    }

    function handleCollapseAll() {
        const allToggles = hierarchyTreeBody.querySelectorAll('.tree-toggle:not(.collapsed)');
        allToggles.forEach(toggle => {
            toggle.textContent = '+';
            toggle.classList.add('collapsed');
        });
        const allRows = hierarchyTreeBody.querySelectorAll('tr[data-level]');
        allRows.forEach(row => {
            if (parseInt(row.dataset.level) > 0) {
                row.classList.add('hidden');
            }
        });
    }
}
```

**Note:** Current BOM Tool uses inline `onclick="toggleNode(this)"` (line 2686). This example shows how to modernize it using event delegation.

**Source:** [JavaScript.info - Event Delegation](https://javascript.info/event-delegation), adapted from BOM Tool hierarchy logic (lines 2323-2565)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `<script>` tags with global functions | ES6 modules with named exports | ES6 (2015), widespread browser support by 2018 | Namespacing, tree-shaking, no global pollution |
| `window.onload` for initialization | `DOMContentLoaded` event | DOM Level 2 Events (2000), best practice since ~2010 | Faster initialization (doesn't wait for images/CSS) |
| jQuery for DOM queries | Native `querySelector` / `getElementById` | jQuery declining since 2015, native APIs matured | No library dependency, better performance |
| Revealing Module Pattern (IIFE) | ES6 modules | Revealing pattern was pre-ES6 workaround (2010-2015) | Native browser support, standardized syntax |
| Build tools required for modules | Native ES6 module support in browsers | Chrome 61 (2017), Firefox 60 (2018), Safari 11 (2017) | No build step required for simple projects |

**Deprecated/outdated:**
- **IIFE-based module pattern**: Replaced by ES6 modules, but still valid for non-module scripts or legacy browser support
- **`document.write()` for dynamic content**: Blocked by modern CSP policies, use `createElement` + `appendChild` or `innerHTML`
- **Inline event handlers (`onclick="..."`)**: Still work but discouraged—harder to maintain, pollutes global scope, violates CSP strict-dynamic

**BOM Tool modernization status:**
- ✅ Using ES6 modules (since Phase 1)
- ✅ Using native `getElementById`, `querySelector` (no jQuery)
- ⏳ Still has one inline handler: `onclick="toggleNode(this)"` in hierarchy view—should be modernized during Phase 6 extraction

## Open Questions

1. **Should tab switching logic remain in index.html or be extracted to `js/ui/tabs.js`?**
   - What we know: Tab switching is ~25 lines, shared by all tabs, operates on `.tab-btn` and `.tab-content` elements
   - What's unclear: Whether the added indirection (another module import) provides value for such simple logic
   - Recommendation: Leave in index.html for Phase 6 (simplicity), reconsider in Phase 8 (Entry Point Consolidation) if main script becomes cluttered

2. **How should export functions be organized during Phase 6?**
   - What we know: Export functions (Excel, HTML) are currently inline with each tab's UI logic; Phase 7 will extract them to `js/export/`
   - What's unclear: Whether to keep them in UI modules temporarily (Phase 6) or extract them immediately
   - Recommendation: Phase 6 moves export functions with their UI module (e.g., `exportFlatBomExcel` goes to `js/ui/flat-bom.js`). Phase 7 refactors them out to `js/export/excel.js`. This keeps Phase 6 scope focused on "UI extraction" without complicating export architecture.

3. **Should inline `onclick="toggleNode(this)"` be modernized in Phase 6?**
   - What we know: Hierarchy View uses one inline handler for tree node toggles; works but not best practice
   - What's unclear: Risk vs. reward of changing this during extraction (might introduce bugs in complex tree rendering)
   - Recommendation: Modernize to event delegation in Phase 6—it's small enough to validate easily and aligns with "extract UI properly" goal. Pattern shown in Example 3 above.

## Sources

### Primary (HIGH confidence)
- [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - ES6 module patterns, named vs. default exports, module loading timing
- [JavaScript.info - DOMContentLoaded, load, beforeunload, unload](https://javascript.info/onload-ondomcontentloaded) - Initialization timing, `document.readyState` check pattern
- [JavaScript.info - Event Delegation](https://javascript.info/event-delegation) - Efficient event handling for dynamic content
- [Philip Walton - Decoupling HTML, CSS, and JavaScript](https://philipwalton.com/articles/decoupling-html-css-and-javascript/) - `js-*` prefix pattern, class-based behavioral hooks

### Secondary (MEDIUM confidence)
- [TheLinuxCode - JavaScript Modules in 2026](https://thelinuxcode.com/javascript-modules-in-2026-practical-patterns-with-commonjs-and-es-modules/) - Modern module patterns, ES modules as default in 2026
- [Go Make Things - Revealing Module Pattern](https://gomakethings.com/the-vanilla-js-revealing-module-pattern/) - IIFE-based pattern (pre-ES6 alternative)
- [DEV Community - Understanding JavaScript Modules: Common Pitfalls](https://dev.to/ayako_yk/understanding-javascript-modules-from-basics-to-common-pitfalls-4bmf) - Circular imports, over-reliance on top-level code, scope issues
- [LogRocket - Patterns for Efficient DOM Manipulation](https://blog.logrocket.com/patterns-efficient-dom-manipulation-vanilla-javascript/) - Event delegation, DOM caching

### Tertiary (LOW confidence)
- [Vanilla Framework Tabs Documentation](https://vanillaframework.io/docs/patterns/tabs) - ARIA attributes for accessible tabs (not critical for BOM Tool internal use)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native browser features (ES6 modules, DOMContentLoaded) with official MDN documentation
- Architecture: HIGH - Established patterns verified across multiple authoritative sources (MDN, JavaScript.info, Philip Walton)
- Pitfalls: HIGH - Timing issues, inline handlers, circular imports well-documented with concrete examples from BOM Tool code
- Code examples: HIGH - Derived from official sources and existing BOM Tool implementation (verified against current index.html)

**Research date:** 2026-02-09
**Valid until:** ~30 days (2026-03-11) - Vanilla JavaScript patterns are stable; ES6 modules mature and unlikely to change significantly

**BOM Tool specific context:**
- ~2600 lines of JavaScript in single `<script type="module">` tag
- Flat BOM: ~600 lines (lines 401-1013)
- Comparison: ~1100 lines (lines 1042-2169)
- Hierarchy: ~850 lines (lines 2172-3053)
- Tab switching: ~25 lines (lines 1015-1040)
- Already using: ES6 modules, native DOM APIs, centralized state (Phase 5), core logic modules (Phase 4)
- Inline handler to fix: `onclick="toggleNode(this)"` in hierarchy view (line 2686)
