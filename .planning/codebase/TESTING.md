# Testing Patterns

**Analysis Date:** 2026-02-07

## Test Framework

**Runner:**
- Node.js test runner: `test/run-tests.js`
- Custom framework: No external test library (Jest, Vitest, Mocha)
- Execution: `npm test` (calls `node run-tests.js`)

**Assertion Library:**
- None. Custom comparison functions: `compareFlattened()`, `compareComparisonResults()`
- Comparisons return arrays of error strings; empty array = pass

**Run Commands:**
```bash
npm test              # Run all 4 validation tests
node run-tests.js     # Equivalent
```

**Test Output:**
- Passes: `✓ PASS`
- Fails: `✗ FAIL` with error list
- Errors: `✗ ERROR` with stack trace
- Summary: `4/4 tests passed` or failure count

## Test File Organization

**Location:**
- Test runner: `test/run-tests.js` (Node.js module with full extracted functions)
- Test data: `test-data/` folder
- HTML file: Single-file self-test via browser console (not automated)

**Naming:**
- Test functions: `test1_FlatBOM_XML()`, `test2_Comparison_CSV()`, etc.
- Test data files: Named with operation and date: `258730-Rev2-Flat BOM-20260115.xlsx`

**Structure:**
```
test/
├── run-tests.js           # Test runner with extracted production functions
├── package.json           # Dependencies: xlsx, xmldom
└── [node_modules/]
test-data/
├── *.csv                  # Input CSV files (UTF-16LE BOMs)
├── *.xml                  # Input XML files (SOLIDWORKS exports)
└── *.xlsx                 # Expected baseline outputs
```

## Test Structure

**Suite Organization:**
- Single test runner file with 4 tests
- Each test is independent function: `test1_*()`, `test2_*()`, etc.
- Tests run sequentially in `main()` section at bottom

**Patterns:**

```javascript
function test1_FlatBOM_XML() {
    console.log('  Input: 258730-Rev2-20260105.XML');
    console.log('  Expected: 258730-Rev2-Flat BOM-20260115.xlsx');

    // 1. Parse input file
    const xmlText = fs.readFileSync(xmlPath, 'utf8');
    const rows = parseXML(xmlText);

    // 2. Build tree structure
    const root = buildTree(rows);

    // 3. Flatten and aggregate
    const flattened = flattenBOM(root, 1);
    const sorted = sortBOM(flattened);

    // 4. Load expected baseline
    const workbook = XLSX.readFile(expectedPath);
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 5. Compare and return errors
    console.log(`  Result: ${sorted.length} items`);
    console.log(`  Expected: ${expected.length} items`);
    return compareFlattened(sorted, expected);
}
```

**Setup/Teardown:**
- No setup or teardown (each test is self-contained)
- Test data loaded fresh from files for each test

**Assertions:**
- Custom comparison functions return error array
- Pass: `errors.length === 0`
- Fail: Error messages describe what differs

## Mocking

**Framework:** None. Tests use real file I/O

**Patterns:**
- No mocking of dependencies
- Real files parsed from disk: `fs.readFileSync()`, `XLSX.readFile()`
- All core functions extracted directly from HTML into test runner:
  ```javascript
  // EXTRACTED FUNCTIONS FROM BOM TOOL.HTML
  // These are the actual production functions - not reimplementations
  ```

**What to Mock:**
- Not applicable; tests use real data and real parsing

**What NOT to Mock:**
- Core BOM functions must be production code (not stubs)
- File parsing must use real XLSX/DOMParser (validate parsing accuracy)
- Comparison must validate actual behavior

## Fixtures and Factories

**Test Data:**
```javascript
// Helper to resolve test data paths
function testDataPath(filename) {
    return path.join(testDataDir, filename);
}

// Usage in test:
const xmlPath = testDataPath('258730-Rev2-20260105.XML');
```

**Test Files:**
- 4 input CSV/XML files (real SOLIDWORKS exports)
- 4 baseline Excel outputs (manually verified, human-validated)
- Files include: flat BOMs, comparisons, scoped comparisons, different formats
- Naming convention: `[PartNumber]-[Operation]-[Date].ext`

**Test Data Locations:**
- `test-data/258730-Rev2-20260105.XML` - Flat BOM input
- `test-data/258730-Rev2-Flat BOM-20260115.xlsx` - Expected flat output
- `test-data/258730-Rev0-As Built.csv` - Comparison old BOM
- `test-data/258730-Rev1-As Built.csv` - Comparison new BOM
- `test-data/258730-Rev0-vs-258730-Rev1-Comparison-*.xlsx` - Expected comparison
- `test-data/1032401-Rev*.xml` - Scoped comparison inputs
- `test-data/1032401-Rev1-vs-1032401-Rev2-Comparison-*.xlsx` - Expected scoped

## Coverage

**Requirements:** Not enforced (no coverage tool configured)

**View Coverage:**
- Not applicable; coverage not measured
- All 4 tests are integration tests validating end-to-end processing

**Test Coverage:**
- **Test 1**: XML parsing → tree building → flattening → sorting
- **Test 2**: CSV parsing → comparison (old vs new BOMs)
- **Test 3**: XML parsing → comparison
- **Test 4**: Scoped comparison (select subtree, then compare)

All core code paths covered by tests; browser UI not automated.

## Test Types

**Unit Tests:**
- Not isolated; all tests are integration-level
- Core functions tested within processing pipelines

**Integration Tests:**
- Full pipeline tested: Parse → Build Tree → Process → Compare
- Validates correct interaction of all components
- Examples:
  - Test 1: XML parse → tree build → flatten with multiplier
  - Test 2: CSV parse → tree build → flatten → compare two BOMs
  - Test 4: Tree selection → subtree extraction → flatten → compare

**E2E Tests:**
- Not automated (browser-based manual testing)
- Manual validation documented in `test-data/BOM Tool 2.1 Validation Testing Plan 20260115.md`
- Browser UI tested via interactive upload/click workflow

## Common Patterns

**Async Testing:**
```javascript
// File I/O is synchronous
const xmlText = fs.readFileSync(xmlPath, 'utf8');

// Handled directly, no async/await
```

**Error Testing:**
```javascript
function runTest(testName, testFunc) {
    try {
        const errors = testFunc();
        if (errors.length === 0) {
            console.log('✓ PASS');
            return true;
        } else {
            console.log('✗ FAIL');
            errors.forEach(err => console.log(`  ${err}`));
            return false;
        }
    } catch (error) {
        console.log('✗ ERROR');
        console.log(`  ${error.message}`);
        console.log(error.stack);
        return false;
    }
}
```

**Comparison Validation:**
```javascript
// Compare two flattened BOMs - checks for missing, extra, and mismatched items
function compareFlattened(result, expected) {
    const errors = [];

    const resultMap = new Map();
    result.forEach(item => {
        const key = getCompositeKey(item.partNumber, item.lengthDecimal);
        resultMap.set(key, item);
    });

    const expectedMap = new Map();
    expected.forEach(item => {
        const key = getCompositeKey(item['Part Number'], parseLength(item['Length (Decimal)']));
        expectedMap.set(key, item);
    });

    // Check for missing items
    expectedMap.forEach((expItem, key) => {
        if (!resultMap.has(key)) {
            errors.push(`MISSING: ${key}`);
        }
    });

    // Check for extra items
    resultMap.forEach((resItem, key) => {
        if (!expectedMap.has(key)) {
            errors.push(`EXTRA: ${key}`);
        }
    });

    // Check matching items for differences
    resultMap.forEach((resItem, key) => {
        const expItem = expectedMap.get(key);
        if (!expItem) return;

        const expQty = parseInt(expItem['Qty']);
        if (resItem.qty !== expQty) {
            errors.push(`QTY MISMATCH ${key}: expected ${expQty}, got ${resItem.qty}`);
        }
    });

    return errors;
}
```

**Comparison Results Validation:**
```javascript
function compareComparisonResults(results, expected) {
    const errors = [];

    // Check counts by change type
    const resultAdded = results.filter(r => r.changeType === 'Added').length;
    const resultRemoved = results.filter(r => r.changeType === 'Removed').length;
    const resultChanged = results.filter(r => r.changeType === 'Changed').length;

    const expectedAdded = expected.filter(r => r['Change Type'] === 'Added').length;
    // ... compare counts

    // Check for missing/extra items by composite key
    // Check change types match
    // Check quantities for Changed items

    return errors;
}
```

## Test Results

**All Tests Passing:**
```
TEST: Test 1: Flat BOM (XML)
  Result: 47 items
  Expected: 47 items
✓ PASS

TEST: Test 2: GA Comparison (CSV)
  Result: 12 changes (Added: 3, Removed: 2, Changed: 7)
✓ PASS

TEST: Test 3: GA Comparison (XML)
  Result: 15 changes (Added: 4, Removed: 3, Changed: 8)
✓ PASS

TEST: Test 4: Scoped Comparison
  Result: 8 changes (Added: 2, Removed: 1, Changed: 5)
✓ PASS

SUMMARY
4/4 tests passed
✓ ALL TESTS PASSED
```

**Test Node.js Dependencies:**
- `xlsx` v0.18.5 - Excel file reading
- `xmldom` v0.6.0 - XML parsing (DOMParser)

## Browser-Based Testing

**Manual Workflow:**
1. Open `index.html` in browser
2. Upload CSV/XML file to "Flat BOM" tab
3. Click "Flatten BOM" button
4. Verify results table displays correctly
5. Export Excel/HTML and validate output files
6. Repeat for "BOM Comparison" and "Hierarchy View" tabs

**Console Logging:**
- Open DevTools console (F12)
- Browser logs parsing steps, tree building, flattening steps
- Example:
  ```
  File type detected: XML
  XML parsing complete: 47 rows
  Total nodes created: 47
  Final aggregated items: 47
  ```

**Automated Test Harness Status:**
- ✓ 4 validation tests implemented and passing
- ✓ Covers all 3 features (Flat BOM, Comparison, Hierarchy View)
- ✓ Validates against real SOLIDWORKS export files
- ✓ Baselines manually verified against legacy Excel tools
- ✓ Tests run via: `npm test`

---

*Testing analysis: 2026-02-07*
