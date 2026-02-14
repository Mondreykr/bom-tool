# Roadmap: BOM Tool

## Milestones

- v1.0 Multi-File Refactor - Phases 1-10 (shipped 2026-02-10)
- v2.0 IFP BOM Merge - Phases 11-15 (in progress)

## Phases

<details>
<summary>v1.0 Multi-File Refactor (Phases 1-10) - SHIPPED 2026-02-10</summary>

**Delivered:** Transformed a production-validated 4400-line single-file HTML application into 14 modular ES6 files with zero behavioral changes, deployed and verified on GitHub Pages.

**Key accomplishments:**
1. Extracted 4400-line monolith into 14 modular ES6 files with clean separation of concerns
2. Achieved 4/4 automated tests passing with zero behavioral changes
3. Centralized 22 global variables into single state module
4. Deployed and verified on GitHub Pages — all three tabs functional
5. Separated sortChildren from buildTree to fix test/display architecture conflict
6. Reduced index.html from 4400 lines to 394 lines (91% reduction)

**Archives:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`

</details>

### v2.0 IFP BOM Merge (In Progress)

**Milestone Goal:** Add IFP Merge capability — detect WIP assemblies in PDM exports, graft last-known-good content from prior IFP artifacts, and produce official IFP BOM revision artifacts.

#### Phase 11: Core Merge Engine
**Goal**: Merge algorithm detects WIP assemblies, grafts subtrees from prior artifacts, and handles all edge cases
**Depends on**: Phase 10 (v1.0 complete)
**Requirements**: MERGE-01, MERGE-02, MERGE-03, MERGE-04, MERGE-05, MERGE-06, MERGE-07
**Success Criteria** (what must be TRUE):
  1. Tool identifies assembly state using whitelist (IFP/IFU = Released, all else = WIP)
  2. Tool walks BOM tree top-down, stopping at first WIP assembly on each branch
  3. Tool grafts entire subtree from B(n-1) at WIP stop points
  4. REV0 mode validates all assemblies are Released and produces first artifact
  5. WIP assemblies with no prior release create empty placeholders with warnings
  6. Deep WIP detection works at any tree depth (L2, L3, etc.)
  7. Parent-child quantities come from X(n), grafted subtree internals come from B(n-1)
**Plans:** 2 plans

Plans:
- [x] 11-01-PLAN.md — Core merge engine TDD: state detection, tree walk, grafting, REV0, placeholders, source tags
- [x] 11-02-PLAN.md — Graft boundary rules, change annotations, missing assembly warnings, merge summary

#### Phase 12: JSON Artifact Format
**Goal**: IFP artifacts export/import as JSON with integrity verification and all metadata
**Depends on**: Phase 11
**Requirements**: ARTF-01, ARTF-02, ARTF-03, ARTF-04, ARTF-05, ARTF-06
**Success Criteria** (what must be TRUE):
  1. B(n) exports as JSON with full tree structure, metadata, and all BOMNode fields
  2. JSON includes SHA-256 integrity hash computed from BOM data
  3. Tool verifies B(n-1) hash on import and rejects modified files
  4. Tool validates GA part number matches between X(n) and B(n-1) before merge
  5. Exported filename follows pattern: `1J{GA_PN}-IFP REV{n} (MMM D, YYYY).json`
  6. IFP revision number auto-suggests B(n-1) + 1, user can override
**Plans:** 2 plans

Plans:
- [x] 12-01-PLAN.md — JSON artifact export: tree serialization, SHA-256 hash, filename generation, revision numbering
- [x] 12-02-PLAN.md — JSON artifact import and validation: hash verification, GA PN match, revision gap detection

#### Phase 13: Validation System
**Goal**: Safety checks prevent invalid merges before they happen, using NS Item Type as authoritative assembly identifier
**Depends on**: Phase 11
**Requirements**: VALID-01, VALID-02, VALID-03
**Success Criteria** (what must be TRUE):
  1. WIP component under Released parent assembly blocks merge with error message
  2. WIP GA (root node) blocks merge with error message
  3. Every node has source indicator marking "current" (from X(n)) or "grafted" (from B(n-1))
**Plans:** 2 plans

Plans:
- [x] 13-01-PLAN.md — Assembly identification fix (nsItemType) + pre-merge validation rules (TDD)
- [x] 13-02-PLAN.md — Validation logic reference document

#### Phase 14: IFP Merge Tab UI
**Goal**: New IFP Merge tab provides state-aware hierarchy view, merge controls, and B(n) export
**Depends on**: Phase 12, Phase 13
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11
**Success Criteria** (what must be TRUE):
  1. 4th tab "IFP Merge" appears alongside Flat BOM, Comparison, Hierarchy tabs
  2. User can upload Source Export X(n) as XML file
  3. User can upload Prior IFP B(n-1) as JSON file (hidden when REV0 selected)
  4. "First IFP (REV0)" toggle switches between REV0 and REV n>=1 modes
  5. State-aware hierarchy displays X(n) with assembly nodes showing green (Released) or red (WIP) pills
  6. "Hide WIP content" toggle hides children of WIP assemblies while keeping WIP assembly visible if parent is Released
  7. After merge, grafted content highlights in soft yellow by default
  8. Toggle hides/shows B(n-1) substitutions
  9. Merge summary displays counts: assemblies passed through, grafted, placeholders created
  10. "Export B(n)" button downloads JSON artifact with auto-generated filename
**Plans:** 2 plans

Plans:
- [x] 14-01-PLAN.md — Tab shell, uploads, state-aware tree rendering with state pills, validation display, view controls
- [x] 14-02-PLAN.md — Merge execution, grafted highlighting, summary stats, export B(n), visual verification

#### Phase 15: Cross-Tab Integration
**Goal**: JSON files work across all tabs, B(n) auto-loads after merge for evaluation
**Depends on**: Phase 14
**Requirements**: INTEG-01, INTEG-02, INTEG-03
**Success Criteria** (what must be TRUE):
  1. Flat BOM, Hierarchy, and Comparison tabs can load and parse B(n) JSON files
  2. After IFP merge completes, B(n) auto-loads into all three existing tabs for evaluation
  3. Source annotation (current vs grafted) appears in other tabs with subtle indicator
**Plans**: TBD

Plans:
- [ ] 15-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14 -> 15

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Test Infrastructure | v1.0 | 2/2 | Complete | 2026-02-07 |
| 2. CSS Extraction | v1.0 | 1/1 | Complete | 2026-02-07 |
| 3. Utilities Extraction | v1.0 | 1/1 | Complete | 2026-02-08 |
| 4. Core Logic Extraction | v1.0 | 1/1 | Complete | 2026-02-08 |
| 5. State Management | v1.0 | 2/2 | Complete | 2026-02-08 |
| 6. UI Module Extraction | v1.0 | 3/3 | Complete | 2026-02-09 |
| 7. Export Module Extraction | v1.0 | 2/2 | Complete | 2026-02-09 |
| 8. Entry Point Consolidation | v1.0 | 1/1 | Complete | 2026-02-09 |
| 9. Deployment | v1.0 | 2/2 | Complete | 2026-02-09 |
| 10. Final Validation | v1.0 | 2/2 | Complete | 2026-02-09 |
| 11. Core Merge Engine | v2.0 | 2/2 | Complete | 2026-02-11 |
| 12. JSON Artifact Format | v2.0 | 2/2 | Complete | 2026-02-12 |
| 13. Validation System | v2.0 | 2/2 | Complete | 2026-02-12 |
| 14. IFP Merge Tab UI | v2.0 | 2/2 | Complete | 2026-02-13 |
| 15. Cross-Tab Integration | v2.0 | 0/? | Not started | - |

---
*Last updated: 2026-02-13 after Phase 14 execution complete*
