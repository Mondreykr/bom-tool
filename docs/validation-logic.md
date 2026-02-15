# BOM Validation Logic Reference

This document captures the complete validation logic for IFP (Issued for Purchasing) BOM artifacts. It covers rules enforced by the BOM Tool and rules relevant to PDM-NetSuite integration that require manual or future automated enforcement.

## Purpose

This reference serves as the single source of truth for all BOM validation logic across IFP workflows. It is used by:
- **Operations engineers** reviewing BOM artifacts for procurement and work orders
- **PDM administrators** troubleshooting BOM release issues
- **NetSuite integration developers** building custom solutions for PDM-NS data exchange
- **Quality engineers** auditing BOM data integrity

## Terminology

**GA (General Assembly):** The root node of the BOM tree. This is the top-level assembly that represents the complete product being released.

**X(n):** The current source export from PDM (XML format). This contains the latest BOM structure and metadata as recorded in SOLIDWORKS PDM.

**B(n-1):** The prior IFP artifact (JSON format). This is the previously approved and released BOM artifact for the same assembly, if one exists.

**B(n):** The new IFP artifact produced by the merge engine. This combines current data from X(n) with approved content from B(n-1) where applicable.

**Released:** A component whose state is "Issued for Purchasing" (IFP) or "Issued for Use" (IFU). These are the only two states considered approved for production use.

**WIP (Work In Progress):** Any component whose state is NOT "Issued for Purchasing" or "Issued for Use". All other states (In Design, In Review, Awaiting Release, etc.) are WIP by exclusion.

**NS Item Type:** The authoritative field in PDM for determining whether a node is an assembly or a non-assembly item. This field comes from the NetSuite Item Type metadata in SOLIDWORKS PDM.

**Graft point:** A WIP assembly in the X(n) tree where the merge engine substitutes approved content from B(n-1) instead of using the current WIP structure. This preserves the approved BOM structure while allowing the parent assembly to reference an updated revision.

## Assembly Identification

The **NS Item Type** field is the authoritative source for determining whether a node is an assembly or a non-assembly item. DO NOT use Component Type for this purpose.

**Assembly identification rules:**
- `NS Item Type = "Assembly"` → This node is an assembly (it may have children)
- `NS Item Type = "Inventory"` → This node is a non-assembly item (leaf node)
- `NS Item Type = "Lot Numbered Inventory"` → This node is a non-assembly item (leaf node)

**Why not Component Type?**

The Component Type field is NOT reliable for assembly identification. Real PDM data contains cases where:
- `Component Type = "Manufactured"` but `NS Item Type = "Assembly"` and the item has children in the BOM tree

This inconsistency occurs because Component Type is a legacy field that may not be kept in sync with the authoritative NetSuite metadata. All BOM processing logic must use NS Item Type as the single source of truth.

## Validation Rules (Enforced by BOM Tool)

These rules are checked automatically by the BOM Tool before allowing an IFP merge. If any rule is violated, the merge is blocked and the user must fix the issues in PDM before proceeding.

### Scope

Validation rules apply **only on the IFP Merge tab** when loading XMLs for merge. Other tabs (Flat BOM, Comparison, Hierarchy) do not enforce these rules — they are viewing/comparing tools and should not block loading.

### Rule 0: GA Must Be Released

**Rule:** The root assembly (GA) must have a Released state (IFP or IFU). A WIP GA blocks the merge.

**Applies to:** All revisions (REV0 through REVn)

**Rationale:** The GA represents the complete product. If the GA itself is not approved, the entire BOM artifact is invalid.

**Error message format:**
```
GA {PartNumber} has WIP state '{StateName}' — Release GA in PDM before creating IFP artifact
```

**Fix action:** Change the GA's state in PDM to "Issued for Purchasing" (IFP) or "Issued for Use" (IFU), then re-export the BOM.

### Rule 1: No WIP Non-Assembly Items Under Released Assemblies

**Rule:** Any non-assembly child (NS Item Type != "Assembly") of a Released assembly must also be Released. WIP non-assembly items under Released assemblies block the merge.

**Applies to:** All depths in the tree, recursively checked for every Released assembly

**Rationale:** PDM does not enforce this constraint when an assembly is set to IFP state. However, a Released assembly with WIP parts cannot produce a valid procurement BOM. All parts directly under a Released assembly must be approved.

**Error message format:**
```
{AncestorPath} > {PartNumber}: WIP non-assembly item under released assembly — Release {PartNumber} in PDM before creating IFP artifact
```

Example:
```
GA-12345 > ASSY-A-100 > PART-X-200: WIP non-assembly item under released assembly — Release PART-X-200 in PDM before creating IFP artifact
```

**Fix action:** Release the WIP part in PDM (change state to IFP or IFU), then re-export the BOM.

### Rule 2: Released Assembly Must Have Released Content

**Rule:** If a Released assembly contains ONLY sub-assembly children (no non-assembly items) AND all those sub-assemblies are WIP, the merge is blocked. At least one child must be Released.

**Applies to:** Released assemblies at any depth

**Rationale:** A Released assembly with no usable content (all children are WIP assemblies) cannot produce a meaningful IFP artifact section. It would be an empty shell with no parts or approved sub-assemblies.

**Valid scenarios:**
- Released assembly with at least one Released non-assembly child → VALID (WIP sub-assemblies become graft points)
- Released assembly with at least one Released sub-assembly child → VALID (WIP sub-assemblies become graft points)
- Released assembly with mixed Released and WIP children → VALID

**Invalid scenario:**
- Released assembly with ONLY sub-assembly children, ALL of which are WIP → BLOCKED

**Error message format:**
```
{AncestorPath}: Released assembly has no released content — all sub-assemblies are WIP
```

**Fix action:** Release at least one of the WIP sub-assemblies in PDM, OR add at least one Released non-assembly part to the assembly.

### Missing NS Item Type

**Rule:** If any node in the BOM tree is missing the NS Item Type field, the merge is blocked.

**Applies to:** All nodes at all depths

**Rationale:** Cannot determine whether a node is an assembly or non-assembly without the NS Item Type field. Cannot apply validation rules without knowing the node type.

**Error message format:**
```
Missing NS Item Type on {PartNumber} at {AncestorPath} — cannot validate without knowing node type
```

**Fix action:** Update the part's NetSuite metadata in PDM to include the NS Item Type field, then re-export the BOM.

## Metadata Validation Rules

Metadata validation (Rules 3–9) runs on **every node** in the BOM tree before merge-level validation (Rules 0–2). These rules ensure that each item's metadata is complete, correctly formatted, and internally consistent before the merge engine processes the tree.

All metadata rules are **hard blocks** — the same enforcement level as Rules 0–2. Invalid metadata blocks the merge.

### Rule 3: Part Number Format

**Rule:** Part Number must match one of these exact patterns:

| Pattern | Example | Description |
|---|---|---|
| `1xxxxxx` | 1000123 | 7-digit starting with 1 |
| `1xxxxxx-xx` | 1000123-01 | 7-digit with 2-digit suffix |
| `1xxxxxx-xx-x` | 1000123-01-1 | 7-digit with 2-digit and 1-digit suffix |
| `2xxxxx` | 251111 | 6-digit starting with 2 |
| `3xxxxx` | 301111 | 6-digit starting with 3 |

Where `x` = single digit (0–9), hyphens are literal.

**Regex:** `^(1\d{6}(-\d{2}(-\d)?)?|[23]\d{5})$`

**Error message format:**
```
{PartNumber} at {AncestorPath}: Part number does not match expected format (1xxxxxx, 2xxxxx, or 3xxxxx)
```

**Fix action:** Correct the part number in PDM to match the expected format, then re-export the BOM.

### Rule 4: Description Required

**Rule:** Description must not be empty or blank.

**Error message format:**
```
{PartNumber} at {AncestorPath}: Description is empty — every part must have a description
```

**Fix action:** Add a description to the part in PDM, then re-export the BOM.

### Rule 5: Revision Must Be Integer — SUSPENDED

> **Status:** SUSPENDED — This rule is commented out in code and not enforced.
>
> **Reason:** Many BOM items (weldment cut-list items, hardware) have blank or non-integer revisions in SOLIDWORKS PDM exports, causing excessive false-positive validation errors. The rule code is preserved in validate.js and can be restored when PDM data quality improves.

**Rule (when active):** Revision must be a whole number (e.g., "1", "2", "15"). Non-numeric or decimal values are not allowed.

**Error message format (when active):**
```
{PartNumber} at {AncestorPath}: Revision '{Value}' is not a valid integer
```

### Rule 6: NS Item Type Whitelist

**Rule:** NS Item Type must be exactly one of:
- `Inventory`
- `Lot Numbered Inventory`
- `Assembly`

This strengthens the existing missing-NS-Item-Type check to also reject unexpected values. A missing value is still caught separately; this rule catches values that are present but invalid.

**Error message format:**
```
{PartNumber} at {AncestorPath}: NS Item Type '{Value}' is not a recognized type (expected Inventory, Lot Numbered Inventory, or Assembly)
```

**Fix action:** Update the NS Item Type in PDM to one of the recognized values, then re-export the BOM.

### Rule 7: Component Type Whitelist

**Rule:** Component Type must be exactly one of:
- `Purchased`
- `Manufactured`
- `Raw Stock`
- `Assembly`

**Error message format:**
```
{PartNumber} at {AncestorPath}: Component Type '{Value}' is not a recognized type (expected Purchased, Manufactured, Raw Stock, or Assembly)
```

**Fix action:** Update the Component Type in PDM to one of the recognized values, then re-export the BOM.

### Rule 8: Unit of Measure Whitelist

**Rule:** Unit of Measure must be exactly one of:
- `ea`
- `in`
- `sq in`

**Error message format:**
```
{PartNumber} at {AncestorPath}: Unit of Measure '{Value}' is not recognized (expected ea, in, or sq in)
```

**Fix action:** Update the Unit of Measure in PDM to one of the recognized values, then re-export the BOM.

### Rule 9: Cross-Field Consistency

**Rule:** Certain field combinations must be consistent based on the NS Item Type value. These sub-rules catch metadata that passes individual field checks but is logically contradictory.

**If NS Item Type = "Inventory":**
- UoM must be `ea`
- Length must be empty or `-`
- Component Type must be `Purchased` or `Manufactured`

**If NS Item Type = "Assembly":**
- UoM must be `ea`
- Length must be empty or `-`
- Component Type must be `Assembly` or `Manufactured`

**If NS Item Type = "Lot Numbered Inventory":**
- UoM must be `in` or `sq in`
- Length must be a decimal number, optionally with "in" suffix (e.g., "12", "12.01", "12.01in")
- Component Type must be `Raw Stock`

**Error message format:**
```
{PartNumber} at {AncestorPath}: {FieldName} '{Value}' is not valid for NS Item Type '{NSItemType}' (expected {ExpectedValues})
```

**Fix action:** Update the inconsistent field(s) in PDM to match the expected values for the item's NS Item Type, then re-export the BOM.

## Validation Logic Table

This table summarizes how validation rules are applied based on parent state, child type, and child state.

| Parent State | Child NS Item Type | Child State | Valid? | Action |
|---|---|---|---|---|
| Released | Non-assembly | Released | YES | Pass through (from X(n), tagged as "current") |
| Released | Non-assembly | WIP | **NO** | Block — Rule 1 violation |
| Released | Assembly | Released | YES | Continue checking this child's children recursively |
| Released | Assembly | WIP | YES* | Graft point (content from B(n-1)) or empty placeholder (REV0) |
| WIP | any | any | N/A | WIP parent is a graft point; all children sourced from B(n-1) |

**Note on WIP sub-assemblies (*):** A WIP sub-assembly under a Released parent is valid ONLY if the parent has at least one other Released child (non-assembly or sub-assembly). If ALL children are WIP sub-assemblies with NO non-assembly items, the parent violates Rule 2 and the merge is blocked.

**Validation order:** Metadata validation (Rules 3–9) runs on every node first, before merge-level validation (Rules 0–2). This ensures all field values are valid before the merge engine evaluates tree structure and state relationships.

## Error Handling

**Completeness:** The BOM Tool validation walks the entire tree and collects ALL errors before blocking. This allows users to see every issue at once and fix them all in a single PDM session, rather than discovering problems one at a time.

**Error details:** Each error message includes:
- **Full ancestor path:** Shows exactly where in the BOM tree the issue was found (e.g., "GA > Assy A > Part X")
- **Part number:** The specific component with the problem
- **Rule violated:** Which validation rule was triggered (for debugging and learning)
- **Suggested fix action:** Clear guidance on how to resolve the issue in PDM

**Display format:** Multiple errors are shown as a flat numbered list in the BOM Tool UI, allowing users to address them systematically. Metadata errors (Rules 3–9) are collected alongside merge errors (Rules 0–2) — the user sees all issues at once.

**Validation timing:** Validation runs automatically when an XML file is loaded into the IFP Merge tab. Users see validation errors immediately, before attempting a merge. Loading a new file auto-clears previous errors and re-validates the new file.

## Rules NOT Enforced by BOM Tool (Future PDM Custom Solutions)

These rules are NOT checked by the BOM Tool but are relevant to PDM-NetSuite integration and future custom solutions.

### WIP Assembly Metadata Reliability

**Issue:** WIP sub-assemblies that become graft points may have unreliable or incomplete metadata in the PDM export (Part Number, UoM, NS Item Type, Description, Component Type).

**Why the BOM Tool is unaffected:** The BOM Tool's merge engine uses graft content from B(n-1) at WIP assembly boundaries. Since B(n-1) contains approved metadata from the prior release, the tool never relies on the WIP assembly's current metadata from X(n).

**Why this matters for PDM-NS integration:** A custom PDM solution that reads the current PDM export (X(n)) directly and pushes BOM data to NetSuite would use the unreliable WIP metadata, potentially creating invalid NetSuite records.

**Future enforcement:** A PDM custom solution should block BOM issuance (prevent state change to IFP) when child assembly metadata fields are missing, empty, or inconsistent. This would ensure clean data for direct PDM-NS synchronization.

### Component Type Consistency

**Issue:** The Component Type field sometimes does not match the NS Item Type field. For example, a node may have `Component Type = "Manufactured"` but `NS Item Type = "Assembly"`.

**Why the BOM Tool is unaffected:** The BOM Tool uses NS Item Type exclusively for assembly identification, so Component Type inconsistencies do not affect merge logic or output.

**Why this matters:** Other PDM workflows, reports, or integrations may rely on Component Type for filtering or categorization. Inconsistent data could confuse these systems or produce incorrect results.

**Future enforcement:** A PDM data quality check (perhaps during BOM issuance workflow) could validate that Component Type aligns with NS Item Type and block release if they conflict. This would improve overall data cleanliness for downstream consumers.

## Revision Behavior

The same validation rules apply to ALL revisions (REV0 through REVn). There is no difference in validation logic between first-time release and subsequent revisions.

**What differs by revision:**
- **REV0 (no prior artifact):** If validation passes and a WIP assembly is found, it becomes an empty placeholder in B(0). The node exists in the tree with zero children, preserving structure and making gaps visible.
- **REV1+ (has B(n-1)):** If validation passes and a WIP assembly is found, it becomes a graft point. The WIP assembly node and all its children are sourced from B(n-1), preserving the approved structure.

**What is the same:**
- Rule 0 (GA must be Released) applies to all revisions
- Rule 1 (no WIP non-assembly items) applies to all revisions
- Rule 2 (Released assembly must have Released content) applies to all revisions
- Missing NS Item Type blocks merge for all revisions

The validation happens BEFORE the merge engine decides how to handle WIP assemblies, so the rules are identical regardless of whether B(n-1) exists.

## Document History

| Date | Change |
|---|---|
| 2026-02-12 | Initial version — captures rules as implemented in BOM Tool v2.2 |
| 2026-02-14 | Added metadata validation rules (Rules 3–9) for Phase 14.1 implementation — Part Number format, Description required, Revision integer, NS Item Type/Component Type/UoM whitelists, cross-field consistency |

---

**Note:** This document is a reference for engineering and PDM administration. It is NOT auto-generated from code. Update this document manually when validation rules change or new rules are added to the BOM Tool.
