# Coding Conventions

**Analysis Date:** 2026-02-10

## Naming Patterns

**Files:**
- Lowercase with hyphens: `flat-bom.js`, `comparison.js`, `parser.js`
- Core domain logic grouped by concern: `parser.js`, `tree.js`, `flatten.js`, `compare.js`, `utils.js`
- UI modules by feature: `flat-bom.js`, `comparison.js`, `hierarchy.js`
- Export modules by format: `excel.js`, `html.js`, `shared.js`
- Infrastructure/detection: `environment.js`

**Functions:**
- camelCase for all function and method names
- Verb-first for actions: `buildTree()`, `flattenBOM()`, `parseXML()`, `renderSelectionTree()`, `handleFile()`
- Descriptive compound names for complex operations: `extractSubtree()`, `createDiff()`, `decimalToFractional()`
- Private/internal functions prefixed with underscore or nested in scopes (see `environment.js` for async imports)

**Variables:**
- camelCase for all variables and constants: `csvData`, `flattenedBOM`, `treeRoot`, `componentType`
- Plural for collections: `rows`, `nodes`, `results`, `children`
- Prefixes for state maps: `oldMap`, `newMap`, `resultMap`, `expectedMap`, `aggregatedItems`
- Prefixes for DOM references: `fileInput`, `uploadZone`, `compareBtn`, `resultsBody`
- Module-level state with underscore prefix: `_rootPartNumber`, `_rootRevision`, `_rootDescription`

**Types:**
- Class names: PascalCase: `BOMNode`
- No TypeScript or JSDoc type annotations (vanilla ES6+ only)
- Type information implicit from usage and context

## Code Style

**Formatting:**
- No linting or formatting tools detected (no `.eslintrc`, `.prettierrc`)
- Follow existing conventions by inspection:
  - 4-space indentation (consistent throughout)
  - Single quotes for strings (not consistently enforced, mixed usage in some files)
  - Semicolons at end of statements (mostly present)
  - Braces on same line: `function name() {` not `function name()\n{`

**Linting:**
- No formal linting configured
- Code quality maintained through manual review and automated test validation
- Conventions enforced by example and consistency in existing codebase

## Import Organization

**Order:**
1. Internal modules from `./` (relative imports within same directory)
2. Core modules from `../core/` (parsing, tree, flatten, compare, utils)
3. UI modules from `./ui/` (state, feature-specific UI)
4. Export modules from `../export/` (excel, html, shared)
5. Environment detection from `../core/environment.js`

**Pattern:**
```javascript
import { init as initFlatBom } from './ui/flat-bom.js';
import { state } from './ui/state.js';
import { parseXML } from '../core/parser.js';
import { buildTree } from '../core/tree.js';
import { flattenBOM, sortBOM } from '../core/flatten.js';
import { exportFlatBomExcel } from '../export/excel.js';
```

**Path Aliases:**
- No path aliases configured
- Relative imports always used: `./`, `../`
- Absolute imports via ES6 module URLs: `import fs from 'fs'` (Node.js only)

## Error Handling

**Patterns:**
- Try-catch blocks around file parsing in UI handlers (see `js/ui/flat-bom.js` line 66)
- Error objects thrown with descriptive messages:
  ```javascript
  throw new Error('Invalid XML format');
  throw new Error('No transaction element found');
  throw new Error(`Parent ${parentLevel} not found for ${level}`);
  ```
- Error messages displayed to user via `showMessage(message, 'error')` in UI modules
- Async operations wrapped with try-catch to catch parsing failures

**Return Values:**
- Functions return `null` for missing/empty values (not undefined): `parseLength()` returns `null` for non-numeric
- Functions return empty arrays `[]` for zero results: `sortChildren()` returns node with empty children array
- Error cases throw exceptions, not returning error states

## Logging

**Framework:** console (native browser console, no external logging library)

**Patterns:**
- Used sparingly and only for debugging/diagnostics:
  ```javascript
  console.log(`File type detected: ${isXML ? 'XML' : 'CSV'}`);
  console.log(`XML parsed: ${state.csvData.length} data rows`);
  console.log('First 5 rows:', state.csvData.slice(0, 5).map(r => r.Level + ': ' + r['Part Number']).join(', '));
  ```
- Progress logging in test runner (see `test/run-tests.js`): separators, test names, pass/fail indicators
- No structured logging or log levels (info/debug/error) - all console.log

## Comments

**When to Comment:**
- Explain non-obvious algorithm logic (see recursive traversal in `parser.js` line 28)
- Mark section dividers for major functional areas (see `state.js` with `// ========================================`)
- Document the "why" not the "what" - code should be self-documenting
- Comments present but sparse; code clarity prioritized over extensive commenting

**JSDoc/TSDoc:**
- Limited JSDoc usage found only in `export/excel.js` (newer files)
- When present, documents function purpose and parameters:
  ```javascript
  /**
   * Export Flat BOM to Excel
   * @param {Array} flattenedBOM - Flattened BOM data
   * @param {string|null} uploadedFilename - Original uploaded filename
   */
  ```
- Not consistently applied across older modules (`parser.js`, `tree.js`, `flatten.js`)

## Function Design

**Size:**
- Functions range from 5-50 lines typically
- Complex operations like `traverseDocument()` (recursive) may span 60+ lines
- No strict line-count limits; logic complexity is the driver
- Single responsibility: parse, build, flatten, compare, or export (not mixed)

**Parameters:**
- Direct parameter passing (no object destructuring for simple cases)
- Object parameters for complex/optional configurations:
  ```javascript
  XLSX.read(csvText, { type: 'string', raw: true, cellText: true, cellDates: false });
  ```
- Required parameters first, optional/config objects last

**Return Values:**
- Functions return computed results directly: `flattenBOM()` returns array of items
- Recursive functions return intermediate state for accumulation: `traverseDocument()` returns `childIndex`
- Async functions use Promise/await pattern: `parseCSV()` is async for Node.js file operations

## Module Design

**Exports:**
- Named exports for all functions: `export function flattenBOM()`
- Default exports not used
- Single responsibility per module: parser exports `parseXML()` and `parseCSV()` only
- Modules can export multiple related functions (see `tree.js`: `buildTree()`, `sortChildren()`, getter/setter functions)

**Barrel Files:**
- No barrel files (`index.js` exporting all from folder) present
- Each module imported directly by full path: `import { flattenBOM } from '../core/flatten.js'`

**Module-level State:**
- Used only when necessary for cross-function state: `_rootPartNumber`, `_rootRevision`, `_rootDescription` in `tree.js`
- Getter functions provided: `getRootPartNumber()`, `getRootRevision()`, `getRootDescription()`
- Reset function provided: `resetRootInfo()` to clear state between operations
- Centralized UI state in `ui/state.js` as single exported object: `export const state = { ... }`

---

*Convention analysis: 2026-02-10*
