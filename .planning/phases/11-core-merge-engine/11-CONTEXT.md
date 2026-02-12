# Phase 11: Core Merge Engine - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Merge algorithm that walks a BOM tree from X(n), detects WIP assemblies via state whitelist (IFP/IFU = Released, all else = WIP), and grafts last-known-good subtrees from prior IFP artifact B(n-1). Handles REV0 mode (no prior artifact), placeholder creation for never-released WIP assemblies, and multi-branch independence. Produces a merged tree with source annotations for downstream UI consumption.

The engine is the algorithm only. UI (Phase 14), artifact format (Phase 12), and validation blocking (Phase 13) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Assembly Matching
- Match WIP assemblies between X(n) and B(n-1) by **part number only** — PN uniquely identifies assemblies in PDM, regardless of tree position
- If a WIP assembly PN is not found in B(n-1), create an **empty placeholder with warning** (assembly node present, no children)
- If the same WIP assembly PN appears multiple times in X(n) under different parents, **graft the same B(n-1) subtree at each occurrence** using X(n)'s parent-child qty
- Revision mismatch between X(n) and B(n-1) (same PN, different rev letter): **still graft** — WIP state already signals unapproved content, no additional warning needed

### Missing vs Suppressed Handling
- Assembly exists in B(n-1) but absent from X(n): **treat as deleted, but show a warning** listing what was in B(n-1) but missing from X(n) — safety net for accidental suppressions against SOP
- Do NOT carry forward missing assemblies into B(n) — the warning is informational only

### REV0 Behavior (Clarification)
- **REV0 allows WIP assemblies** — they become empty placeholders with warnings (no B(n-1) to graft from)
- This is a clarification from the original success criteria which said "validates all assemblies are Released"
- The actual rule: **only the GA root must be Released** — if the top-level product isn't approved, there's no IFP to issue
- REV0 and REVn use the **same algorithm** — the only difference is whether B(n-1) exists to graft from
- REV0 simply has no prior artifact, so every WIP assembly becomes a placeholder instead of a graft

### Graft Boundary Data
- **Quantity** of WIP assembly in its parent → from **X(n)** (parent is Released, its qty declarations are approved data)
- **Metadata** of the WIP assembly node itself (description, revision, etc.) → from **B(n-1)** (last-approved assembly data, consistent with reference chain model)
- **Children/subtree** below the WIP assembly → from **B(n-1)** (grafted content)
- Every node in the merged result carries a **source tag**: `current` (from X(n)) or `grafted` (from B(n-1))
- The WIP assembly node at the graft point is tagged as `grafted`

### Graft Point Change Annotations
- At graft points, the engine compares **all fields** between X(n) and B(n-1) and stores differences as a `changes` annotation on the node
- Examples: "qty changed from 1 to 2", "description changed from X to Y"
- Annotations are **informational** — merge proceeds regardless, no blocking
- Provides a safety net for Engineering to see what shifted at graft boundaries

### Source Tags and Annotations Lifecycle
- Source tags (`current`/`grafted`) are **ephemeral** — exist during the merge session only
- Change annotations are also **ephemeral** — exist during the merge session only
- Both are **stripped on export** when B(n) is saved as a JSON artifact
- B(n) artifact is a **clean, flat snapshot** — no graft history, no annotations
- When B(n) is loaded as B(n-1) for the next merge, it is treated as **flat truth** — the engine does not care how B(n-1) was built

### Claude's Discretion
- Internal data structures for the merged tree
- Algorithm optimization (e.g., building a PN lookup index from B(n-1))
- Error handling for malformed inputs
- How to structure the module API for downstream phases to consume

</decisions>

<specifics>
## Specific Ideas

- The graft boundary data rule mirrors the reference chain model: "A1 in NetSuite will have the metadata it did when it was last released" — the tool simulates this by using B(n-1) metadata for WIP assembly nodes
- Parent-child qty belongs to the parent's data (GA says "I have 2 of A1"), not the child's — so it comes from X(n) because the parent is Released
- The distinction between qty source (X(n)) and metadata source (B(n-1)) at the graft point is a key architectural decision

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-core-merge-engine*
*Context gathered: 2026-02-11*
