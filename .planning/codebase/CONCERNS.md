# Codebase Concerns

**Analysis Date:** 2026-02-07

## Tech Debt

### Monolithic Single-File Architecture

**Issue:** Entire application (~4400 lines) is in one HTML file combining CSS, JavaScript, and HTML markup.

**Files:** `index.html` (lines 1-4396)

**Impact:**
- Difficult to navigate and edit specific features
- Long context switching when making changes
- No code reuse across components without duplication
- All edits carry risk of breaking multiple features in same file
- Challenging for collaborative development

**Fix approach:** Planned multi-file refactor (deferred until after IFP Merge feature). Structure in CLAUDE.md → "Future Refactoring" section recommends splitting into modules: core processing, UI rendering, export handlers, tree logic. Timing should be after IFP feature is complete.

### Pervasive Global State Variables

**Issue:** Entire application relies on global scope variables that mutate throughout execution.

**Files:** `index.html` (lines 1229-1235, 2210-2225, 3513-3516)

**Global variables across three tabs:**
- Flat BOM: `csvData`, `flattenedBOM`, `treeRoot`, `rootPartNumber`, `rootRevision`, `rootDescription`, `uploadedFilename`
- BOM Comparison: `oldBomData`, `newBomData`, `oldBomFlattened`, `newBomFlattened`, `oldBomTree`, `newBomTree`, `oldSelectedNode`, `newSelectedNode`, `oldBomInfo`, `newBomInfo`, `comparisonResults`, `currentFilter`, `oldBomFilename`, `newBomFilename`
- Hierarchy View: `hierarchyData`, `hierarchyTree`, `hierarchyFilename`, `hierarchyRootInfo`

**Impact:**
- Variables can be overwritten unexpectedly by different operations
- Difficult to reason about state at any point in execution
- No clear ownership of data (which function owns which variable)
- Race conditions possible if multiple async operations overlap
- Debugging state issues requires understanding entire flow

**Safe modification:** Encapsulate tab state in objects:
```javascript
// Instead of: csvData, flattenedBOM, rootPartNumber, etc.
const flatBOMState = {
    csvData: null,
    flattenedBOM: null,
    treeRoot: null,
    rootPartNumber: null,
    rootRevision: null,
    rootDescription: null,
    uploadedFilename: null
};
```

## Performance Bottlenecks

### Console.log() Calls in Production

**Issue:** Extensive logging statements throughout hot paths add unnecessary overhead.

**Files:** `index.html` (lines 1293, 1301-1303, 1344-1345, 1508-1513, 1521-1522, 1590, 1598-1602, 1636-1639, 2644, 2658, 2668, 2681, etc.)

**Problem:**
- Logging on every BOM item during parsing slows down large files (hundreds/thousands of parts)
- String interpolation in `console.log` arguments evaluated even when logs not displayed
- Console operations block JavaScript execution in browser debugger (if developer tools open)

**Improvement path:**
```javascript
// Wrap logs in debug flag or use conditional compilation
const DEBUG = false;
if (DEBUG) console.log(`Processing: ${item}`);

// Or use grouped logging for fewer statements
console.group('Parsing');
console.log(`Total rows: ${data.length}`);
console.groupEnd();
```

### Composite Key String Concatenation in Hot Loops

**Issue:** Aggregation loop creates composite keys via string concatenation for every item.

**Files:** `index.html` (lines 1595, 1576-1581)

**Code:**
```javascript
const compositeKey = getCompositeKey(node.partNumber, node.length);
// Inside getCompositeKey:
return `${partNumber}|${length}`;  // String concat on every iteration
```

**Problem:** Thousands of BOM items each create a new string. While not catastrophic, Map operations with string keys are slower than number keys.

**Improvement path:** Use composite numeric key if performance becomes issue (unlikely for typical BOMs under 5000 items):
```javascript
// Optimization if needed (unlikely):
const compositeKey = partNumberId << 16 | lengthId;  // Bitwise packing
```

## Known Bugs

### parseLength() Numeric Conversion Undefined Behavior

**Issue:** `parseLength()` attempts to convert Length field with mixed numeric/string handling.

**Files:** `index.html` (lines 1483-1497)

**Code:**
```javascript
function parseLength(lengthStr) {
    if (lengthStr === null || lengthStr === '') {
        return null;
    }

    // Handle numeric input (from extractSubtree cloning)
    if (typeof lengthStr === 'number') {
        return lengthStr;
    }

    const num = parseFloat(lengthStr);
    return isNaN(num) ? null : num;
}
```

**Problem:** When `extractSubtree()` clones nodes, it passes numeric lengths directly. Works correctly but relies on implicit type coercion. If CSV has length like "17.063\"" (with quote character), parseFloat strips it but silently succeeds.

**Trigger:** Upload CSV with malformed length column containing non-numeric characters or trailing units.

**Workaround:** Currently works because SOLIDWORKS PDM exports clean numeric data. Input validation would catch this.

**Risk level:** Low - only triggered by malformed input files, not typical exports.

### parseInt() Without Radix in DOM Depth Parsing

**Issue:** Multiple calls to `parseInt()` without specifying radix parameter.

**Files:** `index.html` (lines 2349, 2362, 3832, 3840, 4267, 4276)

**Code:**
```javascript
const parentDepth = parseInt(parentRow.dataset.depth);  // No radix!
const rowDepth = parseInt(row.dataset.depth);
```

**Problem:** `parseInt('08')` returns 0 in some browsers due to octal interpretation. While unlikely here (depth is 0-10 typically), it's unsafe.

**Fix:** Always specify radix:
```javascript
const parentDepth = parseInt(parentRow.dataset.depth, 10);
```

**Risk level:** Low - depths rarely exceed single digits, but technically unsafe.

## Fragile Areas

### Tree Rendering with Complex Ancestor Tracking Algorithm

**Issue:** Hierarchy View tree rendering uses `ancestorContinues` array to track which ancestors have more siblings.

**Files:** `index.html` (lines 3687-3825, 4024-4050)

**Why fragile:**
- Algorithm maintains parallel array tracking ancestor state at each depth level
- Visual rendering depends on this state being correct
- Off-by-one errors result in connector lines appearing at wrong positions
- Modifying parent/child rendering logic without updating ancestor logic breaks connectors
- Complex nested ternaries and array operations make verification difficult

**Example of fragility:**
```javascript
const childAncestorContinues = [...ancestorContinues, !isLastChild];
// If this logic changes, all 3 rendering functions (flat, comparison, hierarchy) must sync
```

**Safe modification:** Add unit tests for tree rendering with various depth patterns (1-5 levels deep). Test should verify:
- Correct vertical line positions at each depth
- Horizontal lines align at 1.5rem
- Toggle indicators appear only for nodes with children

**Test coverage:** Currently no automated tests for tree rendering (manual browser testing only).

## Security Considerations

### CDN Dependency for SheetJS Library

**Issue:** Application loads SheetJS from Cloudflare CDN without integrity verification.

**Files:** `index.html` (line 7)

**Code:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

**Risk:**
- If CDN is compromised, malicious code executes in user's browser
- No subresource integrity (SRI) hash to verify file authenticity
- No fallback if CDN is unavailable (offline use impossible)

**Current mitigation:** Cloudflare is well-established, compromises rare. All data processing is client-side (no server transmission).

**Recommendations:**
1. Add SRI hash to script tag (requires knowing expected hash)
2. Provide offline fallback (bundle xlsx library with HTML)
3. Consider self-hosting library instead of CDN

**Fix approach:**
```html
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
  integrity="sha384-[HASH_HERE]"
  crossorigin="anonymous">
</script>
```

### Google Fonts CDN Dependency

**Issue:** Application loads Google Fonts from googleapis.com CDN.

**Files:** `index.html` (lines 9, 1905-1907, 3133-3135, 4073-4075)

**Risk:** Lower than SheetJS (fonts are visual only, non-executable), but still external dependency. Privacy concern: Google can track font requests.

**Recommendation:** Self-host fonts or use system fonts as fallback for offline capability.

### innerHTML Assignment with User-Controlled Data

**Issue:** Multiple locations use `innerHTML =` to render data, creating XSS risk if data contains HTML.

**Files:** `index.html` (lines 1788, 2270, 2897, 3441, 3449, 3478, 3498, 3675, 4382)

**Examples:**
```javascript
resultsBody.innerHTML = items.map((item, index) => {
    return `<tr><td>${item.description}</td>...</tr>`;
}).join('');

compareBody.innerHTML = '';  // Later populated with user data
```

**Risk:** LOW - Data source is user-uploaded CSV/XML files (not untrusted web input). However, if CSV is crafted to contain HTML/JavaScript, it could execute.

**Example attack:**
```
File: malicious.csv
Description: "<img src=x onerror='alert(1)'>"
```

**Current mitigation:** CSV parser uses SheetJS which strips HTML. XML parser uses native DOMParser which doesn't execute scripts. Description field typically contains safe engineering text (part names, material specs).

**Recommendations:**
1. Use `textContent` for descriptions instead of HTML if possible
2. Sanitize descriptions before rendering (remove HTML tags)
3. Use `document.createTextNode()` for non-formatted text

## Scaling Limits

### Large BOM Parsing and Flattening Performance

**Current capacity:**
- Tested with BOMs up to ~100-200 items (2-3 levels deep)
- File size: 10-50 KB typical

**Scaling limit:**
- O(n) parsing where n = number of items (acceptable)
- O(n) tree building with recursive sorting O(n log n) at each level (acceptable)
- O(n) flattening with Map aggregation (acceptable)
- DOM rendering becomes slow at 1000+ items (browser reflow/repaint overhead)

**Bottleneck:** DOM rendering (innerHTML), not data processing. Creating 1000+ table rows via string concatenation then setting innerHTML causes multi-second delays.

**Improvement path:**
- Use `document.createElement()` and `appendChild()` for large datasets
- Implement virtual scrolling for tables with 500+ rows
- Consider pagination (100 items per page) for large BOMs

**Risk level:** Medium - Edge case (huge BOMs rare), but impacts user experience.

## Dependencies at Risk

### SheetJS v0.18.5 Pinned Version

**Issue:** Application hardcodes SheetJS version 0.18.5 via CDN URL.

**Files:** `index.html` (line 7)

**Risk:**
- Version may become deprecated/unsupported
- Security vulnerabilities in v0.18.5 not patched (if newer versions exist)
- No automatic updates; requires manual file change

**Current status (as of Feb 2025):** v0.18.5 is relatively current. Major version jumps (0.18 → 1.0) would require code changes.

**Migration plan:** Monitor SheetJS releases. When major update needed:
1. Test v1.0+ API compatibility (likely breaking changes)
2. Update XLSX.read() and XLSX.utils calls if API changed
3. Test all export functionality (Excel generation)
4. Update CLAUDE.md with new version notes

**Risk level:** Low-Medium - Only problematic if security vulnerability discovered in 0.18.5.

## Test Coverage Gaps

### No Automated Tests for Core Logic

**Issue:** BOM parsing, flattening, and comparison logic has no unit tests.

**Files affected:**
- `parseXML()` (lines 1368-1457) - No tests
- `buildTree()` (lines 1502-1573) - No tests
- `flattenBOM()` (lines 1584-1642) - No tests
- `compareBOMs()` (lines 2013-2090) - No tests
- `createDiff()` (lines 2091-2110) - No tests

**What's not tested:**
- Edge cases: empty BOMs, single-item BOMs, deeply nested (5+ levels)
- Quantity multiplication through 3+ levels
- Composite key aggregation correctness
- Diff highlighting with special characters
- UTF-16 BOM detection
- XML with multiple configurations per document

**Risk:** Silent failures possible if requirements change or code is refactored. Example:
- Quantity multiplication currently works (validated manually)
- If refactor changes multiplier handling, tests would catch it
- Manual validation won't catch regressions

**Priority:** High - Core business logic (correct flattening) is mission-critical.

**Test framework:** Node.js test harness exists in `/test/run-tests.js` but only validates against baseline Excel outputs. Needs unit test suite.

### No Automated Tests for UI State Transitions

**Issue:** Tab switching, file uploads, result display have no automated tests.

**Files:**
- Tab system (lines 2184-2204) - No tests
- File upload handlers (lines 1285-1365, 2506-2630) - No tests
- Reset/state clearing (lines 2152-2169, 3380-3466) - No tests
- Scoped comparison state (lines 2384-2431) - No tests

**What's not tested:**
- Switching tabs with unsaved changes (does state persist correctly?)
- Uploading file to Tab 1, switching to Tab 2, file still there?
- Reset button clears all state properly
- Selection state in scoped comparison survives tab switches
- Message notifications display and auto-hide correctly

**Risk:** UI state bugs only discovered through manual interaction. Example:
- If tab switching logic changes, could break state isolation between tabs
- Reset operations could leave orphaned data in memory (minor leak)

**Priority:** Medium - Affects usability, not data correctness.

### No Tests for Export Format Correctness

**Issue:** Excel and HTML exports have no verification tests.

**Files:**
- `exportExcelBtn` (lines 1808-1845) - Excel export
- `exportHtmlBtn` (lines 1847-1904) - HTML export
- `exportCompareExcelBtn` (lines 2980-3051) - Comparison Excel export
- `exportCompareHtmlBtn` (lines 3053-3310) - Comparison HTML export
- `exportHierarchyExcelBtn` (lines 3920-3975) - Hierarchy Excel export
- `exportHierarchyHtmlBtn` (lines 3977-4070) - Hierarchy HTML export

**What's not tested:**
- Excel cells contain correct values
- Column headers match specification
- Date format in exports (YYYYMMDD vs ISO 8601)
- Line breaks (`\n`) preserved in Excel cells
- Line breaks converted to `<br>` in HTML
- Diff highlighting works in exported HTML

**Risk:** Exports could have subtle bugs (off-by-one column, missing header, wrong date format) not caught until user opens file.

**Priority:** High - Exports are user-facing deliverables. Incorrect export is useless to end user.

### Tree Rendering No Regression Tests

**Issue:** Complex tree connector line algorithm has no automated tests.

**Files:**
- Hierarchy View tree render (lines 3687-3825)
- Flat BOM comparison tree render (lines 4024-4050)
- Comparison result tree select (lines 2263-2342)

**What's not tested:**
- Vertical lines appear at correct depths
- Horizontal lines align at baseline (1.5rem)
- Toggle (+/-) indicates correct expand/collapse state
- Last child L-junction vs non-last child T-junction
- Deeply nested items (5+ levels) render correctly

**Risk:** Connector line position bugs appear as visual distortion in tree. Without tests, regression is only caught by manual inspection.

**Priority:** Low-Medium - Visual bug, not data corruption. Manual testing adequate if done carefully.

## Missing Critical Features

### No Input Validation

**Issue:** Application accepts uploaded files without validating structure or data types.

**Files:** `handleFile()` (lines 1285-1365), `handleCompareFile()` (lines 2506-2630), `handleHierarchyFile()` (lines 3572-3621)

**What's not validated:**
- Required columns present (Part Number, Qty, etc.)
- Qty is numeric (or will fail silently with NaN)
- Length is numeric if provided
- Component Type is one of expected values
- No data truncation during parsing

**Risk:** Malformed input file shows error dialog but doesn't indicate what's wrong. User sees "Error parsing file: undefined" with no context.

**Improvement:** Add explicit validation:
```javascript
function validateBOMData(rows) {
    const required = ['Part Number', 'Qty', 'Component Type', 'Description'];
    const missing = required.filter(col =>
        !rows[0] || !(col in rows[0])
    );
    if (missing.length > 0) {
        throw new Error(`Missing columns: ${missing.join(', ')}`);
    }
}
```

### No Warning for Large Files

**Issue:** No file size limit or warning before processing large files.

**Files:** File parsing (lines 1285-1365)

**Problem:** User uploads 10 MB file, application hangs for 30 seconds during parsing. No progress indicator. User thinks app is broken.

**Improvement:** Add file size check:
```javascript
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB
if (file.size > MAX_FILE_SIZE) {
    showMessage('File too large (max 5 MB)', 'error');
    return;
}
```

### No Undo/Redo Capability

**Issue:** User cannot undo operations. Only reset button available (clears everything).

**Files:** Reset logic (lines 2152-2169)

**Problem:** User sorts results table, accidentally clicks reset, loses all work.

**Mitigation:** Current behavior documented in CLAUDE.md ("No undo in UI: Refresh page to reset"). User can use browser back button or git history if file is version controlled. Acceptable for simple tool.

---

*Concerns audit: 2026-02-07*
