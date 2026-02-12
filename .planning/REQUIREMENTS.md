# Requirements: BOM Tool

**Defined:** 2026-02-11
**Core Value:** Accurate BOM processing that Operations can trust

## v2.0 Requirements

Requirements for IFP BOM Merge milestone. Each maps to roadmap phases.

### Merge Core

- [ ] **MERGE-01**: Tool detects assembly PDM state using whitelist (IFP/IFU = Released, everything else = WIP)
- [ ] **MERGE-02**: Tool walks BOM tree top-down, stopping at first WIP assembly on each branch and grafting entire subtree from B(n-1)
- [ ] **MERGE-03**: Tool handles REV0 mode (no prior artifact) — user-triggered, validates all assemblies are Released
- [ ] **MERGE-04**: WIP assembly with no prior release in B(n-1) is included as empty placeholder with warning
- [ ] **MERGE-05**: Each branch is evaluated independently (multi-branch independence)
- [ ] **MERGE-06**: Deep WIP detection at any depth (L2, L3, etc.), not just L1
- [ ] **MERGE-07**: Parent-child quantity comes from current export X(n); grafted subtree's internal quantities come from B(n-1)

### Artifact Format

- [ ] **ARTF-01**: B(n) exported as JSON with full tree structure, metadata, and all BOMNode fields
- [ ] **ARTF-02**: JSON metadata includes SHA-256 integrity hash of the BOM data
- [ ] **ARTF-03**: Tool verifies B(n-1) integrity hash on import; rejects modified files
- [ ] **ARTF-04**: Tool validates GA part number match between X(n) and B(n-1)
- [ ] **ARTF-05**: Auto-generated filename: `1J{GA_PN}-IFP REV{n} (MMM D, YYYY).json` where date is generation date
- [ ] **ARTF-06**: IFP revision number auto-suggested from B(n-1) + 1, user-overridable

### IFP Merge Tab UI

- [ ] **UI-01**: 4th tab "IFP Merge" alongside existing Flat BOM, Comparison, Hierarchy tabs
- [ ] **UI-02**: Source Export X(n) upload zone (accepts XML)
- [ ] **UI-03**: Prior IFP B(n-1) upload zone (accepts JSON), hidden/disabled when REV0 selected
- [ ] **UI-04**: "First IFP (REV0)" toggle that switches between REV0 and REV n>=1 modes
- [ ] **UI-05**: State-aware hierarchy view of X(n), collapsed by default
- [ ] **UI-06**: State pills on assembly nodes — green for Released (IFP/IFU), red for WIP
- [ ] **UI-07**: "Hide WIP content" toggle — hides children of WIP assemblies, keeps WIP assembly itself visible if parent is Released
- [ ] **UI-08**: After merge, grafted content highlighted in soft yellow by default
- [ ] **UI-09**: Toggle to hide/show B(n-1) substitutions
- [ ] **UI-10**: Merge summary displayed after merge (assemblies passed through, grafted, placeholders created)
- [ ] **UI-11**: Export B(n) button to download the JSON artifact

### Validation & Safety

- [ ] **VALID-01**: WIP component under Released parent assembly blocks merge with error message
- [ ] **VALID-02**: WIP GA (root node) blocks merge with error message
- [ ] **VALID-03**: Source indicator on each node marking "current" (from X(n)) or "grafted" (from B(n-1))

### Integration

- [ ] **INTEG-01**: JSON file parsing support — all existing tabs can load B(n) JSON files
- [ ] **INTEG-02**: After merge, B(n) auto-loads into Flat BOM, Hierarchy, and Comparison tabs for evaluation
- [ ] **INTEG-03**: Source annotation (current vs grafted) visible in other tabs with subtle indicator

## Future Requirements

### Vendor Platform

- **VEND-01**: Vendor lists linked to part numbers
- **VEND-02**: Auto-grouping of parts by vendor
- **VEND-03**: Template-based export for vendor POs
- **VEND-04**: Email automation for procurement

## Out of Scope

| Feature | Reason |
|---------|--------|
| XML output for B(n) | No XML serializer exists; JSON with integrity hash is sufficient |
| PDM-compatible XML export | Would require ~200-300 lines, extensive testing; defer if ever needed |
| Build tools or module bundlers | ES6 modules work natively without bundling |
| Framework adoption (React, Vue) | Stay vanilla JS |
| Database or backend | Remains fully client-side |
| Automated PDM integration | Tool processes exported files; no direct PDM API connection |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MERGE-01 | Phase 11 | Pending |
| MERGE-02 | Phase 11 | Pending |
| MERGE-03 | Phase 11 | Pending |
| MERGE-04 | Phase 11 | Pending |
| MERGE-05 | Phase 11 | Pending |
| MERGE-06 | Phase 11 | Pending |
| MERGE-07 | Phase 11 | Pending |
| ARTF-01 | Phase 12 | Pending |
| ARTF-02 | Phase 12 | Pending |
| ARTF-03 | Phase 12 | Pending |
| ARTF-04 | Phase 12 | Pending |
| ARTF-05 | Phase 12 | Pending |
| ARTF-06 | Phase 12 | Pending |
| VALID-01 | Phase 13 | Pending |
| VALID-02 | Phase 13 | Pending |
| VALID-03 | Phase 13 | Pending |
| UI-01 | Phase 14 | Pending |
| UI-02 | Phase 14 | Pending |
| UI-03 | Phase 14 | Pending |
| UI-04 | Phase 14 | Pending |
| UI-05 | Phase 14 | Pending |
| UI-06 | Phase 14 | Pending |
| UI-07 | Phase 14 | Pending |
| UI-08 | Phase 14 | Pending |
| UI-09 | Phase 14 | Pending |
| UI-10 | Phase 14 | Pending |
| UI-11 | Phase 14 | Pending |
| INTEG-01 | Phase 15 | Pending |
| INTEG-02 | Phase 15 | Pending |
| INTEG-03 | Phase 15 | Pending |

**Coverage:**
- v2.0 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0
- Coverage: 100% ✓

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
