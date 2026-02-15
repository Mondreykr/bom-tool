---
phase: quick
plan: 2
subsystem: validation
tags: [validation, error-messages, ux, formatting]
dependency-graph:
  requires: []
  provides: [standardized-error-format]
  affects: [js/core/validate.js]
tech-stack:
  added: []
  patterns: [breadcrumb-paths, consistent-formatting]
key-files:
  created: []
  modified:
    - js/core/validate.js
decisions:
  - Used "At {fullPath}:" format for all error messages (breadcrumb including problem node)
  - Added fullPath variable in validateMetadata to handle root vs nested cases
  - Updated path fields in error objects to include problem node for consistency
metrics:
  duration: 3 min
  tasks-completed: 2
  files-modified: 1
  commits: 1
  completed: 2026-02-15T23:30:00Z
---

# Quick Task 2: Standardize Validation Error Format

**One-liner:** Changed all 19 validation error messages from misleading "partNumber at ancestorPath:" format to clear "At {full breadcrumb}: description" format, making errors easier to interpret in context of the BOM tree.

## Objective

Standardize all validation error messages in validate.js to use a consistent breadcrumb format. The old format — `{partNumber} at {ancestorPath}: {description}` — was misleading because "at {path}" reads as pointing to the problem node, when the path was actually the ancestors. The new format — `At {fullPath}: {description}` — shows the complete trail including the problem node itself.

## Tasks Completed

### Task 1: Update validateMetadata() — 14 error messages

**Files modified:** `js/core/validate.js`

**Changes:**
- Added `fullPath` variable: `const fullPath = (path === node.partNumber) ? node.partNumber : \`${path} > ${node.partNumber}\`;`
- Changed all 14 error messages from `${node.partNumber} at ${path}:` to `At ${fullPath}:`
- Updated all `path:` fields from `path` to `fullPath`
- Handles root case (no duplicate) and nested case (full breadcrumb trail)

**Rules affected:** 3, 4, 6, 7, 8, 9 (9 has 9 cross-field consistency sub-checks)

### Task 2: Update validateBOM() — 5 error messages

**Files modified:** `js/core/validate.js`

**Changes:**
- Rule 0 (WIP GA): `GA root 258758 is WIP...` -> `At 258758: GA root is WIP...`
- Missing NS Item Type (walk): `Missing NS Item Type on X at Y` -> `At Y > X: Missing NS Item Type...`
- Missing NS Item Type (child): Same pattern, includes child in path
- Rule 1 (WIP non-assembly): Added `At ` prefix, moved child part number into path field
- Rule 2 (No released content): Added `At ` prefix
- Updated all `path:` fields to include the problem node itself

**Commit:** `9ce60d5`

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

**1. Breadcrumb Format with "At" Prefix**

All errors now use `At {path}: {description}` where path is a `>` delimited breadcrumb trail ending at the problem node itself.

**Rationale:** Users read "at X" as "the problem is at X." The old format put the problem node before "at" and the ancestors after, which inverted the expected reading. The new format reads naturally: "At root > parent > child: problem description."

**2. fullPath Variable for Root Handling**

Added `fullPath` that equals just the part number at root level, or `ancestorPath > partNumber` when nested. This prevents duplicate part numbers (e.g., `At 258758 > 258758: ...` when the root validates itself).

**Rationale:** The root node has no ancestors, so its path IS its part number. Without this check, the root's path would show its own number twice.

**3. Path Field Includes Problem Node**

Updated the `path` field in error objects (not just the message) to include the problem node. This makes the structured data consistent with the human-readable message.

**Rationale:** Code that consumes error objects (UI rendering, filtering) should be able to use the path field directly without parsing the message string.

## Verification

All success criteria met:

- All 19 validation error messages use "At {fullPath}: {description}" format
- Path fields in error objects include the problem node
- Root case handled correctly (no duplicate part number)
- BOM validation tests: 4/4 passed

**Test results:**
- BOM Tool validation tests: 4/4 passed
- Error messages no longer use misleading "partNumber at ancestorPath:" format

## Output Files

**Modified:**
- `C:\Users\amcallister\Projects\bom-tool\js\core\validate.js` — All 19 error messages standardized

**Commits:**
- `9ce60d5`: fix(quick-2): standardize validation error format to breadcrumb paths

## Impact Assessment

**Immediate:**
- Validation errors now read naturally as breadcrumb trails
- Users can trace the exact location of a problem in the BOM tree hierarchy
- Path fields in error objects are consistent with displayed messages

**Future:**
- Any new validation rules should follow the `At ${fullPath}: {description}` pattern
- The suspended Rule 5 comment still uses old format (acceptable since it's commented out)

**Dependencies:**
- No other code depends on specific error message text
- UI code that displays errors will show the new format automatically
- No breaking changes to error object structure (same fields: message, path, rule)

## Self-Check: PASSED

Verified modified files exist:
```
FOUND: js/core/validate.js
```

Verified commits exist:
```
FOUND: 9ce60d5 (Task 1 + Task 2)
```

All verification checks passed. Plan execution complete.
