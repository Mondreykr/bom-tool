# Testing Patterns

**Analysis Date:** 2026-02-10

## Test Framework

**Runner:**
- Node.js (no npm test script; run manually via `cd test && node run-tests.js`)
- No Jest, Vitest, or other testing framework
- Custom test runner written in `test/run-tests.js`

**Assertion Library:**
- No assertion library used
- Manual comparison functions: `compareFlattened()` and `compareComparisonResults()`
- Functions return array of error strings; empty array = pass, non-empty = fail

**Run Commands:**
```bash
cd test && node run-tests.js              # Run all 4 automated validation tests
```

Tests only run in Node.js environment (access to fs, file paths, and file system operations). No browser-based tests configured.

## Test File Organization

**Location:**
- Test file: `test/run-tests.js`
- Test data files: `test-data/` directory (relative to project root)
- Test data includes XML, CSV, and Excel reference files

**Naming:**
- Test runner: `run-tests.js`
- Tests named: `test1_FlatBOM_XML()`, `test2_Comparison_CSV()`, `test3_Comparison_XML()`, `test4_ScopedComparison()`
- Pattern: `test{N}_{Feature}_{Format}()`

**Structure:**
```
test/
├── run-tests.js             # Test runner (defines test functions, executes them)
├── node_modules/            # Dependencies (xlsx, xmldom for Node.js testing)
└── package.json             # Minimal package.json with xlsx, xmldom

test-data/
├── 258730-Rev2-20260105.XML                           # Test input (XML)
├── 258730-Rev2-Flat BOM-20260115.xlsx                 # Expected output (Excel reference)
├── 258730-Rev0-As Built.csv                           # Test input (CSV, old)
├── 258730-Rev1-As Built.csv                           # Test input (CSV, new)
├── 258730-Rev0-vs-258730-Rev1-Comparison-*.xlsx       # Expected comparison output
├── 258754-Rev0-20251220.XML                           # Test input (XML, old)
├── 258754-Rev1-20260112.XML                           # Test input (XML, new)
├── 258754-Rev0-vs-258754-Rev1-Comparison-*.xlsx       # Expected comparison output
└── 1032401-Rev1-vs-1032401-Rev2-Comparison-*.xlsx     # Expected scoped comparison output
```

## Test Structure

**Suite Organization:**
```javascript
async function runTest(testName, testFunc) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${testName}`);
    console.log('='.repeat(60));

    try {
        const errors = await testFunc();
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

**Patterns:**
- Wrapper function `runTest()` executes test function and collects error output
- Each test function returns Promise<Array<string>> (errors array)
- Tests run sequentially via `await`:
  ```javascript
  results.push(await runTest('Test 1: Flat BOM (XML)', test1_FlatBOM_XML));
  results.push(await runTest('Test 2: GA Comparison (CSV)', test2_Comparison_CSV));
  results.push(await runTest('Test 3: GA Comparison (XML)', test3_Comparison_XML));
  results.push(await runTest('Test 4: Scoped Comparison', test4_ScopedComparison));
  ```
- Summary printed at end with counts: `${passed}/${total} tests passed`
- Exit code reflects status: `process.exit(0)` for pass, `process.exit(1)` for fail

## Mocking

**Framework:** None

**Patterns:**
- No mocking used; tests use real file I/O and actual XML/CSV parsing
- Test data files loaded from disk via `fs.readFileSync()`
- External library (XLSX) used directly for comparison (not mocked)

**What to Mock:**
- Not applicable (no mocking framework available)

**What NOT to Mock:**
- File operations: tests must read actual test data files
- XML/CSV parsing: must test actual parser behavior against real files
- Excel workbook operations: must use real XLSX library to read expected outputs

## Fixtures and Factories

**Test Data:**
- Test data files stored in `test-data/` directory
- Files loaded as-is (no data generation or transformation)
- Reference outputs stored as Excel files (output of legacy Excel tools, now validated against)

**Location:**
- `test-data/`: Test input and expected output files
- Helper function to construct paths:
  ```javascript
  const __dirname = path.dirname(__filename);
  const testDataDir = path.join(__dirname, '..', 'test-data');

  function testDataPath(filename) {
      return path.join(testDataDir, filename);
  }
  ```

## Coverage

**Requirements:** No coverage requirement enforced

**View Coverage:** No coverage tool configured

## Test Types

**Unit Tests:**
- Not separated from integration tests
- Each test (`test1`, `test2`, `test3`, `test4`) exercises full pipeline:
  1. Load file from disk
  2. Parse (XML or CSV)
  3. Build tree structure
  4. Flatten or compare BOM
  5. Validate against Excel reference output

**Integration Tests:**
- All 4 test cases are integration tests
- Test 1: Flat BOM (XML) - Tests parsing → tree building → flattening
- Test 2: BOM Comparison (CSV) - Tests CSV parsing → dual tree building → comparison
- Test 3: BOM Comparison (XML) - Tests XML parsing → dual tree building → comparison
- Test 4: Scoped Comparison - Tests tree navigation → subtree extraction → scoped flattening → comparison

**E2E Tests:**
- Not automated (manual browser testing required due to ES6 modules and HTTP serving requirement)
- Browser testing must be done via deployed GitHub Pages or local HTTP server

## Common Patterns

**Async Testing:**
```javascript
async function test1_FlatBOM_XML() {
    const xmlPath = testDataPath('258730-Rev2-20260105.XML');
    const xmlText = fs.readFileSync(xmlPath, 'utf8');
    const rows = parseXML(xmlText);

    const root = buildTree(rows);
    const flattened = flattenBOM(root, 1);
    const sorted = sortBOM(flattened);

    const expectedPath = testDataPath('258730-Rev2-Flat BOM-20260115.xlsx');
    const workbook = XLSX.readFile(expectedPath);
    const sheetName = workbook.SheetNames[0];
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    return compareFlattened(sorted, expected);
}
```
- All test functions are async (return Promise) even if they don't use await
- File operations are synchronous (fs.readFileSync)
- Data transformations are synchronous; only parsing is async-capable

**Error Testing:**
```javascript
try {
    const errors = await testFunc();
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
```
- Exceptions caught and logged with message and stack trace
- Distinction between test logic errors (`errors.length > 0`) and runtime errors (thrown exceptions)
- Both result in test failure but logged differently

**Comparison Functions:**
```javascript
function compareFlattened(result, expected) {
    const errors = [];

    // Build maps for efficient lookup
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

    // Check for missing items, extra items, and mismatches
    expectedMap.forEach((expItem, key) => {
        if (!resultMap.has(key)) {
            errors.push(`MISSING: ${key}`);
        }
    });

    // ... field-by-field comparison with whitespace normalization
    // Compare: Qty, Description, Component Type, Purchase Description, Length (Fractional), UofM, State, Revision, NS Item Type

    return errors;
}
```
- Comparison functions collect all errors, not just first one
- Uses composite keys for matching items across outputs
- Normalizes whitespace (trim, replace tabs with spaces) for robust comparison
- Returns array of error strings describing mismatches

---

*Testing analysis: 2026-02-10*
