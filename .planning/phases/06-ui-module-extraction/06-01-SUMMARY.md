---
phase: 06-ui-module-extraction
plan: 01
subsystem: ui
tags: [extraction, modularization, flat-bom, es6-modules]

dependency_graph:
  requires: [05-02]
  provides: [flat-bom-module]
  affects: [index.html, ui-architecture]

tech_stack:
  added: [js/ui/flat-bom.js]
  patterns: [init-function-pattern, dom-content-loaded, module-extraction]

key_files:
  created:
    - js/ui/flat-bom.js
  modified:
    - index.html

decisions:
  - title: "Init function pattern for UI modules"
    rationale: "All DOM queries inside init() to avoid timing issues with module loading"
    impact: "Establishes pattern for Plans 02 and 03 (Comparison and Hierarchy modules)"

  - title: "DOMContentLoaded initialization pattern"
    rationale: "Ensures DOM is ready before UI module initialization, handles both loading and loaded states"
    impact: "Central initializeUI() function will extend to call all three tab init functions"

metrics:
  duration_minutes: 8
  completed_date: 2026-02-09
  tasks_completed: 2
  lines_removed: 610
  lines_added: 632
  files_created: 1
  files_modified: 1
  commits: 2
---

# Phase 6 Plan 1: Flat BOM UI Module Extraction Summary

**One-liner:** Extracted all Flat BOM tab UI logic (~613 lines) into js/ui/flat-bom.js as ES6 module with init() function, establishing the DOMContentLoaded initialization pattern for all UI modules.

## What Was Accomplished

Completed first UI module extraction from index.html, removing ~20% of remaining inline JavaScript. Flat BOM tab now lives in a dedicated module following the init() function pattern.

### Task 1: Create js/ui/flat-bom.js module
- Created js/ui/flat-bom.js with single exported init() function
- Moved all Flat BOM DOM element queries inside init() (14 elements cached)
- Moved all Flat BOM event listeners inside init() (9 listeners)
- Moved all Flat BOM handler functions inside init() as closures:
  - handleFile() - file reader, XML/CSV parsing, state updates
  - displayResults() - table rendering, stats calculation, component breakdown
  - showMessage() - status message display with auto-hide
  - Excel export handler - XLSX workbook generation and download
  - HTML export handler - standalone HTML report generation
  - Reset handler - state and DOM cleanup
- Imported dependencies: state.js, parser.js, tree.js, flatten.js, utils.js
- All existing behavior preserved exactly (mechanical extraction)

### Task 2: Wire module into index.html and remove inline code
- Added flat-bom.js import as `initFlatBom`
- Established DOMContentLoaded initialization pattern with initializeUI() function
- Removed all Flat BOM inline code (~613 lines):
  - DOM element declarations
  - Event listener attachments
  - File upload handlers
  - Flatten operation logic
  - Display and export handlers
  - Reset handler
- Kept all core imports (still needed by Comparison and Hierarchy tabs)
- Tab switching code remains inline
- Comparison tab code remains inline
- Hierarchy tab code remains inline
- Tests pass at 2/4 baseline (no regressions)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Results

All 4 automated validation tests run successfully with same baseline results:
- Test 1 (Flat BOM XML): Known revision mismatch (pre-existing)
- Test 2 (GA Comparison CSV): Known count difference (pre-existing)
- Test 3 (GA Comparison XML): PASS
- Test 4 (Scoped Comparison): PASS

**Result:** 2/4 tests passing - identical to pre-refactor baseline. Zero regressions.

## File Changes

### Created Files
- **js/ui/flat-bom.js** (624 lines)
  - Single exported init() function
  - All DOM queries inside init() (no module top-level queries)
  - Imports from state.js and 4 core modules
  - All Flat BOM event listeners and handlers

### Modified Files
- **index.html** (net -602 lines: -610 removed, +8 added)
  - Added flat-bom.js import
  - Added DOMContentLoaded initialization pattern
  - Removed all Flat BOM inline code
  - Kept core imports for remaining tabs
  - Comparison and Hierarchy code unchanged

## Architectural Impact

**New Pattern Established:**
```javascript
// In UI module (e.g., flat-bom.js)
export function init() {
    // ALL DOM queries here (not at module top level)
    const element = document.getElementById('foo');

    // All event listeners
    element.addEventListener('click', handler);

    // All handlers as closures
    function handler() { ... }
}

// In index.html
import { init as initModuleName } from './js/ui/module.js';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}

function initializeUI() {
    initModuleName();
}
```

**Benefits:**
- Avoids timing issues with ES6 module loading (modules execute before DOM ready)
- Keeps DOM queries inside functions where elements are guaranteed to exist
- Separates UI logic into focused, single-responsibility modules
- Maintains existing behavior while improving code organization

**Next Steps:**
- Plan 02: Extract Comparison tab using same pattern
- Plan 03: Extract Hierarchy tab using same pattern
- After Plan 03: All three tab modules initialized via initializeUI()

## Key Decisions

1. **Init function pattern:** All DOM queries MUST be inside init() (never at module top level) to avoid "element not found" errors from ES6 module timing.

2. **DOMContentLoaded check:** Use `document.readyState === 'loading'` check to handle both cases (script runs before/after DOMContentLoaded).

3. **Core imports retained:** All existing core imports stay in index.html until Plans 02 and 03 complete, because Comparison and Hierarchy tabs still need them.

4. **Mechanical extraction:** Zero logic changes, zero refactoring, zero renaming. Pure extraction to minimize risk and preserve exact behavior.

## Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 1 | feat | 2b61604 | create flat-bom.js UI module |
| 2 | feat | 104c3bc | wire flat-bom module and remove inline code |

## Self-Check: PASSED

Verified all claims in this summary:

**Files created:**
```
FOUND: js/ui/flat-bom.js
```

**Commits exist:**
```
FOUND: 2b61604
FOUND: 104c3bc
```

**Module structure verified:**
- ✓ Single exported init() function
- ✓ All DOM queries inside init() (lines 14-28)
- ✓ All imports present (state, parser, tree, flatten, utils)
- ✓ Zero top-level DOM queries

**index.html verified:**
- ✓ flat-bom.js imported as initFlatBom
- ✓ DOMContentLoaded pattern present with initializeUI()
- ✓ Zero Flat BOM DOM element declarations in script
- ✓ Zero Flat BOM handler functions in script
- ✓ Comparison and Hierarchy code still present
- ✓ All core imports still present

**Tests verified:**
- ✓ All 4 tests run
- ✓ 2/4 pass (baseline maintained)
- ✓ Zero new failures

All verification checks passed.
