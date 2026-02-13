# Phase 14: IFP Merge Tab UI - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

New 4th tab "IFP Merge" where Engineering uploads PDM source export X(n), optionally uploads prior IFP artifact B(n-1), reviews a state-aware hierarchy, runs the merge, and exports B(n) as a JSON artifact. Operations does not use this tab. Cross-tab integration (loading B(n) into other tabs) is Phase 15.

</domain>

<decisions>
## Implementation Decisions

### Page flow & layout
- Progressive reveal: start with uploads only, tree appears after X(n) upload, merge button appears when ready, results expand below
- Cards pattern matching other tabs (Flat BOM, Hierarchy) — not distinct labeled sections
- Same tree transforms in place after merge (nodes get highlighted, grafted subtrees appear) — no separate before/after views
- Merge summary stat cards appear above the tree (like Flat BOM stats grid pattern)

### Tree node display
- Simplified columns: Part Number, Qty, Description, Revision + State pill + Source indicator
- Dropped from existing Hierarchy tab columns: Component Type, Length, UofM, Purchase Description, NS Item Type (these are procurement concerns; this tab is for merge review)
- State pills on ALL nodes (assemblies and components), not just assemblies — eliminates blank cell ambiguity, enables pure visual pattern recognition (scan for red), and helps users locate WIP components flagged by validation errors
- State pill in a dedicated column (not inline badges)
- Default to first level expanded (GA root + direct children visible) — user immediately sees top-level state landscape

### Merge result presentation
- View toggles (Hide WIP content, Hide B(n-1) substitutions) in a control bar above the tree, alongside Expand All/Collapse All
- Merge summary as colored stat cards in a grid (matching Flat BOM pattern): assemblies passed through, grafted, placeholders created
- Validation errors displayed as a red banner above the tree — blocks merge button but tree remains visible below so user can understand the problems
- Export B(n) uses Save As behavior (user chooses save location), not auto-download to default Downloads folder

### Upload & mode switching
- Two upload zones side by side (like BOM Comparison tab): X(n) source export (XML) on left, B(n-1) prior artifact (JSON) on right
- REV0 toggle disables and greys out the B(n-1) zone (stays visible but unclickable) — no layout shift
- IFP revision number input near the Export B(n) button (grouped with output controls, not input controls)

### Claude's Discretion
- Source indicator approach: row background color (soft yellow for grafted) vs dedicated column vs combination — pick what works best with the simplified column set and the yellow highlighting requirement (UI-08)
- REV0 toggle placement: above upload zones vs between them — pick the most intuitive position
- Export confirmation: direct download vs brief confirmation dialog showing filename/revision/node count — pick appropriate friction level
- Exact stat card colors for merge summary categories
- Expand All / Collapse All button placement and styling

</decisions>

<specifics>
## Specific Ideas

- Stat cards should match the existing Flat BOM tab pattern (colored left border, value + label)
- Side-by-side uploads should match the BOM Comparison tab's two-upload-zone pattern
- Validation error messages already include full ancestor path, part number, rule violated, and fix action (see docs/validation-logic.md) — display these as-is in the error banner
- Validation collects ALL errors before blocking (user sees every issue at once, not one at a time)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-ifp-merge-tab-ui*
*Context gathered: 2026-02-13*
