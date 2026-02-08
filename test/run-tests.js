import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { BOMNode, buildTree, getRootPartNumber, getRootRevision, getRootDescription } from '../js/core/tree.js';
import { flattenBOM, sortBOM } from '../js/core/flatten.js';
import { parseXML, parseCSV } from '../js/core/parser.js';
import { compareBOMs, findNodeByPartNumber, extractSubtree } from '../js/core/compare.js';
import { parseLength, getCompositeKey, decimalToFractional } from '../js/core/utils.js';

// Get the directory of this script for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.join(__dirname, '..', 'test-data');

// Helper to resolve test data paths
function testDataPath(filename) {
    return path.join(testDataDir, filename);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

function compareFlattened(result, expected) {
    const errors = [];

    // Create maps for easier comparison
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

        // Compare quantities
        const expQty = parseInt(expItem['Qty']);
        if (resItem.qty !== expQty) {
            errors.push(`QTY MISMATCH ${key}: expected ${expQty}, got ${resItem.qty}`);
        }

        // Compare descriptions (normalize whitespace)
        const expDesc = expItem['Description']?.trim();
        const resDesc = resItem.description?.trim();
        if (resDesc !== expDesc) {
            errors.push(`DESC MISMATCH ${key}:\n  Expected: "${expDesc}"\n  Got: "${resDesc}"`);
        }

        // Compare Component Type
        const expCompType = expItem['Component Type']?.trim() || '';
        const resCompType = resItem.componentType?.trim() || '';
        if (resCompType !== expCompType) {
            errors.push(`COMPONENT TYPE MISMATCH ${key}: expected "${expCompType}", got "${resCompType}"`);
        }

        // Compare Purchase Description (normalize tabs to spaces — Excel converts tabs on export)
        const expPurDesc = (expItem['Purchase Description'] || '').trim().replace(/\t/g, ' ');
        const resPurDesc = (resItem.purchaseDescription || '').trim().replace(/\t/g, ' ');
        if (resPurDesc !== expPurDesc) {
            errors.push(`PURCHASE DESC MISMATCH ${key}:\n  Expected: "${expPurDesc.substring(0, 60)}..."\n  Got: "${resPurDesc.substring(0, 60)}..."`);
        }

        // Compare Length (Fractional)
        const expLenFrac = expItem['Length (Fractional)']?.trim() || '';
        const resLenFrac = resItem.lengthFractional?.trim() || '';
        if (resLenFrac !== expLenFrac) {
            errors.push(`LENGTH FRAC MISMATCH ${key}: expected "${expLenFrac}", got "${resLenFrac}"`);
        }

        // Compare Unit of Measure
        const expUofm = expItem['UofM']?.trim() || '';
        const resUofm = resItem.uofm?.trim() || '';
        if (resUofm !== expUofm) {
            errors.push(`UOFM MISMATCH ${key}: expected "${expUofm}", got "${resUofm}"`);
        }

        // Compare State
        const expState = expItem['State']?.trim() || '';
        const resState = resItem.state?.trim() || '';
        if (resState !== expState) {
            errors.push(`STATE MISMATCH ${key}: expected "${expState}", got "${resState}"`);
        }

        // Compare Revision
        const expRev = expItem['Revision']?.trim() || '';
        const resRev = resItem.revision?.trim() || '';
        if (resRev !== expRev) {
            errors.push(`REVISION MISMATCH ${key}: expected "${expRev}", got "${resRev}"`);
        }

        // Compare NS Item Type
        const expNsType = expItem['NS Item Type']?.trim() || '';
        const resNsType = resItem.nsItemType?.trim() || '';
        if (resNsType !== expNsType) {
            errors.push(`NS ITEM TYPE MISMATCH ${key}: expected "${expNsType}", got "${resNsType}"`);
        }
    });

    return errors;
}

// Compare comparison results against expected Excel output
function compareComparisonResults(results, expected) {
    const errors = [];

    // Build maps by composite key
    const resultMap = new Map();
    results.forEach(item => {
        const key = getCompositeKey(item.partNumber, item.lengthDecimal);
        resultMap.set(key, item);
    });

    const expectedMap = new Map();
    expected.forEach(item => {
        const key = getCompositeKey(item['Part Number'], parseLength(item['Length (Decimal)']));
        expectedMap.set(key, item);
    });

    // Check counts by change type
    const resultAdded = results.filter(r => r.changeType === 'Added').length;
    const resultRemoved = results.filter(r => r.changeType === 'Removed').length;
    const resultChanged = results.filter(r => r.changeType === 'Changed').length;

    const expectedAdded = expected.filter(r => r['Change Type'] === 'Added').length;
    const expectedRemoved = expected.filter(r => r['Change Type'] === 'Removed').length;
    const expectedChanged = expected.filter(r => r['Change Type'] === 'Changed').length;

    if (resultAdded !== expectedAdded) {
        errors.push(`ADDED COUNT: expected ${expectedAdded}, got ${resultAdded}`);
    }
    if (resultRemoved !== expectedRemoved) {
        errors.push(`REMOVED COUNT: expected ${expectedRemoved}, got ${resultRemoved}`);
    }
    if (resultChanged !== expectedChanged) {
        errors.push(`CHANGED COUNT: expected ${expectedChanged}, got ${resultChanged}`);
    }

    // Check for missing items
    expectedMap.forEach((expItem, key) => {
        if (!resultMap.has(key)) {
            errors.push(`MISSING: ${key} (${expItem['Change Type']})`);
        }
    });

    // Check for extra items
    resultMap.forEach((resItem, key) => {
        if (!expectedMap.has(key)) {
            errors.push(`EXTRA: ${key} (${resItem.changeType})`);
        }
    });

    // Check matching items for change type and qty differences
    resultMap.forEach((resItem, key) => {
        const expItem = expectedMap.get(key);
        if (!expItem) return;

        // Check change type matches
        if (resItem.changeType !== expItem['Change Type']) {
            errors.push(`CHANGE TYPE MISMATCH ${key}: expected "${expItem['Change Type']}", got "${resItem.changeType}"`);
        }

        // Check Component Type
        const expCompType = expItem['Component Type']?.trim() || '';
        const resCompType = resItem.componentType?.trim() || '';
        if (resCompType !== expCompType) {
            errors.push(`COMPONENT TYPE MISMATCH ${key}: expected "${expCompType}", got "${resCompType}"`);
        }

        // Check quantities for Changed items
        if (resItem.changeType === 'Changed') {
            const expOldQty = parseInt(expItem['Old Qty']) || 0;
            const expNewQty = parseInt(expItem['New Qty']) || 0;
            if (resItem.oldQty !== expOldQty) {
                errors.push(`OLD QTY MISMATCH ${key}: expected ${expOldQty}, got ${resItem.oldQty}`);
            }
            if (resItem.newQty !== expNewQty) {
                errors.push(`NEW QTY MISMATCH ${key}: expected ${expNewQty}, got ${resItem.newQty}`);
            }
        }

        // Check Old/New Descriptions
        if (resItem.changeType === 'Changed' || resItem.changeType === 'Removed') {
            const expOldDesc = expItem['Old Description']?.trim() || '';
            const resOldDesc = resItem.oldDescription?.trim() || '';
            if (resOldDesc !== expOldDesc) {
                errors.push(`OLD DESC MISMATCH ${key}:\n  Expected: "${expOldDesc.substring(0, 60)}"\n  Got: "${resOldDesc.substring(0, 60)}"`);
            }
        }
        if (resItem.changeType === 'Changed' || resItem.changeType === 'Added') {
            const expNewDesc = expItem['New Description']?.trim() || '';
            const resNewDesc = resItem.newDescription?.trim() || '';
            if (resNewDesc !== expNewDesc) {
                errors.push(`NEW DESC MISMATCH ${key}:\n  Expected: "${expNewDesc.substring(0, 60)}"\n  Got: "${resNewDesc.substring(0, 60)}"`);
            }
        }

        // Check Purchase Descriptions (normalize tabs to spaces — Excel converts tabs on export)
        if (resItem.changeType === 'Changed' || resItem.changeType === 'Removed') {
            const expOldPurDesc = (expItem['Old Purchase Description'] || '').trim().replace(/\t/g, ' ');
            const resOldPurDesc = (resItem.oldPurchaseDescription || '').trim().replace(/\t/g, ' ');
            if (resOldPurDesc !== expOldPurDesc) {
                errors.push(`OLD PURCHASE DESC MISMATCH ${key}:\n  Expected: "${expOldPurDesc.substring(0, 60)}"\n  Got: "${resOldPurDesc.substring(0, 60)}"`);
            }
        }
        if (resItem.changeType === 'Changed' || resItem.changeType === 'Added') {
            const expNewPurDesc = (expItem['New Purchase Description'] || '').trim().replace(/\t/g, ' ');
            const resNewPurDesc = (resItem.newPurchaseDescription || '').trim().replace(/\t/g, ' ');
            if (resNewPurDesc !== expNewPurDesc) {
                errors.push(`NEW PURCHASE DESC MISMATCH ${key}:\n  Expected: "${expNewPurDesc.substring(0, 60)}"\n  Got: "${resNewPurDesc.substring(0, 60)}"`);
            }
        }
    });

    return errors;
}

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

// ============================================================================
// TEST CASES
// ============================================================================

async function test1_FlatBOM_XML() {
    console.log('  Input: 258730-Rev2-20260105.XML');
    console.log('  Expected: 258730-Rev2-Flat BOM-20260115.xlsx');

    // Parse input
    const xmlPath = testDataPath('258730-Rev2-20260105.XML');
    const xmlText = fs.readFileSync(xmlPath, 'utf8');
    const rows = parseXML(xmlText);

    // Build tree and flatten
    const root = buildTree(rows);
    const flattened = flattenBOM(root, 1);
    const sorted = sortBOM(flattened);

    // Load expected output
    const expectedPath = testDataPath('258730-Rev2-Flat BOM-20260115.xlsx');
    const workbook = XLSX.readFile(expectedPath);
    const sheetName = workbook.SheetNames[0];
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`  Result: ${sorted.length} items`);
    console.log(`  Expected: ${expected.length} items`);

    return compareFlattened(sorted, expected);
}

async function test2_Comparison_CSV() {
    console.log('  Old BOM: 258730-Rev0-As Built.csv');
    console.log('  New BOM: 258730-Rev1-As Built.csv');
    console.log('  Expected: 258730-Rev0-vs-258730-Rev1-Comparison-20251128 (from BOM Tool-2.2).xlsx');

    // Parse old BOM
    const oldRows = await parseCSV(testDataPath('258730-Rev0-As Built.csv'));
    const oldTree = buildTree(oldRows);
    const oldFlattened = flattenBOM(oldTree, 1);

    // Parse new BOM
    const newRows = await parseCSV(testDataPath('258730-Rev1-As Built.csv'));
    const newTree = buildTree(newRows);
    const newFlattened = flattenBOM(newTree, 1);

    // Compare
    const results = compareBOMs(oldFlattened, newFlattened);

    // Load expected output
    const expectedPath = testDataPath('258730-Rev0-vs-258730-Rev1-Comparison-20251128 (from BOM Tool-2.2).xlsx');
    const workbook = XLSX.readFile(expectedPath);
    const sheetName = workbook.SheetNames[0];
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`  Result: ${results.length} changes (Added: ${results.filter(r => r.changeType === 'Added').length}, Removed: ${results.filter(r => r.changeType === 'Removed').length}, Changed: ${results.filter(r => r.changeType === 'Changed').length})`);
    console.log(`  Expected: ${expected.length} changes`);

    return compareComparisonResults(results, expected);
}

async function test3_Comparison_XML() {
    console.log('  Old BOM: 258754-Rev0-20251220.XML');
    console.log('  New BOM: 258754-Rev1-20260112.XML');
    console.log('  Expected: 258754-Rev0-vs-258754-Rev1-Comparison-20260115.xlsx');

    // Parse old BOM
    const oldXml = fs.readFileSync(testDataPath('258754-Rev0-20251220.XML'), 'utf8');
    const oldRows = parseXML(oldXml);
    const oldTree = buildTree(oldRows);
    const oldFlattened = flattenBOM(oldTree, 1);

    // Parse new BOM
    const newXml = fs.readFileSync(testDataPath('258754-Rev1-20260112.XML'), 'utf8');
    const newRows = parseXML(newXml);
    const newTree = buildTree(newRows);
    const newFlattened = flattenBOM(newTree, 1);

    // Compare
    const results = compareBOMs(oldFlattened, newFlattened);

    // Load expected output
    const expectedPath = testDataPath('258754-Rev0-vs-258754-Rev1-Comparison-20260115.xlsx');
    const workbook = XLSX.readFile(expectedPath);
    const sheetName = workbook.SheetNames[0];
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`  Result: ${results.length} changes (Added: ${results.filter(r => r.changeType === 'Added').length}, Removed: ${results.filter(r => r.changeType === 'Removed').length}, Changed: ${results.filter(r => r.changeType === 'Changed').length})`);
    console.log(`  Expected: ${expected.length} changes`);

    return compareComparisonResults(results, expected);
}

async function test4_ScopedComparison() {
    console.log('  Old BOM: 258730-Rev2-20260105.xml → select 1032401');
    console.log('  New BOM: 258730-Rev2-20260112.xml → select 1032401');
    console.log('  Expected: 1032401-Rev1-vs-1032401-Rev2-Comparison-20260115.xlsx');

    // Parse old GA BOM
    const oldXml = fs.readFileSync(testDataPath('258730-Rev2-20260105.XML'), 'utf8');
    const oldRows = parseXML(oldXml);
    const oldTree = buildTree(oldRows);

    // Parse new GA BOM
    const newXml = fs.readFileSync(testDataPath('258730-Rev2-20260112.XML'), 'utf8');
    const newRows = parseXML(newXml);
    const newTree = buildTree(newRows);

    // Find the 1032401 assembly in each tree
    const oldSubassembly = findNodeByPartNumber(oldTree, '1032401');
    const newSubassembly = findNodeByPartNumber(newTree, '1032401');

    if (!oldSubassembly) {
        return ['Could not find 1032401 in old BOM tree'];
    }
    if (!newSubassembly) {
        return ['Could not find 1032401 in new BOM tree'];
    }

    console.log(`  Found 1032401 in old BOM at level ${oldSubassembly.level}`);
    console.log(`  Found 1032401 in new BOM at level ${newSubassembly.level}`);

    // Extract subtrees with Qty 1 at root
    const oldSubtree = extractSubtree(oldSubassembly);
    const newSubtree = extractSubtree(newSubassembly);

    // Flatten scoped subtrees
    const oldFlattened = flattenBOM(oldSubtree, 1);
    const newFlattened = flattenBOM(newSubtree, 1);

    console.log(`  Old scope flattened: ${oldFlattened.length} items`);
    console.log(`  New scope flattened: ${newFlattened.length} items`);

    // Compare
    const results = compareBOMs(oldFlattened, newFlattened);

    // Load expected output (comparison of 1032401 directly)
    const expectedPath = testDataPath('1032401-Rev1-vs-1032401-Rev2-Comparison-20260115.xlsx');
    const workbook = XLSX.readFile(expectedPath);
    const sheetName = workbook.SheetNames[0];
    const expected = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`  Result: ${results.length} changes (Added: ${results.filter(r => r.changeType === 'Added').length}, Removed: ${results.filter(r => r.changeType === 'Removed').length}, Changed: ${results.filter(r => r.changeType === 'Changed').length})`);
    console.log(`  Expected: ${expected.length} changes`);

    return compareComparisonResults(results, expected);
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('BOM TOOL 2.1 VALIDATION TESTS');
console.log('='.repeat(60));

const results = [];

results.push(await runTest('Test 1: Flat BOM (XML)', test1_FlatBOM_XML));
results.push(await runTest('Test 2: GA Comparison (CSV)', test2_Comparison_CSV));
results.push(await runTest('Test 3: GA Comparison (XML)', test3_Comparison_XML));
results.push(await runTest('Test 4: Scoped Comparison', test4_ScopedComparison));

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
const passed = results.filter(r => r).length;
const total = results.length;
console.log(`${passed}/${total} tests passed`);

if (passed === total) {
    console.log('\n✓ ALL TESTS PASSED');
    process.exit(0);
} else {
    console.log(`\n✗ ${total - passed} TEST(S) FAILED`);
    process.exit(1);
}
