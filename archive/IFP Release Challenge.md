# IFP Release Challenge: BOM Management for Iterative Development

## Document Purpose

This document characterizes a BOM (Bill of Materials) release management problem encountered when releasing products iteratively—where assemblies may be under revision at the time of an IFP (Issued for Purchasing) release. It defines the problem domain, enumerates edge cases, and outlines three solution options. Detailed solution specifications are provided in companion documents.

---

# 1. Executive Summary

## The Problem

A manufacturing organization releases BOMs to Operations/Purchasing at project milestones called "IFP Revisions." The current system exports an **extended BOM** (the complete hierarchy from the top-level product down to all components) directly from SolidWorks PDM as an XML file.

When assemblies are under revision (work-in-progress), they must be excluded from the release to prevent unapproved content from reaching Operations. The only mechanism to exclude them is **suppression** in the CAD model, which removes the assembly and all its children from the XML export entirely.

This creates a critical failure: when comparing IFP REV1 to IFP REV0, suppressed assemblies appear as "Removed"—even though they remain in project scope and will return in a future release. Operations may incorrectly cancel procurement or work orders based on this false signal.

## The Root Cause

The extended BOM export **conflates two distinct concerns**:
1. What assemblies exist in the product structure (references)
2. What those assemblies currently contain (contents)

When an assembly is WIP, its contents are unapproved, but its reference should persist. The extended export cannot separate these—it either includes everything (wrong contents) or excludes everything (lost reference).

## The Solution Principle

All three solution options share a common principle: **decouple the reference to an assembly from the contents of that assembly.** The parent can declare "I contain A1" without asserting what A1 currently contains. A1's contents are resolved separately—either from a prior release artifact or from a database record established when A1 was last released.

---

# 2. Domain Model and Vocabulary

## 2.1 Entities

| Entity | Definition |
|--------|------------|
| **GA (General Assembly)** | The top-level product. Level 0 (L0). Represents the complete deliverable for a job/project. |
| **Assembly** | A collection of children (other assemblies and/or components). Exists at L1, L2, ... Ln. Identified by a Part Number (PN). |
| **Component** | A leaf item with no children. Identified by a composite key (see below). |
| **Item** | Generic term for either Assembly or Component. |

## 2.2 Composite Keys

Items are identified by composite keys, not simple part numbers alone:

| Key Type | Format | Example | Use Case |
|----------|--------|---------|----------|
| **PN** | Part Number alone | `C1`, `12345` | Discrete items counted as "eaches" (fasteners, brackets, etc.) |
| **PN-Length** | Part Number + cut length | `C2-5.5"`, `ANGLE-3x3-12.75` | Cut-to-length items where the PN represents raw stock |

Two items with the same PN but different lengths are **distinct items** in the BOM.

## 2.3 States (in PDM)

| State | Category | Meaning |
|-------|----------|---------|
| **IFP** | Released | Issued for Purchasing. Approved for procurement. |
| **IFU** | Released | Issued for Use. Approved for manufacturing/assembly. |
| **In Design** | WIP | Initial design work. Not yet approved. |
| **Under Revision** | WIP | Previously released, now being modified. Not currently approved. |

For BOM purposes, IFP and IFU are functionally equivalent—both represent a "released" state.

## 2.4 Hierarchy Levels

| Level | Description |
|-------|-------------|
| **L0** | Top-level product (GA) |
| **L1** | Major sub-assemblies |
| **L2** | Sub-assemblies within L1 |
| **Ln** | Deeper nesting as needed |

## 2.5 Relationships

| Relationship | Definition |
|--------------|------------|
| **Parent-Child** | An assembly contains items. Each relationship has a **Quantity**. |
| **Immediate BOM** | An assembly's direct children only (one level deep). |
| **Extended BOM** | An assembly's complete descendant tree, resolved recursively. |

## 2.6 Quantity Roll-Up

Quantities multiply through the hierarchy. If GA contains A1 (qty 2), A1 contains A5 (qty 3), and A5 contains C1 (qty 4), then the total quantity of C1 in the GA's extended BOM is: 2 × 3 × 4 = 24.

## 2.7 Suppression

Suppression is a CAD model state (SolidWorks) where an item is hidden from the assembly:
- The suppressed item and all its descendants are invisible to PDM
- PDM's BOM export omits suppressed items entirely
- Suppression is **not recorded** in the XML—the item is simply absent
- Suppression and deletion are indistinguishable from the BOM's perspective

---

# 3. Current State Architecture

## 3.1 PDM Release Process

When an assembly transitions to IFP or IFU state in SolidWorks PDM, the system automatically generates XML exports:

1. **Extended BOM XML**: Contains the assembly and all descendants (recursive). Used for IFP releases to Operations.
2. **Immediate Children XML**: Contains only direct children (one level). Used for ERP (NetSuite) integration.

Both exports reflect the CAD model state at the moment of release, including any suppressions.

## 3.2 Downstream Consumers

| Consumer | View Needed | Purpose |
|----------|-------------|---------|
| **Purchasing** | Flat BOM (all components, rolled-up quantities) | Determine what to procure and in what quantities |
| **Production Analyst** | Hierarchical BOM (assembly structure) | Set up work orders in ERP for GA and sub-assemblies |
| **Engineering** | Hierarchical comparison | Understand what changed between revisions |

## 3.3 Current Comparison Tool

The existing tool compares two GA extended BOM XMLs and classifies items as:
- **Added**: Present in REV(n), absent in REV(n-1)
- **Removed**: Absent in REV(n), present in REV(n-1)
- **Changed**: Present in both, but quantity differs
- **Unchanged**: Present in both with same quantity

The tool operates purely on composite keys and quantities. It has no access to PDM state, revision metadata, or engineering intent.

## 3.4 ERP Integration (NetSuite)

NetSuite receives immediate-children BOMs and maintains a reference chain internally. This architecture naturally handles WIP assemblies—but NetSuite has historically had a data fidelity issue with PN-Length items (aggregating lengths). Recent testing indicates this can be mitigated by modifying the import script to create separate line items per length instance.

---

# 4. Problem Statement

## 4.1 The Core Failure Mode

When an assembly (A1) is released in IFP REV0, then goes under revision, you cannot include it in IFP REV1 because its contents are unapproved. The only current option is to suppress A1 in the GA model before releasing REV1.

**Result**: The GA's extended BOM XML for REV1 omits A1 entirely.

**Comparison Output**: REV1 vs REV0 shows A1 and all its children as "Removed."

**Reality**: A1 is still in project scope. It will return. Nothing should be cancelled.

## 4.2 Concrete Example

**IFP REV0 Structure:**
```
GA
├── A1 (1)
│   ├── A5 (2)
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   └── C3 (4)
├── A2 (1)
│   └── C4 (2)
└── C7 (2)
```

**Scenario**: A1 goes under revision. New assembly A3 is ready. Need to release IFP REV1.

**Current approach (with A1 suppressed):**
```
GA
├── A2 (1)
│   └── C4 (2)
├── A3 (1)
│   └── C5 (3)
└── C7 (2)
```

**Comparison Output (REV1 vs REV0):**

| Item | Classification | Correct? |
|------|----------------|----------|
| A1 | Removed | ✗ False—A1 is WIP, not removed from scope |
| A5 | Removed | ✗ False—part of A1 |
| C1 | Removed | ✗ False—part of A1 |
| C2-5.5" | Removed | ✗ False—part of A1 |
| C3 | Removed | ✗ False—part of A1 |
| A3 | Added | ✓ Correct |
| C5 | Added | ✓ Correct |
| A2, C4, C7 | Unchanged | ✓ Correct |

**Impact**: Purchasing may cancel orders for C1, C2-5.5", C3. Production may close work orders for A1. Both are wrong.

## 4.3 Why the Current Architecture Cannot Solve This

The comparison tool receives two XML snapshots. In REV1's XML, A1 does not exist. There is no marker indicating "A1 is suppressed but in scope" vs. "A1 has been deleted from the product."

The information needed to distinguish these cases—engineering intent—is not present in the data. **The problem is architectural, not algorithmic.**

The extended BOM export forces a binary decision:

| Option | Outcome |
|--------|---------|
| Include A1 (unsuppressed) | A1's WIP children appear in the BOM—wrong content delivered to Operations |
| Exclude A1 (suppressed) | A1 vanishes from the BOM—false "Removed" signal to Operations |

Neither option produces correct output. The architecture must change.

## 4.4 What a Correct Solution Must Achieve

The ideal IFP REV1 should:
- Include A1 with its **last-approved contents** (from REV0)
- Include A2 unchanged
- Include A3 as newly added
- **Not** include A1's unapproved WIP contents

Comparison of this correct REV1 to REV0 would show:
- A3 + children: **Added**
- Everything else: **Unchanged**

This is the accurate signal to Operations: A3 was added. A1's branch is frozen at its last-released state—no action needed.

---

# 5. Edge Cases (Summary)

Any solution must handle these scenarios correctly:

## 5.1 Temporary Suppression / WIP Scenarios

| Edge Case | Requirement |
|-----------|-------------|
| L1 assembly WIP, later restored with changes | WIP branch frozen; changes appear only when re-released |
| L2 assembly WIP under released L1 | Deep WIP detection; L2 branch frozen while L1 structure preserved |
| Multiple assemblies WIP simultaneously | Each branch handled independently |

## 5.2 Structural Reorganization

| Edge Case | Requirement |
|-----------|-------------|
| Component moves from GA to subassembly | Flat BOM shows unchanged qty; hierarchical shows structural change |
| Component moves between subassemblies | Correctly tracked in both views |
| Assembly reparented | Both old and new parents reflect the change |

## 5.3 Partial / Incomplete Releases

| Edge Case | Requirement |
|-----------|-------------|
| New assembly in GA, never released | Appears as empty placeholder with warning |
| Long-lead component, later moved to proper location | Flat qty unchanged; hierarchical shows relocation |

## 5.4 Quantity and Key Changes

| Edge Case | Requirement |
|-----------|-------------|
| Quantity change at intermediate level | Multiplies through correctly |
| Quantity change combined with WIP | WIP branch frozen; qty change appears when restored |
| Same PN, different lengths | Distinct composite keys preserved |
| Length changes on same PN | Old key removed, new key added |

## 5.5 Common Components and True Deletion

| Edge Case | Requirement |
|-----------|-------------|
| Common component across branches, one branch WIP | Total qty unchanged (WIP branch contributes its frozen qty) |
| Assembly permanently removed | Correctly classified as "Removed" (not frozen) |

## 5.6 Error Conditions

| Edge Case | Requirement |
|-----------|-------------|
| Circular reference (A1 contains A2 contains A1) | Detect and error; prevent infinite loop |
| GA itself is WIP | Refuse to process; GA must be released |

---

# 6. Solution Options

Three approaches have been identified. All achieve the same outcome—accurate IFP BOMs with WIP branches frozen—through different mechanisms.

## 6.1 Option 1: Modified BOM Tool with WIP Detection

**Approach:** Modify the existing BOM comparison tool to detect WIP assemblies via PDM state metadata, graft last-known-good branches from the prior IFP artifact, and produce a new official IFP BOM.

**Key Mechanism:**
- WIP assemblies are left **unsuppressed** so they appear in the PDM export with state metadata
- Tool walks the tree top-down; first WIP assembly encountered triggers a graft of that entire branch from B(n-1)
- Output is B(n)—the official IFP BOM artifact
- The chain of B(n) files serves as the historical record

**Process Change:** Suppression is reserved for true deletion only. Engineers leave WIP assemblies unsuppressed and rely on the tool to handle WIP exclusion.

**Pros:**
- Works within existing PDM export workflow
- No new database infrastructure required
- Tool already exists; requires modification, not creation

**Cons:**
- Requires code changes to BOM tool
- Requires SOP change (no suppression for WIP)
- Each B(n) file carries the full tree (some redundancy)

**Status:** PRD complete. See *IFP BOM Merge Tool — Product Requirements Document* for detailed specification.

## 6.2 Option 2: Reference Chain Model via NetSuite

**Approach:** Leverage NetSuite's existing reference chain architecture. Each assembly's immediate-children BOM is already pushed to NetSuite on IFP/IFU. Create a custom script to recursively generate an extended BOM from NetSuite's data.

**Key Mechanism:**
- Revise XML import script to create separate line items per PN-Length instance (resolves the length aggregation issue)
- Revise import script to incorporate all required metadata fields
- Re-export all assembly items from PDM to rebuild BOMs with new configuration
- Create custom NetSuite script that recursively generates an extended BOM with metadata
- When ready for IFP release, generate extended BOM from NetSuite for the GA

**Process Change:** IFP BOM artifact is generated from NetSuite, not PDM. PDM remains the source of design data; NetSuite becomes the source of released BOM data.

**Pros:**
- Infrastructure largely exists; NetSuite already maintains reference chains
- PN-Length issue is solvable with script modification
- Natural separation of WIP (not in NetSuite) from released (in NetSuite)

**Cons:**
- Requires script development (import modification + export script)
- Requires re-export of all existing assemblies to rebuild BOMs
- Dependency on NetSuite availability and performance

**Status:** Feasibility confirmed through testing. Requires development work with NetSuite team.

## 6.3 Option 3: Reference Chain Model via New Database

**Approach:** Build a new independent database that mirrors NetSuite's reference chain architecture but is purpose-built for IFP BOM management.

**Key Mechanism:**
- Each assembly exports immediate-children XML to the new database on IFP/IFU (same trigger as NetSuite)
- Database stores one record per assembly-release with its immediate children
- Custom script recursively resolves the chain and generates extended BOM
- Hosted database with file ingestion and user access for IFP generation

**Process Change:** New system to maintain alongside PDM and NetSuite.

**Pros:**
- Purpose-built; no constraints from existing systems
- Full control over data model and export format
- Clean separation of concerns

**Cons:**
- Most infrastructure to build
- Another system to maintain
- Duplicates capability that NetSuite could provide

**Status:** Conceptually validated. Requires significant development if pursued.

---

# 7. Open Questions

## 7.1 Option Selection Criteria

| Factor | Option 1 | Option 2 | Option 3 |
|--------|----------|----------|----------|
| Development effort | Medium | Medium | High |
| Infrastructure change | Low | Low | High |
| SOP change required | Yes (suppression) | Minimal | Minimal |
| Time to implement | Shortest | Medium | Longest |
| Long-term maintainability | Tool-dependent | Leverages existing system | New system to maintain |

## 7.2 Items Requiring Decision

1. **Which option to pursue?** Option 1 appears nearest to reach; Option 2 leverages existing infrastructure; Option 3 is cleanest but most work.

2. **PN-Length handling in Option 2:** Confirmed feasible, but requires validation of full workflow including comparison output.

3. **DC Bypass governance:** All options rely on Document Control's ability to release GA when children are WIP. Current process is adequate but should be documented.

4. **Migration strategy:** How to handle existing projects and historical IFP revisions during transition?

---

# 8. Appendix: Example BOM Progressions

## 8.1 Baseline Structure (IFP REV0)

```
GA (L0)
├── A1 (1) [L1]
│   ├── A5 (2) [L2]
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1) [L1]
│   ├── A6 (1) [L2]
│   │   ├── C1 (2)
│   │   └── C5 (1)
│   └── C6 (3)
└── C7 (2) [Component at L1]
```

**Flat BOM (REV0):**

| Composite Key | Calculation | Total Qty |
|---------------|-------------|-----------|
| C1 | (1×2×3) + (1×1×2) | 8 |
| C2-5.5" | 1×2×2 | 4 |
| C3 | 1×4 | 4 |
| C4 | 1×1 | 1 |
| C5 | 1×1×1 | 1 |
| C6 | 1×3 | 3 |
| C7 | 2 | 2 |

## 8.2 IFP REV1 — Correct Output (A1 WIP, A3 Added)

**What the IFP BOM should contain:**
```
GA
├── A1 (1)              ← frozen from REV0
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
├── A3 (1)              ← new
│   ├── C8 (2)
│   └── C9 (1)
└── C7 (2)
```

**Correct Comparison (REV1 vs REV0):**

| Item | Classification |
|------|----------------|
| A3 | Added |
| C8 | Added |
| C9 | Added |
| All others | Unchanged |

## 8.3 IFP REV2 — A1 Restored with Changes

**After A1 completes revision (A5 qty changed 2→3):**
```
GA
├── A1 (1)
│   ├── A5 (3)          ← qty now 3
│   │   ├── C1 (3)
│   │   └── C2-5.5" (2)
│   ├── C3 (4)
│   └── C4 (1)
├── A2 (1)
│   └── ...
├── A3 (1)
│   └── ...
└── C7 (2)
```

**Correct Comparison (REV2 vs REV1):**

| Item | Classification | Detail |
|------|----------------|--------|
| A5 (under A1) | Changed | Qty 2→3 |
| C1 (flat) | Changed | 8→11 (gained 3 from additional A5) |
| C2-5.5" (flat) | Changed | 4→6 |
| All others | Unchanged | — |

---

*Document Version: 2.0*
*Companion Documents: Reference Chain Model Solution Specification, IFP BOM Merge Tool PRD*
*Status: Problem characterized; solution options identified*