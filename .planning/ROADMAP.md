# Roadmap: BOM Tool Multi-File Refactor

## Overview

Transform a production-validated 4400-line single-file HTML application into a maintainable multi-file codebase without changing any behavior. The BOM Tool is mission-critical for operations — it processes Bills of Materials for procurement and work orders. This refactor establishes a clean architecture foundation for future features (IFP Merge, vendor/procurement platform) while maintaining zero tolerance for output differences. Phases follow leaf-to-root extraction: test infrastructure first, then CSS, utilities, core logic, state management, UI modules, exports, entry point, and final validation. All automated tests must pass at every phase.

## Phases

- [x] **Phase 1: Test Infrastructure** - Adapt test harness to validate modular structure
- [ ] **Phase 2: CSS Extraction** - Extract styling to separate file
- [ ] **Phase 3: Utilities Extraction** - Extract zero-dependency utility functions
- [ ] **Phase 4: Core Logic Extraction** - Extract business logic modules
- [ ] **Phase 5: State Management** - Centralize global state
- [ ] **Phase 6: UI Module Extraction** - Extract tab-specific UI logic
- [ ] **Phase 7: Export Module Extraction** - Extract Excel and HTML export functions
- [ ] **Phase 8: Entry Point Consolidation** - Wire modules together in main.js
- [ ] **Phase 9: Deployment** - Git branch workflow and GitHub Pages deployment
- [ ] **Phase 10: Final Validation** - Comprehensive testing before production

## Phase Details

### Phase 1: Test Infrastructure
**Goal**: Test harness validates refactored code at every step
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Test runner imports functions from multi-file structure instead of extracting from HTML
  2. All 4 existing validation tests pass against current single-file codebase
  3. Browser smoke test checklist exists for manual verification
  4. Test execution time is under 10 seconds
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Extract core BOM functions into js/core/ ES6 module files
- [x] 01-02-PLAN.md — Rewrite test harness imports, verify tests, create smoke test checklist

### Phase 2: CSS Extraction
**Goal**: Styling lives in separate file with zero visual changes
**Depends on**: Phase 1
**Requirements**: CSS-01, CSS-02
**Success Criteria** (what must be TRUE):
  1. All CSS extracted from index.html into css/styles.css
  2. Visual appearance is pixel-identical in browser (all three tabs)
  3. Print styles work identically (export HTML previews)
  4. External fonts (Google Fonts) load correctly
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 3: Utilities Extraction
**Goal**: Zero-dependency utility functions work as ES6 modules
**Depends on**: Phase 2
**Requirements**: CORE-01
**Success Criteria** (what must be TRUE):
  1. parseLength(), decimalToFractional(), getParentLevel(), getCompositeKey(), createDiff() extracted to js/core/utils.js
  2. All utility functions export correctly as named exports
  3. Utility functions produce identical outputs to original implementation
  4. Automated tests pass (no behavioral changes)
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 4: Core Logic Extraction
**Goal**: Business logic modules handle parsing, tree building, flattening, comparison
**Depends on**: Phase 3
**Requirements**: CORE-02, CORE-03, CORE-04, CORE-05, CORE-06
**Success Criteria** (what must be TRUE):
  1. BOMNode class exported from js/core/tree.js
  2. File parsers (parseCSV, parseXML) work from js/core/parser.js
  3. Tree operations (buildTree) work from js/core/tree.js
  4. BOM flattening (flattenBOM, getCompositeKey) works from js/core/flatten.js
  5. BOM comparison (compareBOMs) works from js/core/compare.js
  6. All 4 automated tests pass with identical outputs
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 5: State Management
**Goal**: All global state centralized in single state module
**Depends on**: Phase 4
**Requirements**: STATE-01, STATE-02, STATE-03
**Success Criteria** (what must be TRUE):
  1. All ~20 global variables consolidated into js/ui/state.js
  2. All tabs read/write state through centralized module
  3. State values behave identically to original global variables
  4. No functional regressions (tabs can still switch, data persists correctly)
  5. Automated tests pass with state centralization
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 6: UI Module Extraction
**Goal**: Tab-specific UI logic operates as independent modules
**Depends on**: Phase 5
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Flat BOM tab logic works from js/ui/flat-bom.js
  2. BOM Comparison tab logic works from js/ui/comparison.js
  3. Hierarchy View tab logic works from js/ui/hierarchy.js
  4. All event listeners bind correctly after DOMContentLoaded
  5. Tab switching, file uploads, button clicks work identically
  6. All three tabs render results correctly
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 7: Export Module Extraction
**Goal**: Export functionality produces identical Excel and HTML files
**Depends on**: Phase 6
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04
**Success Criteria** (what must be TRUE):
  1. Excel export functions work from js/export/excel.js
  2. HTML export functions work from js/export/html.js
  3. Excel exports match control files exactly (validated by automated tests)
  4. HTML exports render identically to current behavior
  5. SheetJS dependency loads before export functions execute
  6. All export filenames follow correct pattern
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 8: Entry Point Consolidation
**Goal**: Application initializes correctly with modular architecture
**Depends on**: Phase 7
**Requirements**: ENTRY-01, ENTRY-02, ENTRY-03
**Success Criteria** (what must be TRUE):
  1. main.js initializes application and wires all modules together
  2. index.html contains only HTML structure and module script tags
  3. SheetJS CDN loads before any parsing code executes
  4. Module load order ensures no undefined references
  5. Application works in browser exactly as before refactor
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 9: Deployment
**Goal**: Multi-file structure deploys successfully to GitHub Pages
**Depends on**: Phase 8
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. All refactor work completed on refactor/multi-file branch
  2. GitHub Pages serves multi-file structure correctly (all files load)
  3. Every extraction step has atomic git commit with passing tests
  4. Branch ready for merge to main (all validation complete)
  5. Rollback plan tested (can revert to single-file version if needed)
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

### Phase 10: Final Validation
**Goal**: Refactored codebase validated and production-ready
**Depends on**: Phase 9
**Requirements**: VALID-01, VALID-02, VALID-03, VALID-04, VALID-05
**Success Criteria** (what must be TRUE):
  1. All 4 automated tests pass on final refactored codebase
  2. All three tabs work correctly in browser (Flat BOM, Comparison, Hierarchy)
  3. All export formats work (Excel and HTML for each tab)
  4. Scoped comparison feature works correctly
  5. Performance is not degraded (page loads and processes files at same speed)
  6. Operations team validation complete (real-world BOM processing tested)
**Plans**: TBD

Plans: (TBD - defined during plan-phase)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Test Infrastructure | 2/2 | ✓ Complete | 2026-02-07 |
| 2. CSS Extraction | 0/TBD | Not started | - |
| 3. Utilities Extraction | 0/TBD | Not started | - |
| 4. Core Logic Extraction | 0/TBD | Not started | - |
| 5. State Management | 0/TBD | Not started | - |
| 6. UI Module Extraction | 0/TBD | Not started | - |
| 7. Export Module Extraction | 0/TBD | Not started | - |
| 8. Entry Point Consolidation | 0/TBD | Not started | - |
| 9. Deployment | 0/TBD | Not started | - |
| 10. Final Validation | 0/TBD | Not started | - |
