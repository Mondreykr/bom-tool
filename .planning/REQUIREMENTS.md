# Requirements: BOM Tool Multi-File Refactor

**Defined:** 2026-02-07
**Core Value:** Identical outputs after refactoring — zero tolerance for behavioral differences.

## v1 Requirements

Requirements for the multi-file refactor. Each maps to roadmap phases.

### Test Infrastructure

- [ ] **TEST-01**: Test runner imports functions from new multi-file structure instead of copied code
- [ ] **TEST-02**: All 4 existing validation tests pass against refactored codebase (same inputs, same controls)
- [ ] **TEST-03**: Tests run at every phase — no code moves without passing tests
- [ ] **TEST-04**: Browser smoke test checklist exists for manual verification after each phase

### CSS Extraction

- [ ] **CSS-01**: All CSS extracted from index.html into separate css/styles.css file
- [ ] **CSS-02**: Visual appearance is pixel-identical in browser after extraction

### Core Logic Extraction

- [ ] **CORE-01**: Utility functions extracted (parseLength, decimalToFractional, getParentLevel, createDiff)
- [ ] **CORE-02**: BOMNode class extracted into its own module
- [ ] **CORE-03**: File parsers extracted (parseCSV, parseXML) into parser module
- [ ] **CORE-04**: Tree operations extracted (buildTree) into tree module
- [ ] **CORE-05**: BOM flattening extracted (flattenBOM, getCompositeKey) into flatten module
- [ ] **CORE-06**: BOM comparison extracted (compareBOMs) into compare module

### State Management

- [ ] **STATE-01**: All ~20 global variables centralized into a single state module
- [ ] **STATE-02**: All tabs read/write state through the same centralized module
- [ ] **STATE-03**: No global variable behavior changes — state values work identically

### UI Extraction

- [ ] **UI-01**: Flat BOM tab logic extracted into its own module
- [ ] **UI-02**: BOM Comparison tab logic extracted into its own module
- [ ] **UI-03**: Hierarchy View tab logic extracted into its own module
- [ ] **UI-04**: All event listeners bind correctly after page loads (no race conditions)

### Export Extraction

- [ ] **EXPORT-01**: Excel export functions extracted into own module
- [ ] **EXPORT-02**: HTML export functions extracted into own module
- [ ] **EXPORT-03**: Excel exports match control files exactly (validated by test runner)
- [ ] **EXPORT-04**: HTML exports render identically to current behavior

### Entry Point & Integration

- [ ] **ENTRY-01**: main.js initializes application and wires all modules together
- [ ] **ENTRY-02**: index.html contains only HTML structure and module script tags
- [ ] **ENTRY-03**: SheetJS CDN loads before any parsing code executes

### Deployment & Git

- [ ] **DEPLOY-01**: All work done on refactor/multi-file branch (main branch untouched)
- [ ] **DEPLOY-02**: GitHub Pages serves multi-file structure correctly
- [ ] **DEPLOY-03**: Atomic commits at each extraction step — tests pass at every commit
- [ ] **DEPLOY-04**: Branch merged to main only after full validation

### Final Validation

- [ ] **VALID-01**: All 4 automated tests pass on final refactored codebase
- [ ] **VALID-02**: All three tabs work correctly in browser (Flat BOM, Comparison, Hierarchy)
- [ ] **VALID-03**: All export formats work (Excel and HTML for each tab)
- [ ] **VALID-04**: Scoped comparison feature works correctly
- [ ] **VALID-05**: Performance is not degraded (page loads and processes files at same speed)

## v2 Requirements

Deferred to future milestones. Not in current roadmap.

### IFP Merge Tool

- **IFP-01**: Detect WIP assemblies by PDM state metadata
- **IFP-02**: Graft last-known-good content from prior IFP release
- **IFP-03**: Produce accurate merged BOM with integrity hash

### Vendor/Procurement Platform

- **VENDOR-01**: Maintain editable vendor list with email contacts
- **VENDOR-02**: Component auto-grouping by type
- **VENDOR-03**: Template-based multi-file Excel export
- **VENDOR-04**: Outlook email integration with pre-populated messages
- **VENDOR-05**: Database backend for persistent data

## Out of Scope

| Feature | Reason |
|---------|--------|
| New UI features or visual changes | Refactor only — tool must look and behave identically |
| Build tools (webpack, vite, etc.) | Adds complexity; ES6 modules work natively without bundling |
| Framework adoption (React, Vue) | Unnecessary for current scope; stay vanilla JS |
| Database or backend | No persistent data needed yet; deferred to vendor platform |
| ES module bundling/minification | Premature optimization; GitHub Pages + HTTP/2 handles multiple files fine |
| Refactoring business logic | Code logic stays identical; only file organization changes |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Pending |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Pending |
| TEST-04 | Phase 1 | Pending |
| CSS-01 | Phase 2 | Pending |
| CSS-02 | Phase 2 | Pending |
| CORE-01 | Phase 3 | Pending |
| CORE-02 | Phase 3 | Pending |
| CORE-03 | Phase 4 | Pending |
| CORE-04 | Phase 4 | Pending |
| CORE-05 | Phase 4 | Pending |
| CORE-06 | Phase 4 | Pending |
| STATE-01 | Phase 5 | Pending |
| STATE-02 | Phase 5 | Pending |
| STATE-03 | Phase 5 | Pending |
| UI-01 | Phase 6 | Pending |
| UI-02 | Phase 6 | Pending |
| UI-03 | Phase 6 | Pending |
| UI-04 | Phase 6 | Pending |
| EXPORT-01 | Phase 7 | Pending |
| EXPORT-02 | Phase 7 | Pending |
| EXPORT-03 | Phase 7 | Pending |
| EXPORT-04 | Phase 7 | Pending |
| ENTRY-01 | Phase 8 | Pending |
| ENTRY-02 | Phase 8 | Pending |
| ENTRY-03 | Phase 8 | Pending |
| DEPLOY-01 | Phase 9 | Pending |
| DEPLOY-02 | Phase 9 | Pending |
| DEPLOY-03 | Phase 9 | Pending |
| DEPLOY-04 | Phase 9 | Pending |
| VALID-01 | Phase 10 | Pending |
| VALID-02 | Phase 10 | Pending |
| VALID-03 | Phase 10 | Pending |
| VALID-04 | Phase 10 | Pending |
| VALID-05 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after initial definition*
