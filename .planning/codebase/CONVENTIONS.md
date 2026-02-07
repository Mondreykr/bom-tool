# Coding Conventions

**Analysis Date:** 2026-02-07

## Naming Patterns

**Files:**
- Single HTML file: `index.html`
- Test runner: `run-tests.js` (Node.js module)
- No subdirectories; all code in single file for portability

**Functions:**
- camelCase for all functions
- Prefix for scope: `parse*`, `build*`, `flatten*`, `compare*`, `render*`, `display*`, `show*`, `handle*`, `create*`
- Examples: `parseXML()`, `buildTree()`, `flattenBOM()`, `compareBOMs()`, `displayResults()`, `showMessage()`, `handleFile()`

**Variables:**
- camelCase for all variables and constants
- Descriptive names; no single-letter variables except loop counters
- Global state variables prefixed with intent: `csvData`, `flattenedBOM`, `treeRoot`, `rootPartNumber`
- DOM elements suffixed with type: `uploadZone`, `fileInput`, `resultsBody`, `flattenBtn`, `message`
- Boolean flags prefixed with `is` or `has`: `isXML`, `hasBreakdown`, `hasFile`

**Types/Classes:**
- PascalCase: `BOMNode`
- Constructor properties: camelCase
- Example from `BOMNode` class:
  ```javascript
  class BOMNode {
      level              // "1", "1.1", "1.1.1"
      partNumber
      componentType
      description
      material
      qty
      length
      uofm
      state
      purchaseDescription
      nsItemType
      revision
      children[]
  }
  ```

**Constants:**
- camelCase (not UPPER_CASE) following ES6 convention
- Example: `const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);`

**Composite Keys:**
- Pattern: `"PartNumber|Length"` or `"PartNumber|"` if no length
- Used consistently across comparison and aggregation: `getCompositeKey()`, `createCompositeKey()`

## Code Style

**Formatting:**
- No linter/formatter configured (manual formatting only)
- Consistent 4-space indentation throughout
- Arrow functions for callbacks: `(e) => { ... }`
- Template literals for string interpolation: `` `text ${variable}` ``

**Linting:**
- No ESLint/Prettier configuration detected
- Code is hand-formatted and self-consistent

**Spacing:**
- Single space after `if`, `for`, `while`, `function`
- Single space around binary operators
- No spaces inside parentheses: `function(param)` not `function( param )`
- Blank line between logical sections

## Import Organization

**HTML context:**
- External library via CDN: SheetJS at line 7
- Single `<script>` block for all JavaScript (~3200 lines)
- No module imports (single-file architecture)

**Node.js test context (`run-tests.js`):**
- ES6 module imports at top:
  ```javascript
  import fs from 'fs';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import XLSX from 'xlsx';
  import { DOMParser } from 'xmldom';
  ```
- Helper functions immediately follow imports
- Test functions organized in logical groups with dividing comments

## Error Handling

**Patterns:**
- Try-catch blocks around file parsing and processing
- Errors caught and displayed to user via `showMessage()` or `showCompareMessage()`
- Console logging for debugging (verbose in test suite, selective in browser)
- Example (line 1698):
  ```javascript
  try {
      const unitQty = parseInt(unitQtyInput.value);
      if (unitQty < 1) {
          showMessage('Unit Quantity must be at least 1', 'error');
          return;
      }
      // process...
  } catch (error) {
      showMessage(`Error flattening BOM: ${error.message}`, 'error');
      console.error(error);
  }
  ```

**Validation:**
- Input validation before processing: check for null/undefined/invalid ranges
- Throw descriptive errors with context:
  ```javascript
  throw new Error(`Parent ${parentLevel} not found for ${level}. Available levels: ${Array.from(nodes.keys()).join(', ')}`);
  ```
- File type detection before parsing

**User Feedback:**
- `showMessage(text, type)` for browser messages (line 2172)
- `showCompareMessage(text, type)` for comparison tab messages (line 2630)
- CSS classes `.message.show`, `.message.error`, `.message.success`

## Logging

**Framework:** `console` (native)

**Patterns:**
- Browser: Selective logging for debugging (`console.log`)
- Test suite: Verbose logging of processing steps
- Examples:
  ```javascript
  console.log(`File type detected: ${isXML ? 'XML' : 'CSV'}`);
  console.log(`XML parsed: ${csvData.length} data rows`);
  console.log('First 5 rows:', csvData.slice(0, 5).map(r => r.Level + ': ' + r['Part Number']).join(', '));
  console.error('Parse error:', error);
  ```

**Test Logging:**
- Test framework prints `✓ PASS` or `✗ FAIL` with error details
- Function shows test inputs/outputs for debugging:
  ```javascript
  console.log(`  Result: ${sorted.length} items`);
  console.log(`  Expected: ${expected.length} items`);
  ```

## Comments

**When to Comment:**
- Section dividers: `// ============================================================================`
- Complex algorithms: Parse XML traversal, tree building with parent linking
- Non-obvious business logic: Assembly exclusion, composite key generation, fractional conversion
- File structure: `<!-- Tab 1: Flat BOM Content -->` for major sections

**JSDoc/TSDoc:**
- Not used; code is self-documenting with clear naming
- Inline comments explain "why" not "what"
- Example (line 1593):
  ```javascript
  // Only add non-assembly items to output
  // Assemblies are containers - not purchasable items
  if (node.componentType !== 'Assembly') {
  ```

**Avoided:**
- Commented-out code (removed cleanly)
- Excessive comments on simple statements
- Stale comments (would need maintenance with changes)

## Function Design

**Size:**
- Typical range: 5-50 lines
- Larger functions for table rendering (~80 lines) with clear subsections
- Recursive functions (tree traversal) stay concise with clear base case

**Parameters:**
- 1-3 parameters typical
- Default parameters in destructuring or optional position: `(node, depth, isLastChild, ancestorContinues = [])`
- No long parameter lists; pass objects if multiple related params needed

**Return Values:**
- Explicit returns: arrays, objects, or null
- Never implicit undefined
- Map/reduce patterns for transformations:
  ```javascript
  return items.map((item, index) => {
      // return HTML or object
  });

  return Array.from(aggregatedItems.values());
  ```

**Pure Functions:**
- Most core logic is pure: `flattenBOM()`, `compareBOMs()`, `parseXML()`
- Side effects isolated to: event handlers, DOM manipulation, display functions

## Module Design

**Exports:**
- Single HTML file: No exports. All functions in global scope within `<script>`
- Test module: Node.js exports via function definitions; imported tests called explicitly

**Barrel Files:**
- Not applicable (single-file architecture)

**Global Variables:**
- Minimal set, well-named:
  - `csvData`, `flattenedBOM`, `treeRoot`, `rootPartNumber`, `rootRevision`, `rootDescription`, `uploadedFilename`
  - Comparison state: `oldBomData`, `newBomData`, `oldBomFlattened`, `newBomFlattened`, `oldBomInfo`, `newBomInfo`, `comparisonResults`, `currentFilter`
  - Scoped comparison: `oldBomTree`, `newBomTree`, `oldSelectedNode`, `newSelectedNode`
  - Hierarchy view: `hierarchyTree`, `hierarchyRootInfo`, `hierarchyFilename`
- Each grouped by feature/tab for clarity

**Helper Function Libraries:**
- Data processing functions at top of script (~lines 1285-1700)
- Display/UI functions in middle (~lines 1700-2200)
- Event handlers at bottom (~lines 2200+)

## Naming Conventions Summary

| Type | Pattern | Example |
|------|---------|---------|
| Function | camelCase | `buildTree()`, `flattenBOM()` |
| Variable | camelCase | `csvData`, `rootPartNumber` |
| Class | PascalCase | `BOMNode` |
| Boolean | `is*` or `has*` | `isXML`, `hasFile` |
| DOM element | camelCase + type | `uploadZone`, `flattenBtn` |
| Constant | camelCase | `const fileList = [...]` |
| CSS class | kebab-case | `.tree-select-toggle`, `.file-info` |

---

*Convention analysis: 2026-02-07*
