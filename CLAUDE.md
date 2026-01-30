# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BOM Tool 2.1** - A single-file web application (~3500 lines) for flattening, comparing, and visualizing hierarchical Bills of Materials (BOMs) from SOLIDWORKS PDM exports. The entire application is self-contained in one HTML file with embedded CSS and JavaScript. Production-ready and validated against legacy Excel tools.

### Core Functions

1. **Flatten BOM**: Converts multi-level hierarchical BOMs into flat single-level BOMs with aggregated quantities
2. **Compare BOMs**: Compares two BOM revisions and identifies all changes (Added, Removed, Changed items). Supports scoped comparison of any selected sub-assembly or part.
3. **Hierarchy View**: Displays BOM structure as an expandable/collapsible tree with proper connector lines

## User Context

- **User has zero coding experience** - provide clear explanations and be patient with git/development concepts
- **First time using Claude Code CLI** - guide through file operations and command usage
- **Prefers learning by doing** - keep explanations concise and practical, avoid lengthy theory
- **Manual version control background** - previously used numbered file copies (e.g., "BOM Tool 2.0-1", "BOM Tool 2.0-2")
- **New to git** - will need hand-holding with git commands and concepts

## Repository Structure

```
PDM BOM 2.1/
├── BOM Tool.html                      # Main application (single file)
├── BOM Tool Handoff 20251209.md       # Complete documentation
├── BOM Tool Enhancements 20260115.md  # Enhancement requirements (3 features)
├── CLAUDE.md                          # This file
├── context.md                         # User/project context
├── test/                              # Automated test harness
│   ├── run-tests.js                   # Node.js test runner
│   ├── inspect-excel.js               # Excel file inspection utility
│   └── package.json                   # Test dependencies (xlsx, xmldom)
└── test-data/                         # Test input/output files
    ├── BOM Tool 2.1 Validation Testing Plan 20260115.md
    └── [XML, CSV, XLSX test files]
```

## Testing and Development

### How to Test Changes

1. **No build process required** - Open the HTML file directly in browser
2. **Testing**: Make edits → Save → Refresh browser
3. **Recommended workflow**:
   ```bash
   # Before changes
   git add "BOM Tool.html"
   git commit -m "Before [description of change]"

   # Make your edits to the file

   # Test in browser (open/refresh the HTML file)

   # After verifying it works
   git add "BOM Tool.html"
   git commit -m "Implement [description of what changed]"
   ```

### Browser Testing

- Works in Chrome, Edge, Firefox, Safari
- Requires internet connection for CDN resources (SheetJS, Google Fonts)
- All processing happens client-side (private, no data sent to servers)

## Architecture Overview

### File Structure (~3500 lines)

```
BOM Tool.html
├── <head>
│   ├── SheetJS library (CDN: xlsx v0.18.5)
│   └── <style> (~750 lines of CSS)
├── <body>
│   ├── Header
│   ├── Tab Navigation (Flat BOM | BOM Comparison | Hierarchy View)
│   ├── Tab 1: Flat BOM UI
│   ├── Tab 2: BOM Comparison UI
│   ├── Tab 3: Hierarchy View UI
│   └── <script> (~2700 lines of JavaScript)
```

### Technology Stack

- **HTML5/CSS3/JavaScript ES6+**
- **External Library**: SheetJS (xlsx.js) v0.18.5 for Excel export
- **Fonts**: JetBrains Mono (monospace), Work Sans (body) via Google Fonts
- **No framework** - Pure vanilla JavaScript
- **No backend** - Fully client-side processing

### Design System

- **Primary color**: `#1e40af` (blue)
- **Gray scale**: `--gray-50` through `--gray-900`
- **Layout**: Card-based with subtle shadows
- **Background**: Grid pattern (#fafafa)
- **Fonts**: JetBrains Mono for data/code, Work Sans for UI text

## Core Processing Pipeline

### 1. File Parsing

**CSV Parsing**:
- Detects UTF-16LE encoding with BOM
- Uses SheetJS to handle quoted fields and delimiters
- Converts to array of row objects

**XML Parsing**:
- Uses native DOMParser
- Recursively traverses `<transaction><document><configuration>` hierarchy
- Generates Level numbering (1, 1.1, 1.1.1) to match CSV structure
- Extracts attributes from each configuration

### 2. Tree Building (`buildTree()`)

```javascript
// Parse Level column to determine parent-child relationships
// Level "1" = root assembly
// Level "1.1" = child of 1
// Level "1.1.1" = child of 1.1
// Build hierarchical tree: BOMNode { level, partNumber, qty, children[], ... }
```

**Key function**: `getParentLevel(level)` - Extracts parent from level string

### 3. BOM Flattening (`flattenBOM()`)

```javascript
// Recursive depth-first traversal
// Multiply child quantities by parent quantity
// Aggregate by composite key: PartNumber|Length
// Skip Assembly type items (they're containers, not purchasable)
//
// Example: Assembly (Qty 2) contains Part A (Qty 3)
//          Flattened: Part A Qty = 2 × 3 = 6
```

**Critical details**:
- **Composite Key**: `"PartNumber|Length"` or `"PartNumber|"` (if no length)
  - Parts with same Part Number but different Lengths are separate items
  - Enables proper aggregation of cut-to-length raw stock
- **Assembly exclusion**: Component Type "Assembly" items are excluded from output
- **Description concatenation**: If Material field exists (and not "-"), appends to Description

### 4. Fractional Length Conversion (`decimalToFractional()`)

```javascript
// Rounds to nearest 1/16"
// Reduces fraction using GCD algorithm
// Formats with hyphen between whole and fraction
//
// Examples:
//   0.0625 → "1/16""
//   0.125 → "1/8"" (not 2/16")
//   2.25 → "2-1/4""
//   17.063 → "17-1/16""
```

### 5. BOM Comparison (`compareBOMs()`)

```javascript
// Create Maps with composite keys for both BOMs
// Compare item by item:
//   ADDED: In newBOM but not in oldBOM
//   REMOVED: In oldBOM but not in newBOM
//   CHANGED: In both but Qty/Description/Purchase Desc differs
//
// Track specific attributes that changed
```

### 6. Word-Level Diff (`createDiff()`)

For "Changed" items, descriptions are compared at word level:
- Removed words: Red background + strikethrough
- Added words: Green background
- Unchanged words: Normal display

## Important Data Structures

### BOMNode Class

```javascript
class BOMNode {
    level              // "1", "1.1", "1.1.1", etc.
    partNumber
    componentType      // "Manufactured", "Purchased", "Raw Stock", "Assembly"
    description
    material
    qty                // Reference count
    length             // Decimal (null if empty)
    uofm               // Unit of measure
    state
    purchaseDescription
    nsItemType
    revision
    children[]         // Array of child BOMNode objects
}
```

### Flattened Item Object

```javascript
{
    partNumber,
    componentType,
    description,        // Concatenated with material if present
    qty,                // Aggregated/rolled-up quantity
    lengthDecimal,      // Decimal length or null
    lengthFractional,   // "17-1/16"" format
    uofm,
    purchaseDescription,
    nsItemType,
    state,
    revision
}
```

### Comparison Result Object

```javascript
{
    changeType,              // "Added", "Removed", "Changed"
    partNumber,
    componentType,
    oldDescription,          // null if Added
    newDescription,          // null if Removed
    lengthDecimal,
    lengthFractional,
    oldQty,                  // null if Added
    newQty,                  // null if Removed
    deltaQty,                // difference (null for Added/Removed)
    oldPurchaseDescription,
    newPurchaseDescription,
    attributesChanged[]      // ["Qty", "Description", "Purchase Desc"]
}
```

## Tree Connector Line Algorithm (Hierarchy View)

The tree connector lines use an **ancestorContinues array** approach to correctly draw multi-level vertical lines:

```javascript
// ancestorContinues[i] = true means ancestor at depth i has more siblings after this subtree
function renderTreeNode(node, depth, isLastChild, ancestorContinues) {
    // For this row at depth D, draw:

    // 1. Vertical lines for depths 0 to D-2 (all ancestors except immediate parent)
    for (let i = 0; i < depth - 1; i++) {
        if (ancestorContinues[i]) {
            // Draw full-height vertical line at position i
        }
    }

    // 2. Vertical line for immediate parent (depth D-1)
    if (isLastChild) {
        // Draw half-height line (top to center) - L-shape └
    } else {
        // Draw full-height line - T-shape ├
    }

    // 3. Horizontal connector from parent to this item
    // Positioned at 1.5rem (aligns with text baseline, not row center)

    // 4. Parent downward line (if has children and expanded)
    // From toggle position (1.5rem) to bottom of row
    // Only visible when parent row has .expanded class

    // When recursing to children:
    const childAncestorContinues = [...ancestorContinues, !isLastChild];
}
```

**Key Rules:**
- Vertical line at depth D is drawn if ancestor at depth D has more siblings
- A single row can have multiple vertical lines (one for each ancestor that continues)
- Horizontal lines at 1.5rem (24px) to align with text baseline in tall rows
- Parent rows get `.expanded` class when children are visible, showing downward connector

## Key Global Variables

```javascript
// Flat BOM Tab
let csvData = null;              // Raw parsed CSV/XML rows
let flattenedBOM = null;         // Flattened result array
let rootPartNumber = null;       // Assembly part number
let rootRevision = null;         // Assembly revision
let rootDescription = null;      // Assembly description
let uploadedFilename = null;     // Uploaded filename for export naming

// BOM Comparison Tab
let oldBomData = null;           // Raw old BOM rows
let newBomData = null;           // Raw new BOM rows
let oldBomFlattened = null;      // Flattened old BOM
let newBomFlattened = null;      // Flattened new BOM
let oldBomInfo = {};             // { partNumber, revision, description }
let newBomInfo = {};
let comparisonResults = [];      // Array of comparison result objects
let currentFilter = 'all';       // Filter state: 'all', 'Added', 'Removed', 'Changed'

// Scoped Comparison (Enhancement 1)
let oldBomTree = null;           // Full tree for old BOM (for selection UI)
let newBomTree = null;           // Full tree for new BOM (for selection UI)
let oldSelectedNode = null;      // Selected node for scoped comparison (null = full GA)
let newSelectedNode = null;      // Selected node for scoped comparison (null = full GA)

// Hierarchy View Tab
let hierarchyTree = null;        // Tree structure (root BOMNode)
let hierarchyRootInfo = {};      // { partNumber, revision, description }
let hierarchyFilename = null;    // Uploaded filename for export naming
```

## Input Format Expectations

### CSV Format (SOLIDWORKS PDM Export)
- **Encoding**: UTF-16LE with BOM
- **Delimiter**: Tab or comma
- **Hierarchy**: Numeric "Level" column (1, 1.1, 1.2, 1.1.1, etc.)

### XML Format (SOLIDWORKS PDM Export)
```xml
<transaction>
  <document id="...">
    <configuration name="...">
      <attribute name="Part Number" value="..." />
      <attribute name="Description" value="..." />
      <!-- ... more attributes ... -->
      <references>
        <document id="...">
          <!-- Nested children -->
        </document>
      </references>
    </configuration>
  </document>
</transaction>
```

### Required Columns/Attributes
- Part Number
- Component Type (Manufactured, Purchased, Raw Stock, Assembly)
- Description
- Qty (Reference Count)
- Length (Decimal, optional)
- Purchase Description (optional, multi-line with `\n`)
- Unit of Measure
- State
- Revision
- NS Item Type

## Output Formats

### 1. Interactive Web View
- Sortable, scrollable tables
- Filter buttons (for comparison)
- Statistics dashboard
- Color-coded changes
- Line breaks displayed with CSS `white-space: pre-wrap`

### 2. Excel Export (.xlsx)
- Uses SheetJS `XLSX.writeFile()`
- Native `\n` line breaks preserved (Excel recognizes them)
- Filename format: `[PartNumber]-Rev[Revision]-Flat BOM-[YYYYMMDD].xlsx`
- Comparison format: `[OldPN]-Rev[OldRev]-vs-[NewPN]-Rev[NewRev]-Comparison-[YYYYMMDD].xlsx`

### 3. Static HTML Export
- Standalone HTML with embedded styling
- Google Fonts included via CDN
- Matches web interface design
- `\n` converted to `<br>` tags
- Same filename pattern as Excel with `.html` extension

## Common Editing Scenarios

### Adding New Columns to Output

1. Update `BOMNode` class (if needed for parsing)
2. Update `flattenBOM()` aggregation to include new field
3. Update `displayResults()` table headers and rows
4. Update Excel export column mapping
5. Update HTML export table structure
6. Update comparison logic if needed

### Modifying Flattening Logic

**Location**: `flattenBOM()` function (~line 1179)
- Recursive traverse function handles quantity multiplication
- Aggregation uses Map with composite keys
- Only non-Assembly items are added to output

### Changing Comparison Logic

**Location**: `compareBOMs()` function (~line 2013)
- Uses Maps for O(n) comparison
- Three categories: Added, Removed, Changed
- Change detection checks: qty, description, purchaseDescription

### Updating Styling

**Location**: `<style>` block (~lines 8-604)
- CSS custom properties in `:root` for colors
- Card-based layout system
- Responsive table with horizontal scroll
- Print-friendly media queries

## Git Workflow for This User

**Important**: Always provide explicit git commands and explain what they do.

### Before making changes:
```bash
git status                          # Check current state
git add "BOM Tool.html"             # Stage the file
git commit -m "Before [change]"     # Create safety checkpoint
```

### After making changes:
```bash
git diff                            # Review what changed
git add "BOM Tool.html"             # Stage all changes
git commit -m "Implement [feature]" # Commit with clear description
```

### Viewing history:
```bash
git log --oneline                   # See recent commits
git log --oneline -10               # See last 10 commits
git show <commit-hash>              # See specific change details
git diff HEAD~1 HEAD                # Compare last commit with current
```

### Undoing changes (use with caution):
```bash
git checkout "BOM Tool.html"        # Discard uncommitted changes
git revert <commit-hash>            # Undo a specific commit (safe)
git reset --hard HEAD~1             # Undo last commit (DESTRUCTIVE)
```

## Working with This Project

1. **Always read handoff document first** - Contains business logic, validation results, known issues
2. **Test in browser after every change** - No build step means instant feedback
3. **Recommend git commits before and after changes** - Safety net for beginner
4. **Explain what you're changing and why** - Helps user learn the code structure
5. **Preserve existing patterns** - Code is consistent; maintain that consistency

## Known Issues and Limitations

- **Internet required**: CDN dependencies (SheetJS, Google Fonts)
- **Browser dependency**: Requires modern browser with ES6+ support
- **File size**: Single large file (~3500 lines) can be hard to navigate
- **No undo in UI**: Refresh page to reset (processing is non-destructive)

## Recent Changes

### Session: 2026-01-16 (Enhancement 1 + Filename Display)

**Enhancement 1: Scoped Comparison** ✓ COMPLETE
- After loading XMLs in BOM Comparison, tree selection UI shows full hierarchy
- Click any item (not just assemblies) to scope comparison to that branch
- Full descriptions shown in selection tree
- Two reset modes: "Reset Comparison" (keeps files), "Start Over" (clears all)
- Scope info included in Excel/HTML exports
- `extractSubtree()` clones selected branch with Qty 1 at root
- `parseLength()` updated to handle numeric input from subtree cloning
- All 4 validation tests pass

**Filename as Primary Display Element** ✓ COMPLETE
- Filename now shown as the most prominent element in all live views and exports
- Part Number - Description shown as secondary info below filename
- Applied consistently across all three tabs:
  - Flat BOM: live view + HTML export
  - BOM Comparison: live view + Excel export + HTML export
  - Hierarchy View: live view + HTML export
- Display hierarchy: Filename → PN - Description → Revision

### Session: 2026-01-15 (Enhancements 2 & 3)

**Enhancement 3: Export File Naming** ✓ COMPLETE
- Uploaded filename stored and displayed in UI
- Export file naming uses uploaded filename instead of assembly PN/Rev
- Applied to Flat BOM and Hierarchy View tabs

**Enhancement 2: Hierarchy View** ✓ COMPLETE
- New third tab displaying hierarchical BOM structure
- Proper tree connector lines using ancestorContinues algorithm
  - T-junctions (├) for non-last children
  - L-junctions (└) for last children
  - Multi-level vertical lines for deeply nested items
- Plus/minus toggle boxes (14×14px bordered squares)
- Sorting by Component Type → Description → Length at all levels
- Expand/Collapse All buttons
- Excel export with Level column (1, 1.1, 1.1.1)
- HTML export with interactive toggles and matching styling
- Parent rows show downward vertical line only when expanded
- Horizontal lines align with text baseline (1.5rem) not row center

**Test Harness** ✓ COMPLETE
- Node.js test runner in `test/run-tests.js`
- Extracts core BOM functions from HTML file
- Validates against baseline Excel outputs
- Test data in `test-data/` folder

### Session: 2024-12-09

1. **Native line break handling** - Removed semicolon-to-line-break conversion; SOLIDWORKS exports native `\n`
2. **Added subtitle** to Flat BOM tab for consistency
3. **Harmonized HTML export styling** - Matches web interface exactly
4. **Date format standardization** - ISO 8601 format (YYYY-MM-DD HH:MM:SS) for exports

## Reference Documentation

- Full validation test results in handoff document
- Composite key implementation details in handoff document
- Processing pipeline diagrams in handoff document
- Troubleshooting guide in handoff document

---

## All Enhancements Complete

All three enhancements from `BOM Tool Enhancements 20260115.md` are implemented and validated:
1. **Scoped Comparison** - Select any item to compare just that branch
2. **Hierarchy View** - Collapsible tree with WBS levels
3. **Export File Naming** - Uses uploaded filename

All 4 validation tests pass (see `test-data/BOM Tool 2.1 Validation Testing Plan 20260115.md`).
