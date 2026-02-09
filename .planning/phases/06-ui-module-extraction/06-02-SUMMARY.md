---
phase: 06-ui-module-extraction
plan: 02
subsystem: ui-modules
tags: [comparison-tab, module-extraction, event-listeners, file-upload, exports, scoped-comparison]
dependencies:
  requires: [06-01, state.js, parser.js, tree.js, flatten.js, compare.js, utils.js]
  provides: [comparison.js]
  affects: [index.html]
tech_stack:
  added: []
  patterns: [init-function-pattern, dom-caching-inside-init, dual-file-upload, scoped-tree-selection]
key_files:
  created: [js/ui/comparison.js]
  modified: [index.html]
decisions:
  - "Mechanical move of ~1130 lines of Comparison tab code into comparison.js"
  - "All DOM queries inside init() to avoid timing issues"
  - "Removed compare.js and flatten.js imports from index.html (now only in modules)"
  - "Trimmed utils.js import in index.html to only decimalToFractional (for Hierarchy tab)"
metrics:
  duration_minutes: 9
  completed_date: 2026-02-09
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  lines_added: 1138
  lines_removed: 1133
  commits: 2
---

# Phase 6 Plan 02: Comparison Tab Module Summary

Extract BOM Comparison tab UI logic (~1130 lines) from index.html into js/ui/comparison.js as an ES6 module with an exported init() function. This is the largest and most complex tab extraction — includes scoped comparison tree selection, dual file upload (old and new BOMs), filtering, and export handlers (Excel and HTML).

## What Was Done

### Task 1: Create js/ui/comparison.js Module
Created js/ui/comparison.js containing all BOM Comparison tab UI logic wrapped in an exported init() function.

**Structure:**
- **Module-level imports:** state.js, parser.js, tree.js, flatten.js, compare.js, utils.js
- **Exported init() function:** Contains all Comparison tab logic (~1130 lines)
- **DOM element caching (inside init):** 36 DOM element references including old/new BOM upload zones, tree selection panels, comparison controls, export buttons
- **Event listeners (inside init):** Old/new BOM upload (click, dragover, dragleave, drop, file input change), compare button, reset buttons (scope reset and full reset), export buttons (Excel and HTML), change file links, filter buttons
- **Handler functions (inside init):** renderSelectionTree, renderSelectionNode, toggleSelectionChildren, handleNodeSelection, updateSelectionDisplay, handleCompareFile, showCompareMessage, displayComparisonResults, sortComparisonResults, renderComparisonTable, plus inline flatten/compare/export logic

**Key features extracted:**
- Scoped comparison with tree selection UI (click to select node, visual feedback, scope display)
- Dual file upload with drag-and-drop support (old and new BOM)
- File parsing for both XML and CSV formats with XLSX library integration
- Tree building and selection state management
- Flatten and compare operations with scope support
- Comparison results display with filtering (All, Added, Removed, Changed)
- Export to Excel and HTML with full comparison data
- Reset functionality (scope reset vs. full reset)
- Change file links to re-upload different files

**Commit:** `546b8e4` - "feat(06-02): create Comparison tab UI module"

### Task 2: Wire Comparison Module into index.html and Remove Inline Code
Updated index.html to import and initialize the Comparison module, then removed all inline Comparison code.

**Changes:**
1. **Added comparison.js import:** `import { init as initComparison } from './js/ui/comparison.js';`
2. **Updated initializeUI():** Added `initComparison();` call after `initFlatBom();`
3. **Removed inline Comparison code:** Deleted ~1130 lines (lines 439-1568) including all state comments, DOM element declarations, scoped comparison functions, file upload handlers, flatten/compare logic, display functions, filtering, exports, reset handlers, and change file handlers
4. **Removed unused imports:**
   - Removed `import { flattenBOM, sortBOM } from './js/core/flatten.js';` - now only imported in comparison.js and flat-bom.js
   - Removed `import { compareBOMs, extractSubtree } from './js/core/compare.js';` - now only imported in comparison.js
   - Trimmed `import { parseLength, decimalToFractional, getParentLevel, getCompositeKey, createDiff } from './js/core/utils.js';` down to `import { decimalToFractional } from './js/core/utils.js';` - Hierarchy tab only uses decimalToFractional, all other functions now only in modules

**Remaining in index.html:**
- Tab switching code (untouched)
- Flat BOM tab code (already extracted in 06-01)
- Hierarchy tab code (still inline, will be extracted in 06-03)
- Minimal imports needed for remaining inline code

**Commit:** `587d8e8` - "feat(06-02): wire Comparison module into index.html and remove inline code"

## Verification Results

All verifications passed:
- ✓ comparison.js exports `init` function
- ✓ Module imports state.js, parser.js, tree.js, flatten.js, compare.js, utils.js
- ✓ All DOM queries are inside init() (no module-level queries)
- ✓ All key functions present: renderSelectionTree, handleCompareFile, displayComparisonResults, renderComparisonTable, sortComparisonResults
- ✓ index.html imports comparison.js and calls initComparison() in initializeUI
- ✓ Zero Comparison DOM element declarations remain in index.html
- ✓ Zero Comparison functions remain in index.html
- ✓ Hierarchy code still present (6 matches for "HIERARCHY VIEW")
- ✓ compare.js and flatten.js imports removed from index.html
- ✓ Tests maintain 2/4 pass baseline (no regressions)

**Test results:** 2/4 tests pass (same baseline as before extraction)
- Test 1 (Flat BOM XML): FAIL - pre-existing issue with revision handling
- Test 2 (GA Comparison CSV): FAIL - pre-existing issue with change detection
- Test 3 (GA Comparison XML): PASS
- Test 4 (Scoped Comparison): PASS

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

**Files created:**
```bash
$ [ -f "C:/Users/amcallister/Projects/bom-tool/js/ui/comparison.js" ] && echo "FOUND: js/ui/comparison.js"
FOUND: js/ui/comparison.js
```

**Commits exist:**
```bash
$ git log --oneline --all | grep -E "(546b8e4|587d8e8)"
587d8e8 feat(06-02): wire Comparison module into index.html and remove inline code
546b8e4 feat(06-02): create Comparison tab UI module
```

**Module exports verified:**
```bash
$ node -e "import('./js/ui/comparison.js').then(m => console.log('Exports:', Object.keys(m)))"
Exports: [ 'init' ]
```

**Code removed from index.html:**
```bash
$ grep -c "const oldBomZone\|const compareBtn\|function renderSelectionTree" index.html
0
```

**Hierarchy code intact:**
```bash
$ grep -c "HIERARCHY VIEW" index.html
6
```

All verification checks passed. Files exist, commits are in history, module exports correctly, code was removed from index.html, and Hierarchy code remains untouched.

## Impact

**Lines of code:**
- Created: js/ui/comparison.js (1138 lines)
- Modified: index.html (-1130 net: removed 1133 Comparison lines, added 3 import/init lines)
- **Net change:** Roughly neutral (code moved, not eliminated)

**Module boundaries:**
- js/ui/comparison.js now owns all Comparison tab UI logic
- index.html reduced by ~1130 lines (~20% of remaining inline JS after 06-01)
- Clear separation between Flat BOM, Comparison, and Hierarchy tabs

**Import optimization:**
- compare.js now only imported where needed (comparison.js)
- flatten.js now only imported where needed (comparison.js, flat-bom.js)
- utils.js import in index.html reduced from 5 functions to 1 (decimalToFractional)
- Cleaner dependency graph - index.html only imports what Hierarchy tab needs

**Technical debt reduction:**
- Largest inline code block extracted (Comparison was ~1130 lines)
- Most complex tab logic now in module (scoped comparison, dual file upload, filtering, exports)
- Only Hierarchy tab remains inline (~800 lines, will be extracted in 06-03)

## Next Steps

**Immediate (Phase 6 Plan 03):**
- Extract Hierarchy tab UI logic (~800 lines) into js/ui/hierarchy.js
- Final module extraction - will leave index.html with only tab switching and module initialization
- Remove any remaining inline core imports from index.html (parseXML, buildTree, etc. will only be in modules)

**Phase completion:**
- After 06-03, all three tab modules complete (flat-bom.js, comparison.js, hierarchy.js)
- index.html will be minimal: imports, DOMContentLoaded listener, initializeUI(), tab switching
- Phase 6 complete: Full UI module extraction with clear separation of concerns
