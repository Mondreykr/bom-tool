# Phase 1: Test Infrastructure - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Adapt the existing test harness so it validates code from multi-file ES6 modules instead of using copied functions. All 4 existing validation tests must pass against the current single-file codebase before and after the switch. A browser smoke test checklist must exist for manual visual verification.

</domain>

<decisions>
## Implementation Decisions

### How tests stay honest
- Tests currently have copied functions from index.html (~430 lines of duplicated code). Once functions are extracted to module files, tests must import from those real module files — no more copies.
- Claude's discretion on transition approach: whether to switch immediately or run both temporarily as a safety comparison. Prioritize whatever is safest for zero-tolerance refactoring.
- The validation Excel files are the **permanent source of truth**. They never change. Every future version of the code must match them exactly.

### What tests check (field coverage)
- Tests must verify **every field** in the validation Excel outputs, not just Part Number/Qty/Description.
- Flat BOM tests check: Qty, Part Number, Component Type, Description, Length (Decimal), Length (Fractional), UofM, Purchase Description, State, Revision, NS Item Type.
- Comparison tests check: Change Type, Part Number, Component Type, Old/New Description, Old/New Qty, Delta Qty, Old/New Purchase Description.
- **Proof of concept completed**: All field checks were added and verified passing (4/4) during this discussion session. The enhanced test runner is already in place.

### Purchase Description handling
- Purchase Description contains multi-line text (newline characters from Enter key in SOLIDWORKS text fields).
- XML stores newlines as `&#xA;` (char code 10, LF). Excel stores them identically as `\n` (LF). **These match perfectly.**
- One edge case found and resolved: tab characters after bullet points (`•\t`) in XML become spaces (`• `) in Excel. Tab-to-space normalization applied in test comparisons. This is safe because it matches what Excel genuinely does.
- CSV handles Purchase Description differently than XML (flattens newlines, sometimes truncates content). This does not affect tests because tests compare like-with-like (XML-to-Excel or CSV-to-Excel from same format).

### Test failure policy
- Claude's discretion: investigate whether failure is real breakage or a test artifact (like the tab normalization issue), then fix whichever side is wrong. The goal is zero tolerance for behavioral differences.

### Test execution automation
- Claude's discretion: decide whether to set up automatic pre-commit test runs or rely on manual execution, based on risk level of each phase.

### Test count
- 4 tests are sufficient. They cover all core processing paths: XML parsing, CSV parsing, tree building, flattening, full comparison, and scoped comparison.

### Browser smoke checklist
- A short checklist for the user to manually verify visual correctness after each phase.
- User's role: open the page, load a file or two, confirm the UI looks right visually. That's it.
- Automated tests are responsible for all data accuracy, export correctness, and field verification. The user is not double-checking those.
- Checklist should reference files from test-data/ so it's repeatable.
- Claude's discretion on checklist length/depth — match it to the risk of each phase.

### Claude's Discretion
- Transition strategy for switching from copied functions to module imports
- Test failure triage (real breakage vs test artifact)
- Whether to use pre-commit git hooks for automatic test runs
- Browser smoke checklist length and detail level per phase
- Loading skeleton and error state handling in tests

</decisions>

<specifics>
## Specific Ideas

- The enhanced test runner with all field checks is already implemented and passing (done during this discussion as proof of concept)
- Tab-to-space normalization for Purchase Description is already in place and proven
- compareBOMs() now includes oldPurchaseDescription/newPurchaseDescription in results
- User explicitly stated: "everything else is on you" regarding data/export correctness — automated tests must be the sole safety net for processing accuracy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-test-infrastructure*
*Context gathered: 2026-02-07*
