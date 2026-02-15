---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - js/core/validate.js
autonomous: true
must_haves:
  truths:
    - "All validation error messages use 'At {fullPath}: {description}' format"
    - "The path field in every error object includes the problem node itself"
    - "Root nodes show just their part number; nested nodes show full breadcrumb trail"
  artifacts:
    - path: "js/core/validate.js"
      provides: "Standardized error format across all 19 error messages"
      contains: "At ${fullPath}:"
---

<objective>
Standardize all validation error messages to use consistent breadcrumb format.

Purpose: Error messages used inconsistent formats — "partNumber at ancestorPath:" was misleading because users read "at path" as pointing to the problem node, when actually the part number at the start IS the problem node and the path is its ancestors. New format: "At {full breadcrumb including node}: {description}"

Output: All 19 error messages in validate.js use consistent "At {fullPath}:" format with path fields including the problem node.
</objective>

<execution_context>
@C:/Users/amcallister/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/amcallister/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@js/core/validate.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update validateMetadata() — 14 error messages</name>
  <files>js/core/validate.js</files>
  <action>
1. Add fullPath variable after existing path variable:
   `const fullPath = (path === node.partNumber) ? node.partNumber : \`${path} > ${node.partNumber}\`;`

2. Change all 14 error messages from:
   `${node.partNumber} at ${path}: ...`
   to:
   `At ${fullPath}: ...`

3. Update all `path:` fields from `path` to `fullPath`
  </action>
  <verify>
- All message strings in validateMetadata start with "At ${fullPath}:"
- All path fields use fullPath
- No remaining "at ${path}:" patterns in validateMetadata
  </verify>
  <done>All 14 validateMetadata error messages use standardized format</done>
</task>

<task type="auto">
  <name>Task 2: Update validateBOM() — 5 error messages</name>
  <files>js/core/validate.js</files>
  <action>
1. Rule 0 (WIP GA): Change to `At ${rootNode.partNumber}: GA root is WIP...`
2. Missing NS Item Type (walk): Change to `At ${currentPath ? currentPath + ' > ' : ''}${node.partNumber}: Missing NS Item Type...`
3. Missing NS Item Type (child): Change to `At ${childPath} > ${child.partNumber}: Missing NS Item Type...`
4. Rule 1 (WIP non-assembly): Add `At ` prefix, include child in path field
5. Rule 2 (No released content): Add `At ` prefix

Also update path fields to include the problem node itself.
  </action>
  <verify>
- All message strings in validateBOM start with "At "
- All path fields include the problem node
- `cd test && node run-tests.js` — all 4 tests pass
  </verify>
  <done>All 5 validateBOM error messages use standardized format with full paths</done>
</task>

</tasks>

<verification>
1. `cd test && node run-tests.js` — all 4 tests pass (tests validate BOM output, not error messages)
2. All error messages start with "At " prefix
3. All path fields include the problem node itself
4. Root nodes show just part number; nested nodes show full breadcrumb trail
</verification>

<success_criteria>
- All 19 validation error messages use "At {fullPath}: {description}" format
- Path fields in error objects include the problem node (consistent with message)
- Root case handled (no duplicate part number in path)
- All 4 BOM validation tests still pass
</success_criteria>

<output>
After completion, create `.planning/quick/2-standardize-validation-error-format/2-SUMMARY.md`
</output>
