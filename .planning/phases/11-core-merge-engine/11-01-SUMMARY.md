---
phase: 11-core-merge-engine
plan: 01
subsystem: core-algorithms
tags: [tdd, merge-engine, state-detection, grafting, source-tags]
dependency_graph:
  requires:
    - js/core/tree.js (BOMNode class)
  provides:
    - js/core/merge.js (isReleased, buildPNIndex, mergeBOM)
  affects:
    - Phase 12 (Artifact Format) — will use mergeBOM output
    - Phase 14 (IFP UI) — will consume source tags for visualization
tech_stack:
  added:
    - Pure algorithm module (no DOM/XLSX dependencies)
  patterns:
    - TDD: RED-GREEN cycle with 11 comprehensive tests
    - PN-based indexing for O(1) graft lookups
    - Whitelist state detection (approved states only)
    - Deep cloning for immutable grafts
    - Ephemeral source tags for UI consumption
key_files:
  created:
    - js/core/merge.js (186 lines)
    - test/merge-tests.js (869 lines)
  modified: []
decisions:
  - State whitelist: only IFP and IFU are Released, everything else is WIP
  - WIP assembly node at graft point tagged as 'grafted' (not 'current')
  - Empty placeholders for WIP assemblies with no prior release
  - PN-based matching regardless of tree position
  - Source tags are ephemeral (for UI, stripped on export)
metrics:
  duration: 2
  tasks_completed: 2
  tests_added: 11
  tests_passing: 15 (11 merge + 4 existing)
  files_created: 2
  lines_added: 1055
  completed_date: 2026-02-11
---

# Phase 11 Plan 01: Core Merge Engine Summary

**One-liner:** TDD implementation of IFP merge algorithm — state whitelist, top-down graft walk, REV0 mode, deep WIP detection, multi-branch independence, and source tagging.

## What Was Built

The core algorithm that enables the IFP BOM Merge feature. Given a current BOM tree X(n) and a prior artifact B(n-1), the engine:

1. **Detects WIP assemblies** using a whitelist: only "Issued for Purchasing" and "Issued for Use" are Released, everything else is WIP
2. **Walks top-down** from the root, recursing through Released assemblies
3. **Stops at WIP assemblies** and grafts the entire subtree from B(n-1) if available
4. **Creates empty placeholders** for WIP assemblies not found in B(n-1), with warnings
5. **Handles REV0 mode** (no prior artifact) by creating placeholders for all WIP assemblies
6. **Evaluates branches independently** — WIP on one branch does not affect other branches
7. **Detects deep WIP** at any level (L1, L2, L3, etc.) — not just immediate children
8. **Tags every node** with source (`_source: 'current'` or `_source: 'grafted'`) for downstream UI consumption
9. **Matches by part number** — grafts work regardless of tree position in B(n-1)

The module is pure logic with no DOM or XLSX dependencies, making it testable in Node.js and reusable across contexts.

## Implementation Approach

**TDD workflow:**
- **RED:** Wrote 11 comprehensive tests covering all MERGE requirements and locked decisions (test/merge-tests.js)
- **GREEN:** Implemented merge.js with three core exports (isReleased, buildPNIndex, mergeBOM)
- **Verification:** All 11 merge tests pass + all 4 existing tests pass (no regressions)

**Key algorithms:**
- `isReleased(state)`: Simple whitelist check (IFP or IFU)
- `buildPNIndex(rootNode)`: Walks B(n-1) tree once, builds Map<PN, node> for O(1) graft lookups
- `mergeBOM(sourceRoot, priorRoot)`: Recursive walk-and-merge with graft logic at WIP assembly nodes

**Test coverage:**
1. State whitelist detection (MERGE-01)
2. Basic graft at L1 (MERGE-02)
3. REV0 mode with no prior artifact (MERGE-03)
4. Empty placeholder for never-released WIP (MERGE-04)
5. Multi-branch independence (MERGE-05)
6. Deep WIP at L2 (MERGE-06)
7. Deep WIP at L3 (MERGE-06)
8. Source tags on every node
9. Same WIP PN at multiple locations
10. All assemblies released (passthrough baseline)
11. PN-based matching regardless of tree position

## Key Design Decisions

1. **Whitelist vs blacklist:** State detection uses a whitelist (IFP, IFU only) rather than blacklisting known WIP states. This is future-proof — any new state added to PDM is treated as WIP by default until explicitly approved.

2. **WIP assembly node tagged as 'grafted':** At the graft point, the WIP assembly node itself is tagged `_source: 'grafted'` (not `'current'`), even though its qty comes from X(n). This decision was locked during context gathering — the node's metadata comes from B(n-1), so it's tagged grafted.

3. **Empty placeholders for never-released WIP:** When a WIP assembly has no prior release (not in B(n-1)), the engine creates an empty assembly node with zero children rather than omitting it. This preserves the tree structure and makes the gap visible to Engineering.

4. **PN-based matching:** Assemblies are matched between X(n) and B(n-1) by part number only, regardless of tree position. This enables the index optimization and handles cases where the same assembly moves locations between revisions.

5. **Ephemeral source tags:** Source tags (`_source`) are internal to the merge session. They guide the UI for visualization but are stripped when exporting B(n) as a JSON artifact. This keeps the artifact clean and prevents accumulation of merge history.

## Deviations from Plan

None — plan executed exactly as written.

## What's Next

- **Phase 12 (Artifact Format):** Define JSON structure for B(n), implement export/import with SHA-256 hash
- **Phase 13 (Validation System):** Block merge if GA root is not Released (REV0 exception)
- **Phase 14 (IFP UI):** 4th tab with X(n)/B(n-1) load, merge execution, visual diff with source tags

## Self-Check

Verifying created files exist:

```bash
[ -f "C:/Users/amcallister/Projects/bom-tool/js/core/merge.js" ] && echo "FOUND: js/core/merge.js" || echo "MISSING: js/core/merge.js"
[ -f "C:/Users/amcallister/Projects/bom-tool/test/merge-tests.js" ] && echo "FOUND: test/merge-tests.js" || echo "MISSING: test/merge-tests.js"
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "b5188ec" && echo "FOUND: b5188ec (test commit)" || echo "MISSING: b5188ec"
git log --oneline --all | grep -q "01d3eda" && echo "FOUND: 01d3eda (feat commit)" || echo "MISSING: 01d3eda"
```

**Results:**
```
FOUND: js/core/merge.js
FOUND: test/merge-tests.js
FOUND: b5188ec (test commit)
FOUND: 01d3eda (feat commit)
```

## Self-Check: PASSED
