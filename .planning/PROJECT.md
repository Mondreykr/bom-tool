# BOM Tool

## What This Is

A web application for flattening, comparing, and visualizing hierarchical Bills of Materials (BOMs) from SOLIDWORKS PDM exports. Used by Operations for procurement and work orders. Deployed at https://mondreykr.github.io/bom-tool/.

## Core Value

Accurate BOM processing that Operations can trust. The tool is the only BOM processing system the team has — if it breaks, procurement and work orders stop.

## Current Milestone: v2.0 IFP BOM Merge

**Goal:** Add IFP Merge capability — detect WIP assemblies in PDM exports, graft last-known-good content from prior IFP artifacts, and produce official IFP BOM revision artifacts.

**Target features:**
- IFP Merge tab (4th tab) with state-aware hierarchy view
- Top-down branch walk with WIP detection and grafting from B(n-1)
- JSON artifact output (B(n)) with SHA-256 integrity hash
- REV0 mode (first IFP, no prior artifact) and REV n>=1 mode (requires B(n-1))
- State pills (green = Released, red = WIP) on assembly nodes
- WIP content hiding toggle and grafted content highlighting
- WIP component validation (block merge if Released parent has WIP component)
- JSON file format support across all tabs (B(n) loadable into Flat BOM, Hierarchy, Comparison)
- GA part number validation between X(n) and B(n-1)
- Auto-load B(n) into existing tabs after merge for evaluation

**Product version:** BOM Tool 2.2

## Current State

**Milestone version:** v1.0 shipped (2026-02-10), v2.0 in progress
**Stack:** HTML5, CSS3, vanilla JavaScript ES6+, SheetJS v0.18.5 via CDN
**Architecture:** 14 modular ES6 files (refactored from single 4400-line HTML file)
**Lines of code:** 5,437
**Tests:** 4 automated tests (flatten XML/CSV, compare XML/CSV) — all passing
**Deployment:** GitHub Pages from main branch root
**Development branch:** `v2.2-ifp-merge` — merge to main only when ready to deploy

## Requirements

### Validated

- ✓ Flatten hierarchical BOMs into single-level with aggregated quantities — v1.0
- ✓ Parse CSV files (UTF-16LE, tab/comma delimited, SOLIDWORKS PDM exports) — v1.0
- ✓ Parse XML files (SOLIDWORKS PDM hierarchical exports) — v1.0
- ✓ Compare two BOM revisions: Added, Removed, Changed items — v1.0
- ✓ Scoped comparison of any selected sub-assembly or part — v1.0
- ✓ Hierarchy View with expandable/collapsible tree and connector lines — v1.0
- ✓ Excel export (.xlsx) via SheetJS — v1.0
- ✓ Static HTML export with embedded styling — v1.0
- ✓ Fractional length conversion (decimal to nearest 1/16") — v1.0
- ✓ Word-level diff highlighting for changed descriptions — v1.0
- ✓ Filename-based display and export naming — v1.0
- ✓ Composite key aggregation (PartNumber|Length) for cut-to-length stock — v1.0
- ✓ Multi-file modular architecture with ES6 modules — v1.0
- ✓ Centralized state management — v1.0
- ✓ GitHub Pages deployment with all modules loading correctly — v1.0
- ✓ 4/4 automated tests passing against modular codebase — v1.0

### Active

- [ ] IFP Merge: detect WIP assemblies, graft from prior artifact, produce official IFP BOM
- [ ] JSON artifact format with integrity verification
- [ ] State-aware hierarchy visualization with WIP/Released indicators
- [ ] JSON file parsing support across all tabs

### Out of Scope

- Build tools or module bundlers — ES6 modules work natively without bundling
- Framework adoption (React, Vue, etc.) — stay vanilla JS
- Database or backend — remains fully client-side (until vendor platform)
- ES module bundling/minification — GitHub Pages + HTTP/2 handles multiple files fine

## Context

**v1.0 shipped:** The multi-file refactor is complete. The tool went from a single 4400-line HTML file to 14 modular ES6 files with zero behavioral changes, deployed and verified on GitHub Pages.

**v2.0 in progress:** IFP BOM Merge — the Release Gate Model. WIP assemblies stay unsuppressed in PDM exports; the tool detects them by state, grafts last-known-good content from the prior IFP artifact, and produces official IFP BOM revision artifacts as JSON files with integrity verification.

**Reference documents:**
- `docs/IFP BOM Merge Tool PRD 20250211.md` — Full specification (algorithm, edge cases, process flow)
- `docs/IFP BOM Merge Tool - Codebase Reality Check 20250205.md` — PRD validated against codebase
- `docs\Release Gate Model Walkthrough 20260211.md` — Full explanatory walkthrough of the intent

**Future roadmap:**
1. ~~IFP BOM Merge Tool~~ — v2.0 (in progress)
2. Vendor/procurement platform — vendor lists, auto-grouping, template exports, email automation, database

## Constraints

- **No build tools**: Native ES6 modules loaded via `<script type="module">` — no webpack, no bundling
- **GitHub Pages**: Static site only (no server-side processing)
- **CDN dependencies**: SheetJS v0.18.5 and Google Fonts remain external CDN loads
- **Corporate IT**: Blocks localhost web servers — browser testing via GitHub Pages only
- **User skill level**: Repository owner has zero coding experience — process must be safe and recoverable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refactor before IFP Merge | Clean module boundaries make IFP Merge easier and less risky | ✓ Good — modular structure ready for new features |
| No build tools | Keeps deployment simple for non-technical owner | ✓ Good — ES6 modules work natively on GitHub Pages |
| ES6 modules (not global functions) | Native import/export provides clear dependency graph | ✓ Good — clean module boundaries, no globals |
| Adapt test harness first | Tests are the safety net — must work before splitting code | ✓ Good — caught regressions immediately |
| State object pattern | Single exported state object vs 44+ getter/setter functions | ✓ Good — kept imports simple, migrations mechanical |
| Init function pattern | DOM queries inside exported init() to avoid ES6 timing issues | ✓ Good — eliminated race conditions |
| sortChildren separated from buildTree | Fix test regressions while preserving sorted display | ✓ Good — core produces canonical output, UI sorts for display |
| Feature branch for v2.2+ | Protects production (main) during development; merge when milestone is complete | Updated from v1.0 "work on main" approach |
| GitHub Pages for browser testing | Corporate IT blocks localhost servers | ✓ Good — deployed and verified successfully |
| B(n) format: JSON with SHA-256 hash | Machine-readable, reimportable, tamper-detectable; browser has native crypto APIs | — Pending |
| 4th tab for IFP Merge | Distinct workflow from existing 3 tabs; Engineering uses it, Operations ignores it | — Pending |
| Separate GSD milestone vs product version | GSD milestones (v1.0, v2.0) track work units; product version (BOM Tool 2.2) tracks public identity | — Pending |
| State whitelist (IFP/IFU = Released) | Only two approved states; everything else is WIP by exclusion; future-proof | — Pending |

---
*Last updated: 2026-02-11 after v2.0 milestone started*
