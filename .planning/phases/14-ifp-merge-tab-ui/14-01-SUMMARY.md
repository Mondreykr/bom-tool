---
phase: 14-ifp-merge-tab-ui
plan: 01
subsystem: UI
tags: [ui, ifp-merge, validation, state-pills, tree-rendering]
completed: 2026-02-13
duration: 4min

dependencies:
  requires:
    - phase-11-core-merge-engine
    - phase-12-json-artifact-format
    - phase-13-validation-system
  provides:
    - ifp-merge-tab-ui
    - state-aware-tree-display
    - validation-error-display
  affects:
    - index.html
    - css/styles.css
    - js/ui/state.js
    - js/main.js
    - js/ui/ifp-merge.js

tech-stack:
  added: []
  patterns:
    - progressive-reveal-ui
    - state-pills-visual-pattern
    - validation-banner-blocking-pattern
    - first-level-expanded-default

key-files:
  created:
    - js/ui/ifp-merge.js: "Complete IFP Merge tab module with uploads, tree rendering, validation display, view controls"
  modified:
    - index.html: "4th tab button and complete tab content structure"
    - css/styles.css: "State pills, grafted row highlighting, validation banner, REV0 toggle, control bar styles"
    - js/ui/state.js: "IFP merge state properties"
    - js/main.js: "Import and init ifp-merge module"

decisions:
  - choice: "State pills on ALL nodes (assemblies AND parts)"
    rationale: "Eliminates blank cell ambiguity, enables pure visual pattern recognition (scan for red), helps users locate WIP components flagged by validation errors"
  - choice: "Tree defaults to first level expanded"
    rationale: "User immediately sees top-level state landscape (GA + direct children) without manual expansion"
  - choice: "Validation errors block merge but tree stays visible"
    rationale: "User can understand the problems in context by seeing the tree structure while reading validation messages"
  - choice: "REV0 toggle disables (not hides) prior upload zone"
    rationale: "No layout shift, makes disabled state visually obvious with greyed-out appearance"

metrics:
  tasks: 2
  commits: 2
  files_created: 1
  files_modified: 4
  lines_added: 977
  test_status: "4/4 baseline tests pass"
---

# Phase 14 Plan 01: IFP Merge Tab Shell Summary

**One-liner:** Complete pre-merge UI with state-aware tree, validation blocking, and view controls

## What Was Built

Built the complete IFP Merge tab UI (4th tab) with:

- **Upload zones**: Side-by-side X(n) XML and B(n-1) JSON uploads with drag-and-drop support
- **REV0 mode**: Toggle that disables prior artifact upload and auto-suggests revision 0
- **State-aware tree**: Hierarchical display with green Released/red WIP pills on every node
- **Validation display**: Red banner showing all validation errors with full context, blocking merge when errors exist
- **View controls**: Expand All/Collapse All buttons and Hide WIP Content toggle
- **Merge readiness logic**: Button enables only when source loaded, validation passes, and prior artifact loaded or REV0 mode active
- **Auto-suggestions**: Revision and job number auto-populated based on prior artifact or REV0 mode
- **Tree expansion**: Defaults to first level expanded (GA root + direct children visible)

## Technical Implementation

### Tab Structure (index.html)

Added 4th tab button and complete tab content:
- REV0 toggle above upload zones
- Two-column upload grid (X(n) left, B(n-1) right)
- Validation error banner above tree
- Merge button and Start Over button
- Results section with assembly info, stat cards, control bar, tree table, and export controls

### Styles (css/styles.css)

Added IFP-specific styles:
- **State pills**: Green for Released, red for WIP, rounded with uppercase text
- **Grafted row highlighting**: Soft yellow background for B(n-1) substituted content
- **Validation banner**: Red border with title and error items, shows on validation failure
- **REV0 toggle**: Styled checkbox with label in bordered container
- **Control bar**: Flex layout with buttons and separator
- **WIP hidden**: Display none for toggled-off WIP content

### Module (ifp-merge.js)

Created complete UI module following hierarchy.js pattern:

**Section 1: DOM Element References**
- All upload zones, file inputs, controls, results elements

**Section 2: REV0 Toggle**
- Toggles `ifpIsRev0` state
- Adds/removes `ifp-prior-disabled` class on prior container
- Clears loaded B(n-1) when enabled
- Auto-suggests revision 0 and "1J{PN}" job number

**Section 3: X(n) Source Export Upload**
- Accepts XML files only
- Parses with `parseXML()`
- Builds tree with `buildTree()` and `sortChildren()`
- Runs immediate validation with `validateBOM()`
- Displays tree and validation errors
- Updates merge readiness

**Section 4: B(n-1) Prior Artifact Upload**
- Accepts JSON files only
- Imports with `importArtifact()`
- Validates with `validateArtifact()` (hash check)
- Rejects on hash mismatch (hard block)
- Shows warnings for GA mismatch or revision gaps (non-blocking)
- Auto-suggests next revision and job number

**Section 5: State-Aware Tree Rendering**
- Renders tree into `#ifpTreeBody`
- Simplified columns: Part Number, Qty, Description, Revision, State, Source
- State pill on every node (assemblies and parts)
- Tree lines (vertical/horizontal) for hierarchy visualization
- First level expanded by default (depth 0 and 1 visible)
- Toggle +/- for expand/collapse per node
- Tags WIP assemblies with `data-wip-assembly="true"`

**Section 6: Validation Error Display**
- Shows/hides validation banner based on `validationResult.valid`
- Displays all errors with full context messages
- Banner title: "Validation Errors — Merge Blocked"

**Section 7: Update Merge Readiness**
- Enables merge button when:
  1. Source tree exists
  2. Validation passed
  3. Prior artifact loaded OR REV0 mode

**Section 8: Expand/Collapse All**
- Expand All: removes `.collapsed` from all child rows, updates toggles
- Collapse All: adds `.collapsed` to all child rows, updates toggles

**Section 9: Hide WIP Content Toggle**
- Active: hides all descendants of WIP assemblies by adding `wip-hidden` class
- Inactive: removes `wip-hidden` from all rows
- WIP assembly row itself stays visible

**Section 10: Reset/Start Over**
- Clears all IFP state
- Resets UI to initial state
- Scrolls to top

**Merge button**: Placeholder message "Merge execution coming in next update (Plan 14-02)"

### State Management (state.js)

Added IFP merge state block:
- `ifpSourceData`, `ifpSourceTree`, `ifpSourceFilename`
- `ifpPriorArtifact`, `ifpPriorFilename`
- `ifpMergedTree`, `ifpMergeSummary`, `ifpMergeWarnings`
- `ifpValidationResult`
- `ifpIsRev0`

## Deviations from Plan

None — plan executed exactly as written.

## Commits

1. **a1f8cb2** - `feat(14-01): add IFP Merge tab HTML structure, CSS, state, and wiring`
   - Added 4th tab button and complete tab content
   - Added CSS styles for state pills, validation banner, REV0 toggle, control bar
   - Added IFP merge state properties to state.js
   - Wired up ifp-merge module in main.js

2. **116f4cc** - `feat(14-01): implement IFP Merge tab upload handlers, tree rendering, and view controls`
   - Created complete ifp-merge.js module (646 lines)
   - Implemented X(n) and B(n-1) upload with validation
   - State-aware tree rendering with pills on all nodes
   - Validation error display as blocking banner
   - View controls (expand/collapse, hide WIP)
   - Merge readiness logic

## Verification Results

✓ All 4 baseline tests pass (no regressions)
✓ 4 tab buttons visible in HTML (grep verification)
✓ `ifpSourceData` property exists in state.js
✓ `initIfpMerge` imported and called in main.js
✓ `export function init` exists in ifp-merge.js
✓ Module imports from merge.js, validate.js, artifact.js, parser.js

## What's Next (Plan 14-02)

Plan 02 will implement:
- Merge button execution (call `mergeBOM()`)
- Merged tree rendering with grafted highlighting
- Merge summary stat cards population
- Hide B(n-1) Substitutions toggle functionality
- Export B(n) button with artifact generation
- Merge warnings display

## Notes

- **Design pattern consistency**: Followed hierarchy.js module structure exactly for maintainability
- **Progressive reveal**: Upload card visible first, tree appears after X(n) upload, merge button enables when ready
- **Visual state scanning**: Pills on every node enable quick visual pattern recognition (scan for red = find WIP items)
- **Validation UX**: Banner blocks merge but tree stays visible so user understands problems in context
- **Default expansion**: First level expanded provides immediate state landscape without manual interaction
- **REV0 UX**: Disabled (not hidden) prior upload zone avoids layout shift and makes state clear

## Self-Check: PASSED

**Created files exist:**
- ✓ js/ui/ifp-merge.js exists

**Modified files exist:**
- ✓ index.html modified
- ✓ css/styles.css modified
- ✓ js/ui/state.js modified
- ✓ js/main.js modified

**Commits exist:**
- ✓ a1f8cb2 found in git log
- ✓ 116f4cc found in git log

**Baseline tests:**
- ✓ 4/4 tests pass
