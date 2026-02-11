# Codebase Concerns

**Analysis Date:** 2026-02-10

## Tech Debt

**CSV/XML Duplication in File Parsing:**
- Issue: Similar file parsing logic is duplicated between `js/core/parser.js` and `js/ui/flat-bom.js`. The CSV parsing logic exists in both parser module (lines 100-142) and flat-bom UI module (lines 94-120) with manual XLSX setup.
- Files: `js/core/parser.js` (lines 100-142), `js/ui/flat-bom.js` (lines 94-120)
- Impact: Maintenance burden when CSV parsing needs changes. Already caused a deviation where flat-bom.js has different XLSX options (raw, cellText, cellDates settings).
- Fix approach: Consolidate parser.js parseCSV to handle both text and file paths cleanly, ensuring both browser and Node.js paths use identical logic.

**Module-Level Mutable State in tree.js:**
- Issue: Root info (_rootPartNumber, _rootRevision, _rootDescription) stored as module-level variables (lines 5-8) with getter/setter functions. This design works but breaks functional purity and makes testing harder.
- Files: `js/core/tree.js` (lines 5-20)
- Impact: Difficult to test buildTree in isolation when multiple BOMs loaded in sequence without manual resetRootInfo() call. Risk of stale root info if comparison tabs don't reset properly.
- Fix approach: Return root info as part of tree object instead of storing module-level state. E.g., return `{root: node, info: {partNumber, revision, description}}` from buildTree.

**State Object Mutation:**
- Issue: Global state object in `js/ui/state.js` is exported and directly mutated throughout UI modules. No immutability guarantees.
- Files: `js/ui/state.js` (entire file), used in `js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js`
- Impact: Difficult to trace state changes, harder to debug multi-step operations. No undo/redo possible. Refactoring requires careful coordination across multiple files.
- Fix approach: Consider a reducer pattern or state change log if undo/redo becomes required, but current approach is acceptable for single-user desktop app.

**Large File Handling:**
- Issue: Export functions (`js/export/html.js` ~983 lines, `js/export/excel.js` ~135 lines) build entire output in memory before download.
- Files: `js/export/html.js`, `js/export/excel.js`
- Impact: Very large BOMs (10K+ parts) could cause browser memory pressure when generating exports. No streaming or chunking.
- Fix approach: Currently acceptable — Operations team uses typical BOMs under 5K parts. If this becomes an issue, consider lazy-loading table rows or server-side export.

**Composite Key Reliance on Precision:**
- Issue: Length-based composite keys in `js/core/compare.js` (line 14: `getCompositeKey(item.partNumber, item.lengthDecimal)`) assume decimal precision is consistent between parsing runs.
- Files: `js/core/compare.js` (lines 7-99), `js/core/flatten.js` (lines 1-51)
- Impact: If length parsing differs even slightly due to floating-point precision, parts that should match won't. Risk when same part appears in different BOMs with slight rounding differences.
- Fix approach: Low risk in practice (SOLIDWORKS exports are consistent). If needed, round lengths to fixed precision (e.g., 0.01") before creating keys.

## Known Bugs

**None identified in automated tests.**

All 4 automated validation tests pass (flatten XML/CSV, compare XML/CSV). The tool has been browser-verified on GitHub Pages and no functional defects were identified during v1.0 completion.

## Security Considerations

**File Upload Input Validation:**
- Risk: File parsing (`js/core/parser.js` parseXML, parseCSV) trusts input file structure without size limits or content validation.
- Files: `js/core/parser.js` (lines 6-97), `js/ui/flat-bom.js` (lines 63-142), `js/ui/comparison.js` (lines 180-250)
- Current mitigation: Running client-side only — no server to attack. FileReader API handles binary safety. DOM parsing prevents injection.
- Recommendations: Add file size check before processing (e.g., reject >100MB files). Validate XML structure more strictly for malformed nesting.

**HTML Export XSS Prevention:**
- Risk: Exported HTML includes user-provided data (descriptions, part numbers). If these contain HTML/script tags, they could execute in exported file.
- Files: `js/export/html.js` (entire file), `js/export/excel.js` (lines 14-95)
- Current mitigation: Using template literals with data interpolation — if data contains `<script>`, it will appear as text in HTML (not executed in modern browsers when file is local).
- Recommendations: Explicitly HTML-escape part numbers, descriptions, and purchase descriptions in export templates. Use `.textContent` instead of template injection where possible.

**No Content Security Policy:**
- Risk: index.html loads SheetJS from CDN without subresource integrity. Could be compromised at source or MITM.
- Files: `index.html` (line 7)
- Current mitigation: Single external dependency (SheetJS). No inline scripts. GitHub Pages enforces HTTPS.
- Recommendations: Add integrity hash to SheetJS CDN script tag. Consider self-hosting SheetJS if CDN reliability is concern.

## Performance Bottlenecks

**Comparison Tree Rendering:**
- Problem: `js/ui/comparison.js` renderSelectionNode (lines 60-135) recursively renders entire BOM tree to DOM for selection. Large BOMs (10K+ parts) will cause layout thrashing.
- Files: `js/ui/comparison.js` (lines 60-135)
- Cause: Each node creation appendChild triggers reflow. No virtual scrolling or lazy loading.
- Improvement path: Implement collapsible tree rendering — only render top 2-3 levels, load children on expand. Or use virtual list library if performance matters. Current threshold is ~100 parts before noticeable lag.

**HTML Export String Concatenation:**
- Problem: `js/export/html.js` builds massive HTML string via template literals. For 10K-part BOMs, this creates large intermediate strings in memory.
- Files: `js/export/html.js` (lines 48-900+)
- Cause: Single template literal with all rows concatenated before DOM insertion.
- Improvement path: Build HTML incrementally or pre-allocate string with array.join(). Low priority — current performance acceptable for typical BOMs.

**Description Word Diff Calculation:**
- Problem: `js/core/utils.js` createDiff (lines 61-91) creates sets from all words for every changed item. Inefficient for large descriptions.
- Files: `js/core/utils.js` (lines 61-91)
- Cause: No memoization. Same logic runs per row even if descriptions are identical.
- Improvement path: Cache diff results by (oldText, newText) pair. Acceptable performance for current use case.

## Fragile Areas

**Tree Construction Level Parsing:**
- Files: `js/core/tree.js` (lines 42-75), `js/core/utils.js` (lines 46-50)
- Why fragile: Level string parsing in getParentLevel assumes consistent dot notation (e.g., "1.1.2.1"). If CSV data has malformed levels, tree construction fails with cryptic parent-not-found error.
- Safe modification: Add validation in BOMNode constructor to reject invalid Level values. Add test for edge cases (missing root, gap in levels).
- Test coverage: No edge case tests for malformed level strings. Test only valid PDM exports.

**XML Traversal Recursion:**
- Files: `js/core/parser.js` (lines 27-92)
- Why fragile: traverseDocument recursively walks XML with parentNode checks to avoid nested duplicates. Deep nesting could cause stack overflow.
- Safe modification: Add recursion depth limit (e.g., max 50 levels). Document maximum supported BOM depth.
- Test coverage: No tests for deeply nested BOMs. Current test data has shallow hierarchies (<5 levels).

**Module Initialization Timing:**
- Files: `js/main.js` (entire file), `js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js`
- Why fragile: Each UI module's init() queries DOM assuming all elements exist. If HTML changes, DOM queries silently fail (returns null, addEventListener on null doesn't throw).
- Safe modification: Add null checks after each querySelector. Or use try/catch around init() calls.
- Test coverage: No tests verify DOM element existence. Browser tests would catch this but are manual.

**XLSX Global Dependency:**
- Files: `js/ui/flat-bom.js` (lines 105, 117), `index.html` (line 7)
- Why fragile: Code assumes XLSX global is loaded before module script runs. If CDN fails or script order changes, XLSX is undefined and code silently fails.
- Safe modification: Check XLSX existence in flat-bom.js at runtime. Move XLSX load into environment.js abstraction.
- Test coverage: None. CDN fails would only be caught in browser testing.

## Scaling Limits

**JavaScript Execution (Browser):**
- Current capacity: Tested up to 5K parts (flattening + comparison in <2s)
- Limit: Large BOMs (20K+ parts) risk browser tab unresponsiveness, memory exhaustion
- Scaling path: For very large BOMs, implement server-side flattening API or worker threads. Current client-side approach acceptable for Operations' typical use.

**CSV File Size (Parsing):**
- Current capacity: Tested with ~500KB CSV files
- Limit: XLSX parsing becomes slow >2MB. Browser memory pressure >10MB.
- Scaling path: Add file size warning before parsing. Stream CSV parsing if needed (chunked XLSX reads).

**HTML Export Download:**
- Current capacity: ~10K part exports (2-3MB HTML files)
- Limit: Very large exports (>50MB) may fail to generate or download in some browsers
- Scaling path: Implement pagination or CSV export option for very large BOMs.

## Dependencies at Risk

**SheetJS (xlsx) v0.18.5 (via CDN):**
- Risk: CDN dependency. Library is actively maintained but single point of failure.
- Impact: If CDN goes down, CSV/Excel parsing stops. Exports fail silently.
- Migration plan: Self-host SheetJS in repository, or switch to simpler CSV-only parsing (Papa Parse or custom). Keep XML parsing (uses native DOMParser, no dependency).

**xmldom for Node.js Tests:**
- Risk: npm package, smaller ecosystem than JSDOM alternatives.
- Impact: Test harness depends on it. If unmaintained, future Node.js versions may break.
- Migration plan: Tests could use JSDOM instead. Low priority — tests only run in CI/automation.

## Missing Critical Features

None identified. All core requirements validated and shipped in v1.0.

## Test Coverage Gaps

**UI Integration:**
- What's not tested: Drag-drop file upload, tab switching, message display, reset/start-over flows
- Files: `js/ui/flat-bom.js`, `js/ui/comparison.js`, `js/ui/hierarchy.js`
- Risk: Refactoring UI handlers could break user experience. Tab navigation changes could silently fail.
- Priority: Medium — core logic is tested, UI bugs caught by browser testing

**Edge Cases in Parsing:**
- What's not tested: Malformed XML (missing attributes, empty levels), CSV with unusual encodings, very deep hierarchies, empty BOMs
- Files: `js/core/parser.js`
- Risk: Real-world SOLIDWORKS exports with edge cases could crash parsing.
- Priority: Medium — current test data represents typical exports

**Hierarchy View Rendering:**
- What's not tested: Tree rendering for very large BOMs, expand/collapse state management
- Files: `js/ui/hierarchy.js`
- Risk: Memory leaks from accumulated DOM nodes in expand/collapse. Large tree rendering could freeze UI.
- Priority: Low — Operations reports typical BOMs are manageable

**Error Scenarios:**
- What's not tested: Comparison when only one BOM uploaded, partial file uploads, corrupted Excel baseline files
- Files: `js/ui/comparison.js`, test/run-tests.js
- Risk: Unhelpful error messages or silent failures in corner cases.
- Priority: Low — operations team trained on normal workflow

---

*Concerns audit: 2026-02-10*
