# BOM Tool Multi-File Refactor

## What This Is

Refactoring the BOM Tool from a single 4400-line HTML file into a clean multi-file codebase. The tool currently flattens, compares, and visualizes hierarchical Bills of Materials from SOLIDWORKS PDM exports. It works perfectly and is production-validated. This refactor changes the architecture without changing any behavior — every output must match exactly.

## Core Value

The tool must produce identical outputs after refactoring. This is the only BOM processing tool the operations team has — if it breaks, procurement and work orders stop. Zero tolerance for output differences.

## Requirements

### Validated

- ✓ Flatten hierarchical BOMs into single-level with aggregated quantities — existing
- ✓ Parse CSV files (UTF-16LE, tab/comma delimited, SOLIDWORKS PDM exports) — existing
- ✓ Parse XML files (SOLIDWORKS PDM hierarchical exports) — existing
- ✓ Compare two BOM revisions: Added, Removed, Changed items — existing
- ✓ Scoped comparison of any selected sub-assembly or part — existing
- ✓ Hierarchy View with expandable/collapsible tree and connector lines — existing
- ✓ Excel export (.xlsx) via SheetJS — existing
- ✓ Static HTML export with embedded styling — existing
- ✓ Fractional length conversion (decimal to nearest 1/16") — existing
- ✓ Word-level diff highlighting for changed descriptions — existing
- ✓ Filename-based display and export naming — existing
- ✓ Composite key aggregation (PartNumber|Length) for cut-to-length stock — existing

### Active

- [ ] Split `index.html` into separate HTML, CSS, and JavaScript files
- [ ] Organize JavaScript into logical modules (core, tabs, export)
- [ ] Maintain all existing functionality identically (zero behavior change)
- [ ] Pass all existing automated tests against refactored codebase
- [ ] Deploy and verify on GitHub Pages with multi-file structure
- [ ] Use git branch workflow (`refactor/multi-file`) for safety

### Out of Scope

- New features (IFP Merge, vendor lists, etc.) — this is architecture-only
- Build tools or module bundlers — simple `<script>` tags, no complexity
- Framework adoption (React, Vue, etc.) — stay vanilla JS
- Database or backend — remains fully client-side
- UI changes — tool looks and behaves identically

## Context

**Why now:** The tool is growing. IFP Merge is next, then a vendor/procurement platform with persistent data, email automation, and template-based exports. The current single-file architecture makes changes risky and difficult to work with. Splitting now creates a clean foundation for everything that follows.

**Existing test harness:** A Node.js test runner (`test/run-tests.js`) extracts core BOM functions from the HTML file and validates outputs against baseline Excel files. 4 tests cover flat BOM (XML + CSV) and comparison (XML + CSV). This is the primary safety mechanism — tests must pass before and after refactoring.

**Proposed file structure** (from `archive/IFP BOM Merge Tool - Codebase Reality Check.md`):
```
bom-tool/
├── index.html              # HTML structure only (~400 lines)
├── css/
│   └── styles.css          # All styling (~800 lines)
├── js/
│   ├── core/
│   │   ├── parser.js       # parseCSV(), parseXML()
│   │   ├── tree.js         # BOMNode, buildTree(), getParentLevel()
│   │   ├── flatten.js      # flattenBOM(), getCompositeKey()
│   │   └── compare.js      # compareBOMs(), createDiff()
│   ├── tabs/
│   │   ├── flat-bom.js     # Flat BOM tab UI and logic
│   │   ├── comparison.js   # Comparison tab UI and logic
│   │   └── hierarchy.js    # Hierarchy tab UI and logic
│   ├── export/
│   │   ├── excel.js        # Excel export functions
│   │   └── html.js         # HTML export functions
│   └── main.js             # Initialization, event binding
```

**Git workflow:** All work happens on a `refactor/multi-file` branch. The `main` branch keeps the working single-file version untouched until the refactor is fully validated and merged.

**Future roadmap (not this project):**
1. IFP BOM Merge Tool — detect WIP assemblies and graft last-known-good content
2. Vendor/procurement platform — vendor lists, auto-grouping, template exports, email automation, database

## Constraints

- **Zero breakage**: Operations depends on this tool exclusively — outputs must match bit-for-bit
- **No build tools**: Files loaded via `<script>` tags in order — no webpack, no bundling
- **GitHub Pages**: Must deploy and work as a static site (no server-side processing)
- **CDN dependencies**: SheetJS v0.18.5 and Google Fonts remain external CDN loads
- **Test harness adaptation**: Existing test runner extracts functions from single HTML file — must be updated to work with multi-file structure
- **User skill level**: Repository owner has zero coding experience — process must be safe and recoverable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refactor before IFP Merge | Clean module boundaries make IFP Merge easier and less risky | — Pending |
| Git branch workflow | Protects working `main` branch during risky structural changes | — Pending |
| No build tools | Keeps deployment simple for non-technical owner; `<script>` tag loading sufficient | — Pending |
| Global functions (no ES modules yet) | Avoids import/export complexity; can migrate to ES modules later | — Pending |
| Adapt test harness first | Tests are the safety net — must work against new structure before splitting code | — Pending |

---
*Last updated: 2026-02-07 after initialization*
