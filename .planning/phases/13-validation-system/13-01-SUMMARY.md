---
phase: 13-validation-system
plan: 01
subsystem: core-algorithms
tags: [tdd, validation, assembly-identification, pre-merge-validation]
dependency_graph:
  requires:
    - js/core/merge.js (isReleased function)
    - js/core/tree.js (BOMNode class)
  provides:
    - js/core/validate.js (isAssembly, validateBOM)
  affects:
    - js/core/merge.js (now uses isAssembly from validate.js)
    - Phase 14 (IFP UI) — will call validateBOM before merge
tech_stack:
  added:
    - Pure algorithm module for pre-merge validation
    - nsItemType-based assembly detection
  patterns:
    - TDD: RED-GREEN cycle with 15 comprehensive validation tests
    - Full tree walk for error collection
    - Descriptive error messages with path and suggested fix
key_files:
  created:
    - js/core/validate.js (128 lines)
    - test/validation-tests.js (724 lines)
  modified:
    - js/core/merge.js (import added, 5 componentType checks replaced with isAssembly)
    - test/merge-tests.js (fixed nsItemType values)
decisions:
  - Use NS Item Type field as authoritative assembly identifier (not Component Type)
  - Walk entire tree to collect ALL errors before blocking
  - Validation applies to all revisions (REV0 through REVn) — same rules, different consequences
  - Missing NS Item Type blocks merge with descriptive error
  - Descriptive error messages include full path and suggested fix
metrics:
  duration: 5
  tasks_completed: 2
  tests_added: 15
  tests_passing: 38 (15 validation + 19 merge + 4 baseline)
  files_created: 2
  files_modified: 2
  lines_added: 880
  completed_date: 2026-02-12
---

# Phase 13 Plan 01: Validation System and Assembly Identification Summary

**One-liner:** TDD implementation of pre-merge validation with nsItemType-based assembly detection — blocks invalid BOMs with descriptive errors showing full path and fix suggestions.

## What Was Built

The validation system that prevents invalid IFP merges before they happen. Key components:

1. **isAssembly(node)** — Single authoritative assembly check using `nsItemType` field
   - Returns true only if `node.nsItemType === 'Assembly'`
   - Replaces unreliable `componentType` checks throughout the codebase
   - Handles undefined/null/empty string gracefully (returns false)

2. **validateBOM(rootNode)** — Pre-merge validation with four rules:
   - **Rule 0 (WIP GA):** GA root must be Released (IFP or IFU) — WIP GA blocks merge
   - **Rule 1 (WIP non-assembly):** No WIP non-assembly items under Released assemblies
   - **Rule 2 (No released content):** Released assemblies with only sub-assembly children must have at least one Released child
   - **Missing NS Item Type:** Any node missing nsItemType blocks merge

3. **Full error collection** — Walks entire tree once, finds ALL issues, returns them together so users can fix everything in one PDM session

4. **Descriptive error messages** — Each error includes:
   - Full ancestor path (e.g., "GA > Assy A > Part X")
   - Clear issue description
   - Suggested fix ("Release Part X in PDM before creating IFP artifact")
   - Rule identifier for debugging

## Implementation Approach

**TDD workflow:**
- **RED:** Wrote 15 failing tests covering isAssembly (4 tests), Rule 0 (2 tests), Rule 1 (3 tests), Rule 2 (3 tests), missing NS Item Type (1 test), completeness (2 tests)
- **GREEN:** Implemented validate.js with isAssembly and validateBOM, refactored merge.js to use isAssembly
- **Verification:** All 38 tests pass (15 new validation + 19 existing merge + 4 baseline) — zero regressions

**Test coverage:**
1. isAssembly returns true for 'Assembly'
2. isAssembly returns false for 'Inventory'
3. isAssembly returns false for 'Lot Numbered Inventory'
4. isAssembly returns false for undefined/null/empty nsItemType
5. Rule 0: WIP GA root blocked
6. Rule 0: Released GA valid
7. Rule 1: WIP non-assembly under Released blocked
8. Rule 1: Released non-assembly valid
9. Rule 1: Multiple WIP parts all collected
10. Rule 2: Released assembly with only WIP sub-assemblies blocked
11. Rule 2: Mixed WIP and Released sub-assemblies valid
12. Rule 2: WIP sub-assembly with Released part valid
13. Missing NS Item Type blocked
14. Multiple violations all collected (WIP GA + WIP parts + missing type)
15. Deep tree (L3) WIP part error includes full path

## Key Design Decisions

1. **NS Item Type is authoritative:** Per locked user decision from phase context, `nsItemType` field is the single source of truth for assembly identification. Component Type is unreliable — real PDM cases exist where Component Type = 'Manufactured' but NS Item Type = 'Assembly' and the item has children.

2. **Full tree walk for completeness:** Validation walks the entire tree regardless of parent state, collecting ALL errors before returning. This includes:
   - Checking every node for missing NS Item Type
   - Recursing into Released assemblies (even under WIP parents) to validate their children
   - Continuing walk after finding errors (non-blocking error collection)

3. **Same validation for all revisions:** All validation rules apply to REV0 through REVn. The only difference is the merge consequence (empty placeholder vs graft), not the validation logic.

4. **Error structure for UI consumption:** Each error is an object with `{message, path, rule}` to enable downstream UI to display errors in different formats (flat list, grouped by rule, etc.).

## Refactoring: Assembly Identification Fix

Refactored merge.js to use `isAssembly(node)` instead of `node.componentType === 'Assembly'`:
- Line 28: buildPNIndex walk
- Line 144: collectAllAssemblyPNs walk
- Line 198: WIP assembly detection
- Line 243: Released assembly counting
- Line 249: Child recursion decision

Verification:
- `grep -c "componentType === 'Assembly'" js/core/merge.js` returns 0
- `grep -c "isAssembly" js/core/merge.js` returns 6 (1 import + 5 uses)

Updated test helper in merge-tests.js to use correct nsItemType values:
- 'Assembly' for assemblies (was 'Assembly Item')
- 'Inventory' for parts (was 'Inventory Item')

## Deviations from Plan

None — plan executed exactly as written.

**Auto-fixed issues:** None

## What's Next

- **Phase 13 Plan 02:** UI integration — add validation feedback to IFP Merge tab, display errors before merge
- **Phase 14 (IFP UI):** Full 4th tab implementation with file selection, merge execution, visual diff

## Self-Check

Verifying created files exist:

```bash
[ -f "C:/Users/amcallister/Projects/bom-tool/js/core/validate.js" ] && echo "FOUND: js/core/validate.js" || echo "MISSING: js/core/validate.js"
[ -f "C:/Users/amcallister/Projects/bom-tool/test/validation-tests.js" ] && echo "FOUND: test/validation-tests.js" || echo "MISSING: test/validation-tests.js"
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "de992fb" && echo "FOUND: de992fb (test commit)" || echo "MISSING: de992fb"
git log --oneline --all | grep -q "7dc8912" && echo "FOUND: 7dc8912 (feat commit)" || echo "MISSING: 7dc8912"
```

**Results:**
```
FOUND: js/core/validate.js
FOUND: test/validation-tests.js
FOUND: de992fb (test commit)
FOUND: 7dc8912 (feat commit)
```

## Self-Check: PASSED
