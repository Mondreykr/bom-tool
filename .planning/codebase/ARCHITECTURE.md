# Architecture

**Analysis Date:** 2026-02-07

## Pattern Overview

**Overall:** Single-page application (SPA) with tab-based UI and three independent data processing workflows

**Key Characteristics:**
- Monolithic single-file architecture (~4400 lines)
- Three distinct feature tabs with isolated processing pipelines
- Global state variables for each tab workflow
- No framework dependencies—pure vanilla HTML5/CSS3/JavaScript ES6+
- Client-side only processing (no backend)
- Direct file I/O via browser File API and ArrayBuffer

## Layers

**Presentation Layer (UI):**
- Purpose: Interactive tabbed interface for user workflows
- Location: `index.html` lines 844-1220 (HTML markup)
- Contains: Header, tab navigation, form controls, result tables, tree views, export buttons
- Depends on: DOM element references, CSS styling, event handlers
- Used by: User interactions trigger JavaScript event listeners

**Processing Layer (Core Business Logic):**
- Purpose: Parse files, build tree structures, flatten BOMs, compare revisions, render trees
- Location: `index.html` lines 1227-4260 (JavaScript functions)
- Contains: File parsing, tree building, flattening, comparison, rendering functions
- Depends on: Parsed data structures (csvData, treeRoot, etc.), external SheetJS library for Excel export
- Used by: UI event handlers invoke processing functions, functions call each other

**Styling Layer:**
- Purpose: Visual design, layout, responsive behavior, animations
- Location: `index.html` lines 8-841 (CSS in `<style>` block)
- Contains: CSS custom properties, card-based layout, table styling, color scheme, tree connector lines
- Depends on: External fonts (Google Fonts: JetBrains Mono, Work Sans)
- Used by: Applied via CSS selectors to HTML elements

## Data Flow

**Flat BOM Workflow:**

1. User clicks upload zone or drags file
2. `handleFile()` detects CSV vs XML format
3. File parsed into `csvData` array:
   - CSV: Decoded UTF-16LE with SheetJS → array of row objects
   - XML: DOMParser recursively traverses hierarchy → array with Level column
4. `buildTree(csvData)` converts flat array to `BOMNode` hierarchy
   - Pass 1: Create all nodes from rows
   - Pass 2: Link children to parents using Level string parsing
   - Pass 3: Sort children recursively by ComponentType → Description → Length
5. `flattenBOM(treeRoot, unitQty)` aggregates quantities:
   - Recursive depth-first traversal
   - Skip Assembly type items (containers, not purchasable)
   - Create composite keys: `PartNumber|Length` or `PartNumber`
   - Aggregate quantities across duplicate keys
   - Return array of flattened items
6. `displayResults()` renders table and statistics
7. Export buttons write Excel (SheetJS) or standalone HTML

**BOM Comparison Workflow:**

1. Two files uploaded separately (Old BOM, New BOM)
2. Each goes through file parsing → tree building → flattening
3. After both loaded, user can:
   - Click items in selection trees to scope comparison to sub-assemblies
   - `extractSubtree()` clones selected branch with Qty 1 at root for scoped comparison
   - `compareBOMs()` performs comparison on flattened results
4. `compareBOMs()` creates result objects with change tracking:
   - Create Maps of both BOMs using composite keys
   - Compare item by item: Added, Removed, Changed
   - For Changed items, track which attributes differ
   - `createDiff()` performs word-level diff on descriptions (red strikethrough for removed, green highlight for added)
5. `displayComparisonResults()` renders comparison table with filter buttons
6. Export options include comparison metadata (old/new filenames, revisions, scope info)

**Hierarchy View Workflow:**

1. Single file uploaded
2. File parsed → tree built
3. `displayHierarchyTree()` renders hierarchical structure
4. `renderTreeNode()` recursively renders each node with tree connectors:
   - Uses `ancestorContinues` array to track which ancestors have more siblings
   - Draws vertical lines at correct depth positions
   - Draws horizontal connectors at 1.5rem vertical position (text baseline alignment)
   - Draws full-height parent downward line only when expanded
5. Nodes have toggle buttons (plus/minus boxes) to collapse/expand children
6. `toggleChildren()` shows/hides child rows and updates `.expanded` class
7. Export options include Level column and interactive toggles

**State Management:**

Global variables organized by tab:

**Tab 1 - Flat BOM:**
- `csvData`: Raw parsed rows (array of objects)
- `flattenedBOM`: Result of flattening (array of flattened items)
- `treeRoot`: Root BOMNode for hierarchy preservation
- `rootPartNumber`, `rootRevision`, `rootDescription`: Assembly metadata
- `uploadedFilename`: Filename for export naming

**Tab 2 - BOM Comparison:**
- `oldBomData`, `newBomData`: Raw parsed rows for each BOM
- `oldBomTree`, `newBomTree`: Full hierarchies for selection UI
- `oldBomFlattened`, `newBomFlattened`: Flattened results
- `oldBomInfo`, `newBomInfo`: Metadata objects
- `comparisonResults`: Array of comparison result objects
- `currentFilter`: Current filter state ('all', 'Added', 'Removed', 'Changed')
- `oldSelectedNode`, `newSelectedNode`: Nodes selected for scoped comparison (null = full GA)

**Tab 3 - Hierarchy View:**
- `hierarchyTree`: Root BOMNode from uploaded file
- `hierarchyRootInfo`: Assembly metadata
- `hierarchyFilename`: Uploaded filename

## Key Abstractions

**BOMNode Class:**
- Purpose: Represents a single item in the hierarchical structure
- Location: `index.html` lines 1270-1282
- Pattern: Class-based encapsulation with typed properties
- Properties: level, partNumber, componentType, description, material, qty, length, uofm, state, purchaseDescription, nsItemType, revision, children[]

**Flattened Item Object:**
- Purpose: Represents aggregated purchasable item after flattening
- Pattern: Plain JavaScript object (no class)
- Key fields: partNumber, qty (aggregated), lengthDecimal, lengthFractional (1/16" increments), componentType, description (material concatenated)

**Comparison Result Object:**
- Purpose: Represents a single change between two BOMs
- Pattern: Plain JavaScript object
- Key fields: changeType ('Added'/'Removed'/'Changed'), partNumber, oldQty/newQty, oldDescription/newDescription, deltaQty, attributesChanged[]

**Composite Key Pattern:**
- Purpose: Enable aggregation of same part at different lengths
- Implementation: `PartNumber|Length` or `PartNumber` (if no length)
- Location: `getCompositeKey()` function, used in flattening and comparison
- Example: Part "ABC-123" at 2.5" and 3.5" are stored as separate keys

## Entry Points

**Flat BOM Tab:**
- Location: `index.html` lines 1237-1270 (DOM event bindings)
- Triggers: File upload via drag-drop or file input, Flatten BOM button click
- Responsibilities:
  - Bind upload zone drag-drop handlers
  - Bind file input change handler
  - Bind Flatten BOM button click
  - Bind Reset button click

**BOM Comparison Tab:**
- Location: `index.html` lines ~2090-2200 (DOM event bindings for comparison)
- Triggers: Two file uploads, Compare BOM button click, tree item clicks for scoping
- Responsibilities:
  - Manage two separate file upload zones
  - Build selection trees for scope selection
  - Handle comparison button click
  - Manage filter buttons

**Hierarchy View Tab:**
- Location: `index.html` lines ~3600-3700 (DOM event bindings for hierarchy)
- Triggers: File upload, toggle button clicks for expand/collapse
- Responsibilities:
  - Handle file upload
  - Bind toggle button click handlers
  - Manage expand/collapse state

## Error Handling

**Strategy:** Try-catch blocks with user-facing messages via `showMessage()`, `showCompareMessage()`, `showHierarchyMessage()`

**Patterns:**
- File parsing errors (invalid CSV encoding, malformed XML) → caught and displayed as error message
- Missing required data (no root node, invalid Level column) → thrown errors with descriptive text
- UI validation (no file selected before flatten) → disabled buttons, error messages
- Console logging for debugging: `console.log()` for trace, `console.error()` for failures

**Sample:**
```javascript
try {
    // Parse file
    csvData = parseXML(xmlText);
    showMessage(`XML loaded successfully: ${csvData.length} rows`, 'success');
} catch (error) {
    showMessage(`Error parsing file: ${error.message}`, 'error');
    console.error('Parse error:', error);
}
```

## Cross-Cutting Concerns

**Logging:** Console logging throughout processing pipeline:
- File parsing milestones: "XML parsed: N rows"
- Tree building: "Row X: Level=... PartNumber=..."
- Flattening: "Processing: Level=..., Aggregating: key (was qty, adding qty)"
- No external logging service; all to browser console

**Validation:**
- File type: Accept only .csv and .xml files
- Encoding: UTF-16LE for CSV with BOM detection; UTF-8 for XML
- Required columns: Part Number, Level, Component Type, Qty (others optional)
- Data types: Level parsed as string for hierarchy, Qty as integer, Length as decimal
- User input: Unit Qty validated as positive integer (min=1, step=1)

**Authentication:** Not applicable (no backend, no auth required)

**UI State Synchronization:**
- Disabled/enabled button states track loading status
- Message boxes cleared before operations and populated with results
- Results containers hidden until data available (display: none/block toggle)
- Tab content show/hide via `.active` class toggling

**Export Formatting:**
- Excel export via SheetJS `XLSX.writeFile()` with formatted filenames
- Filename pattern: `PartNumber-RevRevision-[Type]-YYYYMMDD.xlsx`
- HTML export creates standalone document with embedded styles and Google Fonts via CDN
- Line breaks: Native `\n` preserved in Excel; converted to `<br>` tags in HTML

---

*Architecture analysis: 2026-02-07*
