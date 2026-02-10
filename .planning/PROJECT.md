# BOM Tool

## What This Is

A web application for flattening, comparing, and visualizing hierarchical Bills of Materials (BOMs) from SOLIDWORKS PDM exports. Used by Operations for procurement and work orders. Deployed at https://mondreykr.github.io/bom-tool/.

## Core Value

Accurate BOM processing that Operations can trust. The tool is the only BOM processing system the team has — if it breaks, procurement and work orders stop.

## Current State

**Version:** v1.0 (shipped 2026-02-10)
**Stack:** HTML5, CSS3, vanilla JavaScript ES6+, SheetJS v0.18.5 via CDN
**Architecture:** 14 modular ES6 files (refactored from single 4400-line HTML file)
**Lines of code:** 5,437
**Tests:** 4 automated tests (flatten XML/CSV, compare XML/CSV) — all passing
**Deployment:** GitHub Pages from main branch root

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

(None — next milestone not yet planned)

### Out of Scope

- Build tools or module bundlers — ES6 modules work natively without bundling
- Framework adoption (React, Vue, etc.) — stay vanilla JS
- Database or backend — remains fully client-side (until vendor platform)
- ES module bundling/minification — GitHub Pages + HTTP/2 handles multiple files fine

## Context

**v1.0 shipped:** The multi-file refactor is complete. The tool went from a single 4400-line HTML file to 14 modular ES6 files with zero behavioral changes, deployed and verified on GitHub Pages.

**Future roadmap:**
1. IFP BOM Merge Tool — detect WIP assemblies and graft last-known-good content
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
| Work on main branch (not feature branch) | Simpler for non-technical user, atomic commits provide safety | ✓ Good — rollback via git revert documented |
| GitHub Pages for browser testing | Corporate IT blocks localhost servers | ✓ Good — deployed and verified successfully |

---
*Last updated: 2026-02-10 after v1.0 milestone*
