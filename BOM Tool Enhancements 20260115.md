# BOM Tool Enhancements Only (IFP process dropped from scope)

**Date:** January 14, 2026 

---

## 5. Tool Enhancements (Strategic)

Two enhancements address remaining gaps. A third new function adds visibility.

### Enhancement 1: Scoped Comparison

**Problem solved:** ERP Coordinator needs to see “just A2’s component delta” without the noise of A1 and A3. Currently requires finding separate A2 XMLs, which may not exist.

**Solution:** After loading two GA XMLs, display the assembly hierarchy (default collapsed) for each. User selects which assembly branch to compare. Default comparison if nothing is selected is full GA (same as BOM Tool 2 behavior). Tool flattens only the selected branch in each XML, then compares.

**Key UX decisions:**

- Hierarchy display is collapsible, default collapsed to top-level children
- Part number mismatch allowed with confirmation notice
- Comparison always at Qty 1 of selected scope
- Export respects selected scope
- Implement a Reset button which undoes the compare and resets back to collapsed but leaves the content of the two files that are uploaded (this is different than Start Over command which is already present, which dumps out all uploaded files/data to a fresh empty tool state)

### Enhancement 2: Hierarchy View (New Tab)

**Problem solved:** No easy way to visualize BOM structure. The XML is unreadable. Users want to see the nested hierarchy with quantities without flattening.

**Solution:** New third tab. Load one XML. Display nested tree structure. Each line shows Part Number, Revision, Quantity, Description, Component Type. Expandable/collapsible. Export preserves hierarchy.

**Key UX decisions:**

- Default collapsed to top level (GA’s immediate children)
- Component Type distinguishes assemblies (expandable) from components (leaf nodes)
- Both components and assemblies shown (no toggle to hide components)
- Export preserves full hierarchy in structured format
- Add an Expand/Collapse all button or something like that where you can easily function the whole list open/closed to the starting point

### Enhancement 3: Export File Naming

I think the uploaded file (which will most often be the `Job Number-IFP REV#.xml` format) needs to have its name present somehow, almost more prominent than the current situation where its the top level assembly’s Description and Revision which are what show most prominently. I want the assembly Description and Revision to still be there, but they should be somewhat secondary to the File Name of the files uploaded into the tool, whether for flat BOM or for Comparison. And then the export functions need to use the File Names over the assembly part number and rev. The same logic applies to both Flat BOM and Comparison exports - use the filename not the assembly part number and description and rev.

- ensure BOM Comparison shows FILE NAME comparison
- ensure HTML Output (for BOM Comparison) shows FILE NAME as well as intenral assembly PN, Desc. and PN Rev
- WHY?
    - because we’re “gate” releasing via Job Centric IFP Revs
    - **e.g. `1J258730-IFP REV0 vs 1J258730-IFP REV1.html` — I want it to show this.**
- Note: I don’t have more detail spelled out below yet in the technical section for this Enhancement 3.

---

## 6. Tool Enhancements (Technical Specification)

This section provides requirements for implementation. The implementing session will have access to the existing tool code and the original handoff document for code-level context.

### 6.1 Data Structure Requirements

**Current state:** The tool parses XML into a hierarchical tree structure, then immediately flattens for comparison. The tree structure exists transiently but is not exposed to UI.

**Required change:** Retain the parsed tree structure through the comparison workflow. Expose it for:

1. Rendering assembly hierarchy in comparison setup UI
2. Selective branch extraction for scoped comparison
3. Rendering full hierarchy in new Hierarchy View tab

**Tree node structure (conceptual):**

```
{
  partNumber: string,
  revision: string,
  description: string,
  quantity: number,
  lengthDecimal: number | null,
  componentType: string,  // "Manufactured", "Purchased", "Raw Stock"
  children: [TreeNode]    // Empty array for components
}

```

The existing `buildTree()` function likely produces something similar. Confirm structure and ensure it’s preserved rather than discarded after flattening.

### 6.2 Enhancement 1: Scoped Comparison

### Workflow Changes

**Current flow:**

1. Upload Old BOM → parse and store
2. Upload New BOM → parse and store
3. Click Compare → flatten both, compare, display results

**New flow:**

1. Upload Old BOM → parse and store tree
2. Upload New BOM → parse and store tree
3. **New: Display assembly hierarchy selection UI**
4. User selects scope (default: root GA)
5. Click Compare → extract selected branches, flatten those, compare, display results

### Assembly Hierarchy Selection UI

**Layout:** Two side-by-side collapsible trees (one per loaded XML)

**Content per tree:**

- Each line: Part Number, Revision, Quantity
- Indentation indicates nesting level
- Expand/collapse toggle per assembly node

**Default state:** Collapsed

**Selection behavior:**

- Click an assembly to select it (highlight)
- One selection per side
- If nothing selected, comparison uses root (full GA)
- Selection is independent per side (allows mismatch)

**Mismatch handling:**

- If selected part numbers differ, display notice: “Selected assemblies have different part numbers. Comparison may not be meaningful. Continue?”
- User confirms or cancels
- This is a soft warning, not a hard block

### Scoped Flattening

When user clicks Compare:

1. Get selected node from left tree (or root if none selected)
2. Get selected node from right tree (or root if none selected)
3. Extract subtree from each starting at selected node
4. Flatten each subtree at Qty 1 (selected node treated as root, its quantity = 1)
5. Proceed with existing comparison logic on the two flat lists

**Note on quantities:** The selected assembly’s own quantity (as stated in its parent) is ignored. The subtree is flattened as if you’re building 1× of the selected assembly. This keeps comparison results as structural deltas.

### Export Behavior

Excel and HTML exports should:

- Include metadata indicating selected scope (e.g., “Comparison Scope: A2-Rev0 vs A2-Rev1”)
- Export only the scoped comparison results, not full GA

### 6.3 Enhancement 2: Hierarchy View Tab

### New Tab

Add third tab: “Hierarchy View” (or “BOM Structure” or similar)

**Tab subtitle:** “Upload a hierarchical BOM (CSV or XML) to view its structure”

### Upload

Same upload pattern as Flat BOM tab:

- Drag-and-drop or click-to-browse
- Accept CSV or XML
- Parse into tree structure

### Display

**Layout:** Single collapsible tree

**Content:**

- All nodes (assemblies and components)
- Each line: Part Number | Revision | Quantity | Description | Component Type
- Indentation indicates nesting level
- Assemblies have expand/collapse toggle
- Components are leaf nodes (no toggle)

**Visual distinction:**

- Component Type column differentiates assemblies from components
- Assemblies are expandable; components are not
- Consider subtle styling difference (e.g., assemblies bold, components normal weight)

**Default state:** Collapsed—only GA’s immediate children visible

**Interaction:** Click expand/collapse icon to toggle assembly nodes (Consider an Expand/Collapse All function at the top. Everything should start collapsed, including sub assemblies so that each expansion which reveals a subassembly would show that subassembly is also collapsed and needs to be toggled to expand if the user wanted.)

### Export

**Formats:** Excel (.xlsx) and HTML (matching existing export patterns)

**Structure:** Preserve hierarchy in export

**Excel approach:**

- Indentation column (Level: 1, 1.1, 1.2, 1.1.1, etc.) OR
- Indent Part Number text with spaces/padding based on level
- All columns: Level, Part Number, Revision, Quantity, Description, Component Type

**HTML approach:**

- Nested structure using indentation or nested divs
- Match styling of existing HTML exports
- Fully expanded (no collapse state in static HTML) — can toggles be preserved in the export?

**Filename pattern:** `[PartNumber]-Rev[Revision]-Hierarchy-[YYYYMMDD].xlsx` (or .html)

### 6.4 Edge Cases

| Scenario | Handling |
| --- | --- |
| Same part number at different tree locations (e.g., C5 in both A4 and A5) | Appears in both locations in hierarchy view. In comparison, flattened quantities aggregate correctly as current tool does. |
| Assembly suppressed in one XML, present in other | Appears as structural difference—missing from one tree. If selected for comparison, warn user one side has no match. |
| Empty selection on one side, valid selection on other | Compare full tree on unselected side vs selected branch on other. Likely produces large delta. Allow with no special warning. |
| Deeply nested structure (10+ levels) | Collapsible tree handles this. Performance should be fine for typical BOM sizes (<2000 items). |
| XML with only components (no sub-assemblies) | Tree has only root with component children. Hierarchy view shows flat list. Scoped selection only has root available. |

### 6.5 UI Component Notes

**Collapsible tree implementation:**

- Use standard expand/collapse pattern (visually appropriate toggle/arrow)
- Indent child nodes (suggest 16-24px per level)
- Maintain consistent row height for scannability

**Selection highlighting:**

- Clear visual indicator for selected assembly (background color or border)
- Only one selection active per tree

**Responsive behavior:**

- Horizontal scroll for wide content (long part numbers/descriptions)
- Maintain readability at reasonable viewport sizes