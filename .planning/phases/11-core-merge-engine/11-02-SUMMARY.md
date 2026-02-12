---
phase: 11-core-merge-engine
plan: 02
subsystem: core-algorithms
tags: [tdd, merge-engine, graft-boundary, change-annotations, missing-warnings, merge-summary]
dependency_graph:
  requires:
    - js/core/merge.js (plan 11-01 foundation)
    - js/core/tree.js (BOMNode class)
  provides:
    - Complete merge engine with MERGE-01 through MERGE-07
    - Change annotations for UI safety net
    - Missing assembly warnings
    - Merge summary statistics
  affects:
    - Phase 12 (Artifact Format) — will use summary for metadata
    - Phase 13 (Validation System) — will use warnings
    - Phase 14 (IFP UI) — will consume change annotations and summary
tech_stack:
  added:
    - Change detection algorithm (field-by-field comparison)
    - Missing assembly detection (set difference)
    - Merge summary tracking (counters)
  patterns:
    - TDD: RED-GREEN cycle with 8 new tests
    - Graft boundary data rules (qty from X(n), rest from B(n-1))
    - Informational annotations (non-blocking)
key_files:
  created: []
  modified:
    - js/core/merge.js (added 104 lines)
    - test/merge-tests.js (added 554 lines)
decisions:
  - Qty at graft point comes from X(n) (parent's approved declaration)
  - Metadata and children at graft point come from B(n-1) (last approved BOM)
  - Change annotations computed before qty override
  - State field excluded from change comparison (inherently different)
  - Missing assemblies generate warnings but are NOT carried forward
  - Merge summary includes passedThrough, grafted, placeholders counts
metrics:
  duration: 3
  tasks_completed: 2
  tests_added: 8
  tests_passing: 19 (all merge tests) + 4 (existing baseline tests)
  files_modified: 2
  lines_added: 658
  completed_date: 2026-02-12
---

# Phase 11 Plan 02: Graft Boundary Rules and Annotations Summary

**One-liner:** Extended merge engine with MERGE-07 graft boundary data rules (qty from X(n), metadata/children from B(n-1)), change annotations at graft points, missing assembly warnings, and merge summary statistics.

## What Was Built

This plan completed the IFP merge engine by implementing the most architecturally nuanced parts:

1. **MERGE-07: Graft boundary data rules** — The critical quantity sourcing rule: at graft points, the qty comes from X(n) (the parent's approved declaration), while the assembly's metadata and all its children come from B(n-1) (the last approved BOM for that assembly). This ensures Operations procures the correct quantities based on approved parent assemblies, while using approved child content.

2. **Change annotations at graft points** — Field-by-field comparison between X(n) and B(n-1) at graft boundaries, storing differences in a `_changes` array on grafted nodes. Provides a safety net for Engineering to spot unexpected shifts (qty changes, description updates, revision differences).

3. **Missing assembly warnings** — Detects assemblies present in B(n-1) but absent from X(n) (deleted or suppressed). Generates informational warnings but does NOT carry these assemblies forward (warning-only, no auto-reinstatement).

4. **Merge summary statistics** — Tracks and returns counts of passedThrough (Released assemblies from X(n)), grafted (WIP assemblies from B(n-1)), and placeholders (WIP with no prior release). Enables downstream UI to show merge composition.

## Implementation Approach

**TDD workflow:**
- **RED:** Wrote 8 new tests (12-19) covering MERGE-07, change annotations, missing assemblies, and summary
  - Tests 12, 14, 16, 17, 18 initially failed as expected
  - Tests 13, 15, 19 passed immediately (behavior already correct)
- **GREEN:** Implemented features in merge.js to make all tests pass
  - Added computeChanges() function for field comparison
  - Added collectAllAssemblyPNs() for missing assembly detection
  - Updated mergeBOM() to handle qty sourcing, change tracking, and summary
- **Verification:** All 19 merge tests pass + all 4 existing tests pass (no regressions)

**Key implementation details:**

1. **Graft boundary qty override:**
   ```javascript
   // After cloning subtree from B(n-1):
   grafted.qty = sourceNode.qty;  // Qty from X(n)
   // All other fields (description, revision, children) stay from B(n-1)
   ```

2. **Change annotation sequencing:**
   - Compute changes BEFORE updating qty (compare original X(n) vs B(n-1))
   - Only store `_changes` if differences exist
   - Exclude state field from comparison (inherently different)

3. **Missing assembly detection:**
   - Collect all assembly PNs from both trees
   - Set difference: assemblies in B(n-1) but not in X(n)
   - Generate warnings (informational only)

4. **Summary tracking:**
   - Increment counters during merge walk
   - Return as summary object: {passedThrough, grafted, placeholders}

## Key Design Decisions

1. **Qty sourcing rule (MERGE-07):** This is the most critical architectural decision in the merge. The qty at a graft point comes from X(n) because the parent assembly is Released (approved), so its child quantity declarations are trustworthy. Everything else about the child assembly (metadata, children, quantities of grandchildren) comes from B(n-1) because that's the last approved version of that assembly's internal BOM.

2. **Change annotations are informational:** Changes do not block the merge. They provide a safety net for Engineering to review what shifted between the WIP version (X(n)) and the last approved version (B(n-1)), but the merge proceeds regardless.

3. **State field excluded from change comparison:** The state is inherently different (WIP in X(n) vs Released in B(n-1)) — that's the reason we're grafting. Including it in change annotations would create noise. Only compare meaningful fields: qty, description, revision, material, length, uofm, purchaseDescription.

4. **Missing assemblies NOT carried forward:** Assemblies in B(n-1) but absent from X(n) are assumed to be intentionally deleted or suppressed. We generate warnings for visibility, but we don't auto-reinstate them into the merged result.

5. **Merge summary for downstream UI:** The summary provides counts that enable the UI to show users what happened during the merge (e.g., "15 assemblies passed through, 3 grafted from prior BOM, 1 placeholder created").

## Deviations from Plan

None — plan executed exactly as written.

## What's Next

- **Phase 12 (Artifact Format):** Define JSON structure for B(n), include merge summary in metadata
- **Phase 13 (Validation System):** Use warnings array for user feedback
- **Phase 14 (IFP UI):** Display change annotations in visual diff, show summary statistics

## Self-Check

Verifying modified files exist:

```bash
[ -f "C:/Users/amcallister/Projects/bom-tool/js/core/merge.js" ] && echo "FOUND: js/core/merge.js" || echo "MISSING: js/core/merge.js"
[ -f "C:/Users/amcallister/Projects/bom-tool/test/merge-tests.js" ] && echo "FOUND: test/merge-tests.js" || echo "MISSING: test/merge-tests.js"
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "b648204" && echo "FOUND: b648204 (test commit)" || echo "MISSING: b648204"
git log --oneline --all | grep -q "9abb729" && echo "FOUND: 9abb729 (feat commit)" || echo "MISSING: 9abb729"
```

**Results:**
```
FOUND: js/core/merge.js
FOUND: test/merge-tests.js
FOUND: b648204 (test commit)
FOUND: 9abb729 (feat commit)
```

## Self-Check: PASSED
