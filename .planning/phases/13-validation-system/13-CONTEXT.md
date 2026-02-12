# Phase 13: Validation System - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Safety checks that prevent invalid IFP merges before they happen. Validates BOM structure and state rules, blocks merges that would produce invalid artifacts, and ensures every assembly node carries a source indicator. Same validation rules apply to all revisions (REV0 through REVn) — the only difference is the consequence of WIP (graft vs empty placeholder).

</domain>

<decisions>
## Implementation Decisions

### Assembly Identification
- Use `NS Item Type` field as the authoritative assembly identifier — NOT `Component Type`
- `NS Item Type = Assembly` → assembly node (has children)
- `NS Item Type = Inventory` or `Lot Numbered Inventory` → non-assembly node (leaf)
- `Component Type` is unreliable: real cases exist where `Component Type = Manufactured` but `NS Item Type = Assembly` and the item has children
- **Action required:** Audit existing Phase 11 merge engine code for any reliance on `Component Type` to identify assemblies; fix to use `NS Item Type` instead

### Validation Rules (applied recursively at every depth)
- **Rule 0 — GA must be Released:** If GA root has WIP state, block merge with error message and suggested fix
- **Rule 1 — No WIP non-assembly items under released assemblies:** Any non-assembly child (NS Item Type ≠ Assembly) of a released assembly that is WIP blocks the merge. This is not enforced by PDM for IFP state.
- **Rule 2 — Released assembly must have released content:** If a released assembly contains ONLY sub-assembly children (no non-assembly items) and ALL sub-assemblies are WIP, block the merge. At least one must be released.
- **Valid states:** A released assembly may contain WIP sub-assemblies provided it also has at least one released child (whether non-assembly or sub-assembly). WIP sub-assemblies become graft points (REV n≥1) or empty placeholders (REV0).
- **Missing NS Item Type:** If any node is missing the NS Item Type field entirely, block merge with error — cannot validate without knowing node type.

### Validation Logic Table

| Parent State | Child NS Item Type | Child State | Valid? | Action |
|---|---|---|---|---|
| Released | Non-assembly | Released | YES | Pass through (current) |
| Released | Non-assembly | WIP | **NO** | Block — "WIP part under released assembly" |
| Released | Assembly | Released | YES | Continue checking children |
| Released | Assembly | WIP | YES* | Graft point / empty placeholder |
| WIP | any | any | N/A | WIP parent is graft point; children from B(n-1) |

*WIP sub-assembly valid only if parent has at least one other released child (non-assembly or assembly). If parent has ONLY sub-assemblies and ALL are WIP → block.

### Error Detail & Guidance
- Show full path + context for every error (e.g., "GA > Assy A > Part X: WIP non-assembly item under released assembly")
- Include suggested fix action in error messages (e.g., "Release Part X in PDM before creating IFP artifact")
- All validation failures treated equally — no severity tiers, a block is a block
- Multiple errors shown as flat numbered list — collect ALL issues before blocking

### Validation Completeness
- Collect all errors before blocking — walk entire tree, find every issue, show them all at once so user can fix everything in one PDM session
- Validate on file load — user sees issues immediately upon uploading XML, before attempting merge
- Loading a new file auto-clears old errors and re-validates the new file

### Source Tagging Scope
- Tag assemblies only — non-assembly items (parts) inherit source from their parent implicitly
- Simple "current" (from X(n)) vs "grafted" (from B(n-1)) label — no additional metadata about which artifact revision
- **Claude's Discretion:** Whether to validate that every assembly has a source tag post-merge (integrity check vs trusting the engine)
- **Claude's Discretion:** Whether graft point assembly gets a distinct tag (e.g., "graft-point") vs same "grafted" as its children

### Claude's Discretion
- Merge button behavior when validation errors exist (disabled vs clickable-with-warning)
- Post-merge source tag validation (trust the engine vs verify)
- Graft point tag distinction from grafted children

</decisions>

<specifics>
## Specific Ideas

- Produce a validation logic reference document (`docs/validation-logic.md`) that captures the full logic table including notes relevant to PDM-NS integration — even rules the BOM Tool doesn't enforce, so the document serves as a single source of truth for all BOM validation logic and can be used when building future PDM custom solutions
- Same validation rules for every REV (REV0 through REVn) — the roadmap's Phase 11 success criterion about "REV0 validates all assemblies are Released" is misleading; the correct behavior is same rules, different consequence (empty placeholder instead of graft)

</specifics>

<deferred>
## Deferred Ideas

- **PDM-NS integration validation:** Released assembly's child sub-assemblies that are WIP may have unreliable metadata, which breaks PDM-NS integration. BOM Tool can't prevent this, but a future PDM custom solution should block BOM issuance when child assembly metadata (Part Number, UoM, NS Item Type, Description, Component Type) is missing or inaccurate. Captured in the validation logic document for future reference.
- **Component Type cleanup:** Investigate whether Component Type field values should be corrected in PDM to match NS Item Type — separate from BOM Tool scope but related to data quality

</deferred>

---

*Phase: 13-validation-system*
*Context gathered: 2026-02-12*
