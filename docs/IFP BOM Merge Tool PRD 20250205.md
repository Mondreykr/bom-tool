# IFP BOM Merge Tool — Product Requirements Document

## Document Purpose

This document specifies an approach to solving the BOM release management problem described in the companion specification ("BOM Reference Chain Model Specification"). Rather than building a new reference chain database, this approach **modifies the existing BOM comparison tool** so that it can ingest a raw PDM export, detect WIP assemblies by their PDM state metadata, graft last-known-good branches from the prior official IFP artifact, and produce a new official IFP BOM artifact.

The result is **functionally equivalent to the reference chain model** — WIP branches freeze at their last-released state, references persist, and no false "Removed" signals are generated — but achieved entirely within the existing XML export workflow, with intelligence added to the tool.

---

# 1. Problem Statement

The organization releases BOMs to Operations/Purchasing at project milestones called IFP Revisions. The current system exports an extended BOM — the complete hierarchy from the top-level General Assembly (GA) down through all sub-assemblies to every leaf component — directly from SolidWorks PDM as an XML file. This XML becomes the IFP artifact and is used both as the official record and as input to a comparison tool that classifies items as Added, Removed, Changed, or Unchanged between revisions.

The problem arises when assemblies are under active revision (work-in-progress) at the time of an IFP release. Their contents are unapproved and cannot be delivered to Operations. The only mechanism available to exclude them is **suppression** in the CAD model, which removes the assembly and all its descendants from the XML export entirely. However, suppression does not leave any trace in the XML — the assembly is simply absent, indistinguishable from an assembly that was permanently deleted from the product.

This means the comparison tool, which operates on two XML snapshots and nothing else, reports all suppressed-WIP assemblies and their children as "Removed." Operations, receiving this comparison, may cancel procurement or close work orders for items that are still in project scope and will return in a future release. The information needed to distinguish "temporarily excluded because WIP" from "permanently deleted from scope" — engineering intent — is not present in the data. The problem is architectural: the extended BOM export conflates the **reference** to an assembly (the fact that it exists in the product structure) with the **contents** of that assembly (what it currently contains). When an assembly is WIP, its contents are wrong, but its reference should persist. The export forces a binary choice — include everything (delivering unapproved content) or exclude everything (losing the reference) — and neither produces a correct result.

This PRD specifies a tool modification that resolves this by keeping WIP assemblies unsuppressed (preserving their reference and PDM state metadata in the export), then using the tool to detect WIP assemblies by state, replace their unapproved contents with last-known-good content from the prior IFP artifact, and produce a new official IFP BOM that accurately represents the approved state of the product.

---

# 2. Notation and Naming Conventions

Precise language prevents confusion when discussing multiple revisions, file versions, and assembly states. The following conventions are used throughout this document.

## 2.1 Files

| Symbol | Name | Definition |
|--------|------|------------|
| **X(n)** | Source Export | The raw extended BOM XML exported from PDM at the time of IFP revision *n*. Contains the full tree including WIP assemblies (unsuppressed) with their current unapproved contents. This is an intermediate artifact — not delivered to Operations. |
| **B(n)** | IFP BOM REV *n* | The official, constructed IFP Bill of Materials for revision *n*. Produced by the tool. WIP branches have been replaced with their last-known-good content. **This is the controlled release artifact.** |

**File naming convention:**

```
Source Export:   {GA_PN}_EXPORT_{YYYY-MM-DD}.xml
IFP BOM:        {GA_PN}_IFP_REV{n}.{ext}
```

Examples:
```
12345_EXPORT_2025-02-05.xml       ← Source Export (intermediate, retained for audit)
12345_IFP_REV0.xml                ← Official IFP BOM REV0
12345_IFP_REV1.xml                ← Official IFP BOM REV1
```

## 2.2 Assembly Content Versions

When discussing the *content* of a particular assembly as captured in a specific IFP revision:

| Notation | Meaning |
|----------|---------|
| **A1^R0** | The content (children, quantities) of assembly A1 as captured in B(0) — IFP BOM REV0 |
| **A1^R1** | The content of A1 as captured in B(1) — IFP BOM REV1 |
| **A1^Xn** | The content of A1 as it appears in Source Export X(n) — raw, potentially unapproved |

The superscript denotes *where the content came from*, not the assembly's inherent version.

## 2.3 Assembly States

| Notation | Meaning |
|----------|---------|
| **A1[IFP]** | A1's PDM state is "Issued for Purchasing" — released, content approved |
| **A1[IFU]** | A1's PDM state is "Issued for Use" — released, content approved |
| **A1[WIP]** | A1's PDM state is anything other than IFP or IFU (e.g., "In Design", "Under Revision") |

The tool does not enumerate WIP states. It only checks for the two **approved** states. Everything else is WIP by exclusion.

## 2.4 State Classification Rule

> **An assembly is RELEASED if and only if its PDM state is exactly "Issued for Purchasing" or "Issued for Use."**
> **All other states are WIP. The tool does not need to know their names.**

This is a whitelist, not a blacklist. If PDM adds new workflow states in the future, they are automatically treated as WIP unless they are one of the two approved states.

---

# 3. Architecture Overview

## 3.1 Current Workflow (Problem State)

```
PDM ──export──▶ Extended BOM XML ──compare──▶ Comparison Report
                 (WIP assemblies                 (false "Removed"
                  suppressed = lost)               for WIP items)
```

## 3.2 New Workflow

```
PDM ──export──▶ X(n): Source Export    ◀── raw, WIP assemblies UNSUPPRESSED
                       │
                       ▼
                 ┌─────────────┐
                 │  IFP BOM    │◀── B(n-1): Prior IFP BOM (for grafting)
                 │  Merge Tool │
                 └─────┬───────┘
                       │
                       ▼
                 B(n): IFP BOM REV n   ◀── official artifact, WIP branches
                                            resolved to last-known-good
```

**For the very first release (REV0):** There is no prior IFP BOM. The tool ingests X(0) alone. If all assemblies are released (as they should be for a first IFP), B(0) = X(0) structurally. If any assembly is WIP in the first release, it appears as an empty placeholder (see Section 6.3).

**For all subsequent releases (REV n, n ≥ 1):** The tool ingests X(n) and B(n-1). WIP branches in X(n) are replaced with corresponding branches from B(n-1).

## 3.3 Downstream Usage of B(n)

Once B(n) is produced, it becomes the single source of truth for that IFP revision. All downstream operations work from B(n):

```
B(n) ──▶ Flat BOM generation (rolled-up component quantities)
B(n) ──▶ Hierarchical BOM view (assembly structure for work orders)
B(n) + B(n-1) ──▶ Comparison report (Added / Removed / Changed / Unchanged)
B(n) ──▶ Scoped comparisons (e.g., compare A1^Rn to A1^R(n-1))
```

The comparison is decoupled from the construction. The tool produces B(n); a user can then choose to compare any two B artifacts at whatever scope they want — GA-to-GA, assembly-to-assembly, etc.

## 3.4 Key Process Change: No Suppression of WIP Assemblies

Under this model, **WIP assemblies must NOT be suppressed** in the CAD model prior to GA export. They must remain unsuppressed so that:

1. They appear in the Source Export X(n) with their PDM state metadata
2. The tool can detect them and apply the grafting logic
3. Their *reference* (the fact that the parent contains them) is preserved

If an assembly is suppressed, it is invisible to the export. The tool cannot distinguish a suppressed-WIP assembly from a truly deleted one. **Suppression must be reserved exclusively for true removal from scope.**

This requires a corresponding SOP update: engineers must leave WIP assemblies unsuppressed and rely on the tool (not suppression) to handle WIP exclusion.

---

# 4. The Algorithm: Top-Down Branch Walk

## 4.1 Core Principle

The branch walk applies **only to assemblies** (items that have children). Components are leaf items — they have no children, no PDM state relevant to this logic, and are always included as-is from whatever context they appear in (the current export or a grafted branch). The tool never evaluates a component's state; it evaluates the state of the assembly that *contains* the component.

## 4.2 Core Logic

The tool walks the BOM tree from L0 (GA) downward, examining each **assembly's** PDM state. The first WIP assembly encountered on any branch triggers a graft — that assembly and its entire subtree are replaced with the corresponding branch from the prior IFP BOM B(n-1).

> **Note on pseudocode:** The following is a conceptual representation of the algorithm's logic, not a specification of actual function signatures, data structures, or implementation patterns. The existing codebase may use a different paradigm entirely. This pseudocode is intended to communicate the *decision logic* clearly so that an implementer with knowledge of the codebase can translate it into the appropriate form.

```
function buildIFPBOM(sourceNode, priorBOM):

    // Check this assembly's PDM state
    if sourceNode.state NOT IN ["Issued for Purchasing", "Issued for Use"]:
        // This assembly is WIP — graft from prior
        priorNode = priorBOM.findByPN(sourceNode.PN)
        if priorNode EXISTS:
            return priorNode   // entire branch from prior IFP BOM
        else:
            return sourceNode.asEmptyAssembly()   // new, never released
            // WARN: "{sourceNode.PN} is WIP with no prior release"

    // Assembly is RELEASED — include it, but recurse into children
    result = copy sourceNode metadata (PN, state, qty, etc.) without children
    for each child in sourceNode.children:
        if child.type == ASSEMBLY:
            result.addChild( buildIFPBOM(child, priorBOM) )
        else:
            result.addChild( child )   // components included as-is
    return result
```

**Entry point:**
```
B(n) = buildIFPBOM( rootOf(X(n)), B(n-1) )
```

For REV0 (no prior BOM): `B(n-1)` is empty/null. Any WIP assembly becomes an empty placeholder.

## 4.3 Why Top-Down, First-WIP-Stops-the-Branch

Consider this structure in X(1):

```
GA [IFP]
└── A1 [IFU]                ← released, include, keep walking
    ├── A5 [Under Revision]  ← WIP! STOP. Graft A5^R0 from B(0)
    │   ├── C1 (3)           ← part of A5's WIP content — not evaluated
    │   └── C2-5.5" (2)      ← part of A5's WIP content — not evaluated
    ├── C3 (4)               ← component under released A1, include
    └── C4 (1)               ← component under released A1, include
```

The tool does not look inside A5's WIP children. The moment it finds A5[WIP], it grafts the entire A5 branch from B(0). This is correct because A5's children in X(1) are unapproved — that's why A5 is WIP. Evaluating anything beneath a WIP assembly is meaningless; the graft replaces the entire subtree.

If A1 itself were WIP:

```
GA [IFP]
└── A1 [Under Revision]    ← WIP! STOP. Graft A1^R0 from B(0)
    ├── A5 [IFU]            ← irrelevant — entire A1 branch is grafted
    ├── C3 (4)              ← irrelevant
    └── C4 (1)              ← irrelevant
```

The graft happens at the **highest** WIP assembly encountered on a branch. Nothing beneath it is inspected.

## 4.4 Multi-Branch Independence

Each branch from the GA is evaluated independently:

```
GA [IFP]
├── A1 [Under Revision]    ← WIP → graft A1^R0 from B(0)
├── A2 [IFU]               ← released → include, walk children
│   └── A6 [IFU]           ← released → include
│       ├── C1 (2)
│       └── C5 (1)
├── A3 [IFP]               ← released → include, walk children
│   └── C8 (2)
└── C7 (2)                 ← component, include
```

A1 being WIP has no effect on A2, A3, or C7. Each branch stands on its own.

## 4.5 Deep WIP Detection (Below L1)

The tool does NOT stop at L1. It walks as deep as necessary. This handles the case where an L1 assembly is released but a deeper child has subsequently gone back into revision:

```
GA [IFP]
└── A2 [IFU]                ← released, keep walking
    └── A6 [Under Revision]  ← WIP at L2! Graft A6^R0 from B(0)
        ├── C1 (2)           ← part of A6's WIP content — not evaluated
        └── C5 (1)           ← part of A6's WIP content — not evaluated
```

Result: A2 is included with its released structure from X(n), but A6 within A2 is grafted from B(0). This is correct: A6's last-approved content is preserved even though A6 has since gone back into revision.

PDM permits moving a previously-released assembly back into revision at any time. This can happen at any depth — L2, L3, L4, or deeper. The algorithm must walk the full depth of every branch to catch it wherever it occurs.

---

# 5. Process Flow with Example BOMs

Using the same structures from the companion specification for continuity.

## 5.1 IFP REV0 — Baseline

**PDM State:** All assemblies at IFP or IFU.

**Source Export X(0):**
```
GA [IFP]
├── A1 (1) [IFU]
│   ├── A5 (2) [IFU]
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1) [IFU]
│   ├── A6 (1) [IFU]
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
└── C7 (2)
```

**Tool Processing:** No prior BOM exists. Walk the tree — all assemblies are released. No grafting needed.

**B(0) — IFP BOM REV0:**
```
GA
├── A1 (1)
│   ├── A5 (2)
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1)
│   ├── A6 (1)
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
└── C7 (2)
```

Identical to X(0). B(0) is the official IFP BOM REV0 artifact.

**Flat BOM from B(0):**

| Composite Key | Qty |
|---------------|-----|
| C1 | 8 |
| C2-5.5" | 4 |
| C3 | 4 |
| C4 | 1 |
| C5 | 1 |
| C6 | 3 |
| C7 | 2 |

---

## 5.2 IFP REV1 — A1 WIP, A3 Added

**Scenario:** A1 has gone under revision (changes pending to A5). New assembly A3 has been designed and released. GA releases via DC bypass.

**Source Export X(1):**
```
GA [IFP]
├── A1 (1) [Under Revision]      ← WIP
│   ├── A5 (2) [Under Revision]   ← also WIP (irrelevant — A1 stops the walk)
│   │   ├── C1 (5)                ← changed qty (unapproved)
│   │   └── C2-5.75" (2)          ← changed length (unapproved)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1) [IFU]
│   ├── A6 (1) [IFU]
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
├── A3 (1) [IFP]                  ← new, released
│   ├── C8 (2)
│   └── C9 (1)
└── C7 (2)
```

**Tool Processing (input: X(1) + B(0)):**

| Assembly | State | Action |
|----------|-------|--------|
| GA | IFP | ✓ Released — walk children |
| A1 | Under Revision | ✗ WIP — graft A1 branch from B(0) |
| A2 | IFU | ✓ Released — walk children |
| A6 | IFU | ✓ Released — include |
| A3 | IFP | ✓ Released — walk children |

**B(1) — IFP BOM REV1:**
```
GA
├── A1 (1)              ← A1^R0 grafted from B(0)
│   ├── A5 (2)           ← A5^R0 (part of the graft)
│   │   ├── C1 (3)       ← original qty, NOT the unapproved 5
│   │   └── C2-5.5" (2)  ← original length, NOT the unapproved 5.75"
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1)
│   ├── A6 (1)
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
├── A3 (1)              ← new assembly, included with children
│   ├── C8 (2)
│   └── C9 (1)
└── C7 (2)
```

**Key observations:**
- A1's unapproved changes (C1 qty 5, C2-5.75") are **not** in B(1). The graft preserved A1^R0.
- A3 and its children are correctly included as new content.
- No false "Removed" signals. A1 and all its children are present.

**Comparison B(1) vs B(0):**

| Item | Classification | Detail |
|------|---------------|--------|
| A3 | Added | New assembly |
| C8 | Added | Child of A3 (qty 2) |
| C9 | Added | Child of A3 (qty 1) |
| Everything else | Unchanged | — |

This is correct. Operations sees only what actually changed: A3 was added. A1's branch is frozen — no action needed.

---

## 5.3 IFP REV2 — A1 Restored with Changes

**Scenario:** A1 completes revision. A5 qty changed from 2 to 3 (approved). All assemblies re-released.

**Source Export X(2):**
```
GA [IFP]
├── A1 (1) [IFU]                  ← re-released
│   ├── A5 (3) [IFU]              ← qty changed (2 → 3), re-released
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1) [IFU]
│   ├── A6 (1) [IFU]
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
├── A3 (1) [IFP]
│   ├── C8 (2)
│   └── C9 (1)
└── C7 (2)
```

**Tool Processing (input: X(2) + B(1)):** All assemblies released. No grafting. B(2) = X(2) structurally.

**B(2) — IFP BOM REV2:**
```
GA
├── A1 (1)
│   ├── A5 (3)          ← qty now 3 (was 2)
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1)
│   ├── A6 (1)
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
├── A3 (1)
│   ├── C8 (2)
│   └── C9 (1)
└── C7 (2)
```

**Comparison B(2) vs B(1):**

| Item | Classification | Detail |
|------|---------------|--------|
| A5 (under A1) | Changed | Qty 2 → 3 |
| C1 (flat) | Changed | 8 → 11 |
| C2-5.5" (flat) | Changed | 4 → 6 |
| Everything else | Unchanged | — |

*C1 detail: In B(1), C1 total = (1×2×3) + (1×1×2) = 6 + 2 = 8. In B(2), C1 total = (1×3×3) + (1×1×2) = 9 + 2 = 11.*

This is correct. Operations sees exactly what changed: A5's quantity increased, causing downstream component quantity changes.

---

## 5.4 IFP REV1 (Alternate Scenario) — Deep WIP at L2 Only

**Scenario:** A1 remains released, but A5 (L2, child of A1) has gone under revision.

**Source Export X(1):**
```
GA [IFP]
├── A1 (1) [IFU]                   ← released
│   ├── A5 (2) [Under Revision]    ← WIP at L2
│   │   ├── C1 (5)                 ← unapproved change
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1) [IFU]
│   └── ...
└── C7 (2)
```

**Tool Processing:**

| Assembly | State | Action |
|----------|-------|--------|
| GA | IFP | ✓ Walk children |
| A1 | IFU | ✓ Released — walk children |
| A5 | Under Revision | ✗ WIP — graft A5 branch from B(0) |

**B(1) — IFP BOM REV1:**
```
GA
├── A1 (1)              ← from X(1), released content
│   ├── A5 (2)           ← A5^R0 grafted from B(0)
│   │   ├── C1 (3)       ← original qty, not unapproved 5
│   │   └── C2-5.5" (2)
│   ├── C3 (4)           ← from X(1) directly
│   └── C4 (1)           ← from X(1) directly
├── A2 (1)
│   └── ...
└── C7 (2)
```

This demonstrates deep WIP detection: A1 is released and included from the current export, but A5 within A1 is WIP and grafted from B(0). The tool correctly stitched released content (A1's children from X(1)) with frozen content (A5's subtree from B(0)).

---

## 5.5 Multi-Revision WIP Carry-Forward

**Scenario:** A5 has been WIP since before REV1. It's still WIP at REV3. Meanwhile other things changed.

**Chain of custody for A5's content:**

| Artifact | A5 content source | Why |
|----------|-------------------|-----|
| B(0) | X(0) — original approved content | A5 was released at REV0 |
| B(1) | Grafted from B(0) | A5 was WIP |
| B(2) | Grafted from B(1) | A5 still WIP; B(1) carries B(0)'s A5 |
| B(3) | Grafted from B(2) | A5 still WIP; B(2) carries B(0)'s A5 |

A5's approved content from B(0) propagates forward through every subsequent IFP BOM automatically, as long as A5 remains WIP. The tool always grafts from B(n-1), and B(n-1) already contains the correctly propagated content. No special logic is needed for multi-revision carry-forward — it is an emergent property of the N-1 dependency.

This is functionally identical to the reference chain model, where A5's record stays frozen at its last-released state. The chain of B(n) artifacts serves as the database.

---

## 5.6 True Deletion — A2 Permanently Removed, C7 Moved

**Scenario:** A2 removed from scope entirely (deleted from CAD model). C7 moved inside A3.

**Source Export X(4):**
```
GA [IFP]
├── A1 (1) [IFU]
│   ├── A5 (3) [IFU]
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A3 (1) [IFP]
│   ├── C7 (2)            ← moved here from GA level
│   ├── C8 (2)
│   └── C9 (1)
```

A2 is absent from the export — deleted from the CAD model. This is a true deletion, not suppression of a WIP assembly. Because A2 is absent (not present with a WIP state), the tool has nothing to graft. B(4) correctly reflects A2's removal.

**Comparison B(4) vs B(3):**

| Item | Classification |
|------|---------------|
| A2, A6 | Removed (truly) |
| C5, C6 | Removed (only existed under A2) |
| C1 (flat) | Changed (lost A6 contribution) |
| C7 (flat) | Unchanged (same total qty, moved from GA to A3) |

---

## 5.7 New WIP Assembly with No Prior Release

**Scenario at REV1:** A3 is new and still in design. It appears in X(1) as:

```
A3 (1) [In Design]
├── C8 (2)
└── C9 (1)
```

**Tool Processing:** A3 is WIP. Tool looks for A3 in B(0). Not found. A3 is included as empty placeholder.

**B(1) contains:**
```
├── A3 (1)              ← present as reference (parent declares it)
│   (no children)        ← contents pending — never released
```

**Tool emits warning:** `"A3 [In Design] has no prior released BOM — included as empty placeholder."`

Operations knows A3 is in scope but its contents are not yet committed.

---

# 6. Edge Cases and Validation

## 6.1 Common Component Across Branches, One Branch WIP

C1 exists in both A5 (under A1) and A6 (under A2). A1 goes WIP for REV1.

**Under old system (suppression):** C1 quantity drops because A1's contribution disappears.
**Under this tool:** A1 branch grafted from B(0). C1 quantity unchanged. ✓

## 6.2 PN-Length Composite Key Preservation

The tool must preserve PN-Length as a distinct composite key throughout all operations — reading XMLs, grafting branches, writing B(n), and all downstream BOM generation. C2-5.5" and C2-6.5" are distinct items. C2-5.5" and C2-5.75" are distinct items. This must survive the graft operation.

## 6.3 New WIP Assembly — Empty Placeholder

Covered in Section 5.7. When a WIP assembly has no corresponding branch in B(n-1), it is included as an empty assembly (present in structure, no children) with a warning. This correctly signals that the assembly is in scope but its contents are not yet committed.

## 6.4 Quantity Change on the Parent-Child Relationship

A1 contains A5 (qty 2) in B(0). At REV1, A1 is released and contains A5 (qty 3), but A5 itself is WIP.

**Tool behavior:** A1 is released → include from X(1), walk its children. A5 is WIP → graft A5's subtree from B(0). The result is A1 containing A5 (qty 3, from X(1)) with A5's *internal content* from B(0). The quantity on the parent-child relationship comes from the current released parent. The graft replaces A5's children, not A5's quantity in the parent.

This is correct and important: the parent's declaration of "how many A5s I contain" is part of the parent's released content. The graft supplies only the assembly's internal structure. ✓

## 6.5 Same Assembly Appears at Multiple Points in the Tree

A5 appears under both A1 (L2) and directly under GA (L1), at different quantities. A5 is WIP.

**Tool behavior:** Each instance of A5 is encountered independently during the branch walk. Both instances get grafted from B(n-1) since A5 is WIP in both locations. The quantities in the parent-child relationships are retained from X(n) — each parent independently declares how many A5s it contains. ✓

---

# 7. File Format Considerations

## 7.1 The Format Decision

The tool must read PDM XML as input. The question is what format B(n) should take. The following options are presented conceptually; **the actual trade-offs depend on the existing codebase's capabilities** (what it can parse, what it can serialize, how its internal data structures work). An implementer with codebase knowledge should evaluate these options against the code as it exists.

**Option A — B(n) is XML in the same schema as the PDM export.** This would mean reading and writing the same format. Whether this is simple or complex depends on the XML schema and whether the existing code already has serialization capabilities.

**Option B — B(n) is a tool-native format (JSON, structured text, etc.).** This frees the tool from the PDM XML schema but means all downstream operations must work with the new format.

**Option C — Hybrid.** The tool works in whatever internal format is cleanest, and can export to PDM-compatible XML on demand for backward compatibility.

**Regardless of format, the non-negotiable requirement is:** B(n) must be a multi-level hierarchical BOM — the full tree structure with all assembly/component relationships, quantities, and composite keys preserved. It is the official IFP Bill of Materials revision artifact.

## 7.2 What B(n) Must Contain

> **Note:** The following is a specification of *what data* B(n) must carry, not how the file should be structured. The actual schema, field names, and organization should be determined by the implementer based on the codebase and chosen format from Section 7.1.

At minimum, each node in B(n) must carry:

| Data | Purpose |
|------|---------|
| Part Number (PN) | Item identification |
| Composite Key (PN-Length if applicable) | Distinct item identification for cut-to-length items |
| Item Type (Assembly / Component) | Structural role in the hierarchy |
| Quantity | Parent-child relationship qty |
| Level | Hierarchy depth |

Recommended additions for traceability:

| Data | Purpose |
|------|---------|
| Description | Human readability |
| Source indicator | "From X(n)" vs "Grafted from B(n-1)" — makes it transparent which branches are current vs. carried forward |

The source indicator is strongly recommended. It makes it immediately visible to anyone reviewing B(n) which content is freshly released and which was grafted from a prior revision. This supports auditing and troubleshooting.

---

# 8. Implementation Requirements Summary

## 8.1 Tool Capabilities (New or Modified)

> **Note:** These are functional requirements — *what the tool must do*. The specific implementation approach (new functions, modified functions, refactored architecture, etc.) depends on the existing codebase and should be determined by the implementer.

| Capability | Description | Priority |
|------------|-------------|----------|
| **XML Parsing with State Metadata** | Read PDM state for each assembly node in the Source Export | Required |
| **Top-Down Branch Walk with State Evaluation** | Walk the tree assembly-by-assembly, evaluating state at each level, stopping at the first WIP assembly on each branch | Required |
| **Branch Grafting** | Locate a WIP assembly by PN in the prior B(n-1), substitute its entire subtree | Required |
| **B(n) Output** | Write the constructed multi-level BOM as the official IFP artifact | Required |
| **Empty Placeholder Handling** | When a WIP assembly has no prior release, include it as an empty assembly and emit a warning | Required |
| **Flat BOM Generation from B(n)** | Produce a rolled-up component list with quantities from a B(n) artifact | Required (may already exist) |
| **B(n) vs B(n-1) Comparison** | Produce Added/Removed/Changed/Unchanged report from two B artifacts | Required (may already exist) |
| **Source/Graft Annotation** | Mark nodes in B(n) to indicate whether content came from the current export or was grafted | Recommended |

## 8.2 SOP / Process Changes

| Change | Description |
|--------|-------------|
| **No WIP Suppression** | Engineers must not suppress WIP assemblies prior to GA export. WIP assemblies remain unsuppressed. Suppression is reserved for true scope removal only. |
| **WIP State Hygiene** | Assemblies not approved for release must be in a non-IFP/IFU state. This is already enforced by PDM workflow — but the SOP should explicitly state the dependency. |
| **DC Bypass Continues** | Document Control continues to bypass bottom-up validation to release GA when children are WIP. This is unchanged from current practice. |
| **Source Export Retention** | X(n) files should be retained alongside B(n) for audit trail purposes. |
| **B(n) as Official Artifact** | B(n), not X(n), is the IFP BOM delivered to Operations and used for all downstream purposes. |

## 8.3 Artifact Storage

```
/IFP_Releases/
├── {GA_PN}/
│   ├── Exports/                              ← Source Exports (intermediate, audit)
│   │   ├── {GA_PN}_EXPORT_2025-01-15.xml      [X(0)]
│   │   ├── {GA_PN}_EXPORT_2025-02-05.xml      [X(1)]
│   │   └── ...
│   ├── {GA_PN}_IFP_REV0.{ext}                [B(0)]  ← Official artifacts
│   ├── {GA_PN}_IFP_REV1.{ext}                [B(1)]
│   └── ...
```

---

# 9. Functional Equivalence to Reference Chain Model

This section maps the concepts to demonstrate that this approach achieves the same outcomes as the reference chain model described in the companion specification.

| Reference Chain Concept | Merge Tool Equivalent |
|-------------------------|----------------------|
| Immediate-children records stored per assembly per release | Each assembly's children within B(n) serve as that assembly's "record" for this revision |
| Resolution at query time by walking the chain | The top-down branch walk during B(n) construction is the resolution step |
| WIP assembly → record frozen at last release | WIP assembly → branch grafted from B(n-1), which carries the last-released content forward |
| Snapshot: explicit list of assembly-revision pairs | B(n) itself is the materialized snapshot |
| True deletion: assembly absent from parent's immediate children | Assembly absent from Source Export X(n) because it was deleted from CAD |
| New unreleased assembly: empty record | Empty placeholder in B(n) with warning |

The key architectural difference: the reference chain model stores granular per-assembly records and resolves on demand; the merge tool materializes the full tree at each release. Both produce identical outputs for all scenarios enumerated in the companion specification and in this document.

The chain of B(n) files *is* the database.

---

# 10. Summary

The IFP BOM Merge Tool approach solves the WIP assembly problem by:

1. **Leaving WIP assemblies unsuppressed** so they appear in the Source Export with their PDM state metadata.
2. **Walking the tree top-down**, using PDM state as the automatic WIP detection — no manual flagging needed. The tool checks only for the two approved states (IFP, IFU); everything else is WIP by exclusion.
3. **Grafting WIP branches from the prior IFP BOM B(n-1)**, preserving last-known-good content.
4. **Producing an official IFP BOM artifact B(n)** that correctly represents the approved state of the product, with WIP branches frozen at their last-released content.
5. **Carrying forward frozen content automatically** through the N-1 dependency chain — no special logic required.

The approach is functionally equivalent to the reference chain model, achieves the same outcomes for all identified edge cases, and operates within the existing PDM export workflow with modifications only to the BOM tool and the suppression SOP.

---

*Document Version: 2.0*
*Companion to: BOM Reference Chain Model Specification*
*Status: Draft — for review and refinement*