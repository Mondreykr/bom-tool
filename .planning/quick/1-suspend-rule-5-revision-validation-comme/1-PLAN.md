---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - js/core/validate.js
  - test/validation-tests.js
  - docs/validation-logic.md
autonomous: true
must_haves:
  truths:
    - "Rule 5 no longer triggers validation errors for non-integer revisions"
    - "All other validation rules still function correctly"
    - "Rule 5 code is preserved in comments for future restoration"
  artifacts:
    - path: "js/core/validate.js"
      provides: "Rule 5 commented out with suspension note"
      contains: "SUSPENDED"
    - path: "test/validation-tests.js"
      provides: "Rule 5 test commented out"
      contains: "SUSPENDED"
    - path: "docs/validation-logic.md"
      provides: "Rule 5 marked as SUSPENDED"
      contains: "SUSPENDED"
---

<objective>
Suspend Rule 5 (Revision Must Be Integer) across code, tests, and docs.

Purpose: Many BOM items lack revisions due to SOLIDWORKS weldments and hardware items. Rule 5 produces excessive false-positive errors that block practical use. Commenting out (not deleting) preserves the code for future restoration.

Output: Rule 5 disabled in validation, tests skip it, docs reflect suspended status.
</objective>

<execution_context>
@C:/Users/amcallister/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/amcallister/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@js/core/validate.js
@test/validation-tests.js
@docs/validation-logic.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Comment out Rule 5 in validate.js and update JSDoc</name>
  <files>js/core/validate.js</files>
  <action>
1. In js/core/validate.js, comment out lines 55-62 (the Rule 5 block). Wrap with a suspension note:

```js
    // --- RULE 5 SUSPENDED ---
    // Reason: Many BOM items (weldment cut-list items, hardware) have blank or
    // non-integer revisions in SOLIDWORKS PDM. This caused excessive false-positive
    // errors. Commenting out rather than deleting so it can be restored later.
    //
    // // Rule 5: Revision Must Be Integer
    // if (!/^\d+$/.test(String(node.revision).trim())) {
    //     errors.push({
    //         message: `${node.partNumber} at ${path}: Revision '${node.revision}' is not a valid integer`,
    //         path: path,
    //         rule: 'invalid-revision'
    //     });
    // }
    // --- END RULE 5 SUSPENDED ---
```

2. Update the JSDoc comment for validateMetadata (line 25) to note the suspension. Change:
   "Validates metadata for a single node (Rules 3-9)."
   to:
   "Validates metadata for a single node (Rules 3-4, 6-9; Rule 5 suspended)."
  </action>
  <verify>
- `grep "SUSPENDED" js/core/validate.js` shows the suspension markers
- `grep "Rule 5 suspended" js/core/validate.js` shows the JSDoc update
- No syntax errors: `node -e "import('./js/core/validate.js')"` (or check via test run in Task 2)
  </verify>
  <done>Rule 5 code block is commented out with clear suspension note; JSDoc reflects suspension</done>
</task>

<task type="auto">
  <name>Task 2: Comment out Rule 5 test and update docs</name>
  <files>test/validation-tests.js, docs/validation-logic.md</files>
  <action>
1. In test/validation-tests.js, comment out the test function test20_Rule5_NonIntegerRevisionBlocked (lines 784-822) with a suspension note:

```js
// --- RULE 5 TEST SUSPENDED ---
// Reason: Rule 5 (Revision Must Be Integer) is suspended in validate.js.
// Restore this test when Rule 5 is re-enabled.
//
// function test20_Rule5_NonIntegerRevisionBlocked() { ... }
//
// --- END RULE 5 TEST SUSPENDED ---
```

2. Comment out the runner line (line 1182) that calls the test:

```js
// SUSPENDED: Rule 5 test disabled (see test function above)
// results.push(runTest('Test 20: Rule 5 — Non-integer revision blocked', test20_Rule5_NonIntegerRevisionBlocked));
```

Keep the "// Rule 5 (Revision Must Be Integer)" section comment on line 1181 intact for navigation.

3. In docs/validation-logic.md, replace the Rule 5 section (lines 168-177) with a suspended version:

```markdown
### Rule 5: Revision Must Be Integer — SUSPENDED

> **Status:** SUSPENDED — This rule is commented out in code and not enforced.
>
> **Reason:** Many BOM items (weldment cut-list items, hardware) have blank or non-integer revisions in SOLIDWORKS PDM exports, causing excessive false-positive validation errors. The rule code is preserved in validate.js and can be restored when PDM data quality improves.

**Rule (when active):** Revision must be a whole number (e.g., "1", "2", "15"). Non-numeric or decimal values are not allowed.

**Error message format (when active):**
```
{PartNumber} at {AncestorPath}: Revision '{Value}' is not a valid integer
```
```

4. Run tests to confirm everything still passes:
   `cd test && node run-tests.js`
   Also run validation-specific tests if they have a separate runner.
  </action>
  <verify>
- `cd test && node run-tests.js` — all tests pass (Rule 5 test no longer runs)
- `grep "SUSPENDED" test/validation-tests.js` shows suspension markers
- `grep "SUSPENDED" docs/validation-logic.md` shows the status marker
- No references to test20_Rule5 in active (non-commented) code
  </verify>
  <done>Rule 5 test is commented out, docs mark Rule 5 as SUSPENDED, all remaining tests pass</done>
</task>

</tasks>

<verification>
1. `cd test && node run-tests.js` — all tests pass
2. `grep -c "SUSPENDED" js/core/validate.js` returns at least 2 (start/end markers)
3. `grep -c "SUSPENDED" test/validation-tests.js` returns at least 2
4. `grep "SUSPENDED" docs/validation-logic.md` shows status
5. Rule 5 code is NOT deleted — only commented out (restorable)
</verification>

<success_criteria>
- Rule 5 validation no longer fires (no 'invalid-revision' errors produced)
- All other validation rules (3, 4, 6-9) still work correctly
- All existing tests pass
- Code, test, and docs all consistently mark Rule 5 as SUSPENDED
- No code deleted — everything commented out for future restoration
</success_criteria>

<output>
After completion, create `.planning/quick/1-suspend-rule-5-revision-validation-comme/1-SUMMARY.md`
</output>
