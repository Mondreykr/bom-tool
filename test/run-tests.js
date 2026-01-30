import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { DOMParser } from 'xmldom';

// Get the directory of this script for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.join(__dirname, '..', 'test-data');

// Helper to resolve test data paths
function testDataPath(filename) {
    return path.join(testDataDir, filename);
}

// ============================================================================
// EXTRACTED FUNCTIONS FROM BOM TOOL.HTML
// These are the actual production functions - not reimplementations
// ============================================================================

// Global variables (needed by buildTree)
let rootPartNumber = null;
let rootRevision = null;
let rootDescription = null;

// Parse length (null for empty, "-", or non-numeric)
function parseLength(lengthStr) {
    // Handle numeric input (from Excel)
    if (typeof lengthStr === 'number') {
        return isNaN(lengthStr) ? null : lengthStr;
    }
    // Handle string input (from CSV/XML)
    if (!lengthStr || lengthStr.trim() === '' || lengthStr === '-') {
        return null;
    }
    const num = parseFloat(lengthStr);
    return isNaN(num) ? null : num;
}

// Get parent level from level string
function getParentLevel(level) {
    const parts = level.split('.');
    if (parts.length === 1) return null;
    return parts.slice(0, -1).join('.');
}

// Tree Node Class
class BOMNode {
    constructor(rowData) {
        this.level = rowData.Level;
        this.partNumber = rowData['Part Number'].trim();
        this.componentType = rowData['Component Type'];
        this.description = rowData.Description;
        this.material = rowData.Material;
        this.qty = parseInt(rowData.Qty) || 0;
        this.length = parseLength(rowData.Length);
        this.uofm = rowData.UofM;
        this.state = rowData.State;
        this.purchaseDescription = rowData['Purchase Description'];
        this.nsItemType = rowData['NS Item Type'];
        this.revision = rowData.Revision;
        this.children = [];
    }
}

// Build tree from CSV data
function buildTree(rows) {
    const nodes = new Map();

    // Pass 1: Create all nodes
    rows.forEach((row) => {
        const node = new BOMNode(row);
        nodes.set(node.level, node);
    });

    // Pass 2: Link children to parents
    nodes.forEach((node, level) => {
        const parentLevel = getParentLevel(level);
        if (parentLevel !== null) {
            const parent = nodes.get(parentLevel);
            if (!parent) {
                throw new Error(`Parent ${parentLevel} not found for ${level}`);
            }
            parent.children.push(node);
        }
    });

    // Get root
    const root = nodes.get('1');
    if (!root) {
        throw new Error("No root node (Level '1') found");
    }

    // Capture root info
    rootPartNumber = root.partNumber;
    rootRevision = root.revision;
    rootDescription = root.description;

    return root;
}

// Generate composite key
function getCompositeKey(partNumber, length) {
    if (length === null) {
        return partNumber;
    }
    return `${partNumber}|${length}`;
}

// Convert decimal to fractional (1/16" increments with reduction)
function decimalToFractional(decimal) {
    if (decimal === null) return '';

    // Round to nearest 1/16"
    const sixteenths = Math.round(decimal * 16);
    const wholePart = Math.floor(sixteenths / 16);
    const fractionalPart = sixteenths % 16;

    // No fraction
    if (fractionalPart === 0) {
        return wholePart + '"';
    }

    // Reduce fraction using GCD
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(fractionalPart, 16);
    const numerator = fractionalPart / divisor;
    const denominator = 16 / divisor;

    // Format
    if (wholePart === 0) {
        return `${numerator}/${denominator}"`;
    } else {
        return `${wholePart}-${numerator}/${denominator}"`;
    }
}

// Flatten BOM with recursive aggregation
function flattenBOM(rootNode, unitQty) {
    const aggregatedItems = new Map();

    function traverse(node, multiplier) {
        const effectiveQty = node.qty * multiplier;

        // Only add non-assembly items to output
        if (node.componentType !== 'Assembly') {
            const compositeKey = getCompositeKey(node.partNumber, node.length);

            if (aggregatedItems.has(compositeKey)) {
                aggregatedItems.get(compositeKey).qty += effectiveQty;
            } else {
                // Concatenate Description + Material (if material is not empty or hyphen)
                let finalDescription = node.description;
                if (node.material && node.material.trim() !== '' && node.material.trim() !== '-') {
                    finalDescription = node.description + ', ' + node.material;
                }

                aggregatedItems.set(compositeKey, {
                    partNumber: node.partNumber,
                    componentType: node.componentType,
                    description: finalDescription,
                    material: node.material,
                    qty: effectiveQty,
                    lengthDecimal: node.length,
                    lengthFractional: decimalToFractional(node.length),
                    uofm: node.uofm,
                    state: node.state,
                    purchaseDescription: node.purchaseDescription,
                    nsItemType: node.nsItemType,
                    revision: node.revision
                });
            }
        }

        // Always traverse children
        node.children.forEach(child => {
            traverse(child, effectiveQty);
        });
    }

    traverse(rootNode, unitQty);

    return Array.from(aggregatedItems.values());
}

// Sort BOM (Component Type → Description → Length)
function sortBOM(items) {
    return items.sort((a, b) => {
        // Primary: Component Type
        if (a.componentType !== b.componentType) {
            return a.componentType.localeCompare(b.componentType);
        }

        // Secondary: Description
        if (a.description !== b.description) {
            return a.description.localeCompare(b.description, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        }

        // Tertiary: Length (numeric, nulls last)
        if (a.lengthDecimal === null && b.lengthDecimal === null) return 0;
        if (a.lengthDecimal === null) return 1;
        if (b.lengthDecimal === null) return -1;
        return a.lengthDecimal - b.lengthDecimal;
    });
}

// Parse XML to array of row objects
function parseXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new Error('Invalid XML format');
    }

    const rows = [];

    const transaction = xmlDoc.getElementsByTagName('transaction')[0];
    if (!transaction) {
        throw new Error('No transaction element found');
    }

    const rootDoc = transaction.getElementsByTagName('document')[0];
    if (!rootDoc) {
        throw new Error('No root document found in XML');
    }

    // Recursive function to traverse XML hierarchy
    function traverseDocument(docElement, level, startIndex, isRoot = false) {
        const configs = docElement.getElementsByTagName('configuration');
        if (configs.length === 0) {
            return startIndex;
        }

        let childIndex = startIndex;

        // Process each configuration
        for (let configIdx = 0; configIdx < configs.length; configIdx++) {
            const config = configs[configIdx];

            // Skip nested configurations (only direct children)
            if (config.parentNode !== docElement) continue;

            const currentLevel = isRoot && configIdx === 0 ? level : level + '.' + childIndex;

            // Extract attributes
            const attributes = {};
            const attrs = config.getElementsByTagName('attribute');
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (attr.parentNode === config) {
                    const name = attr.getAttribute('name');
                    const value = attr.getAttribute('value');
                    attributes[name] = value;
                }
            }

            // Create row object
            const row = {
                'Level': currentLevel,
                'Part Number': attributes['Part Number'] || '',
                'Component Type': attributes['Component-Type'] || '',
                'Description': attributes['Description'] || '',
                'Material': attributes['Material'] || '',
                'Qty': attributes['Reference Count (BOM Quantity disregarded)'] || '1',
                'Length': attributes['Length'] || '',
                'UofM': attributes['Unit of Measure'] || '',
                'State': attributes['State'] || '',
                'Purchase Description': attributes['Purchase Description'] || '',
                'NS Item Type': attributes['NS Item Type'] || '',
                'Revision': attributes['Revision'] || ''
            };

            rows.push(row);

            if (!isRoot || configIdx > 0) {
                childIndex++;
            }

            // Process children (references)
            const references = config.getElementsByTagName('references');
            if (references.length > 0 && references[0].parentNode === config) {
                const childDocs = references[0].getElementsByTagName('document');
                for (let i = 0; i < childDocs.length; i++) {
                    if (childDocs[i].parentNode === references[0]) {
                        childIndex = traverseDocument(childDocs[i], currentLevel, childIndex, false);
                    }
                }
            }
        }

        return childIndex;
    }

    traverseDocument(rootDoc, '1', 1, true);

    return rows;
}

// Parse CSV file
function parseCSV(filePath) {
    const buffer = fs.readFileSync(filePath);

    // Try UTF-16LE decoding
    let csvText;
    try {
        csvText = buffer.toString('utf16le');
        // Remove BOM if present
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }
    } catch (e) {
        // Fallback to UTF-8
        csvText = buffer.toString('utf8');
    }

    // Use XLSX to parse CSV
    const workbook = XLSX.read(csvText, {
        type: 'string',
        raw: true,
        cellText: true,
        cellDates: false
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: ''
    });

    return data;
}

// ============================================================================
// COMPARISON FUNCTIONS (for Tests 2, 3, 4)
// ============================================================================

// Compare two flattened BOMs and return comparison results
function compareBOMs(oldFlattened, newFlattened) {
    const oldMap = new Map();
    const newMap = new Map();
    const results = [];

    // Build maps with composite keys
    oldFlattened.forEach(item => {
        const key = getCompositeKey(item.partNumber, item.lengthDecimal);
        oldMap.set(key, item);
    });

    newFlattened.forEach(item => {
        const key = getCompositeKey(item.partNumber, item.lengthDecimal);
        newMap.set(key, item);
    });

    // Find Added items (in new but not in old)
    newMap.forEach((newItem, key) => {
        if (!oldMap.has(key)) {
            results.push({
                changeType: 'Added',
                partNumber: newItem.partNumber,
                componentType: newItem.componentType,
                oldDescription: null,
                newDescription: newItem.description,
                lengthDecimal: newItem.lengthDecimal,
                oldQty: null,
                newQty: newItem.qty,
                deltaQty: null
            });
        }
    });

    // Find Changed items (in both, check for differences)
    oldMap.forEach((oldItem, key) => {
        const newItem = newMap.get(key);
        if (newItem) {
            const qtyChanged = oldItem.qty !== newItem.qty;
            const descChanged = oldItem.description !== newItem.description;
            const purDescChanged = oldItem.purchaseDescription !== newItem.purchaseDescription;

            if (qtyChanged || descChanged || purDescChanged) {
                results.push({
                    changeType: 'Changed',
                    partNumber: oldItem.partNumber,
                    componentType: oldItem.componentType || newItem.componentType,
                    oldDescription: oldItem.description,
                    newDescription: newItem.description,
                    lengthDecimal: oldItem.lengthDecimal,
                    oldQty: oldItem.qty,
                    newQty: newItem.qty,
                    deltaQty: newItem.qty - oldItem.qty
                });
            }
        }
    });

    // Find Removed items (in old but not in new)
    oldMap.forEach((oldItem, key) => {
        if (!newMap.has(key)) {
            results.push({
                changeType: 'Removed',
                partNumber: oldItem.partNumber,
                componentType: oldItem.componentType,
                oldDescription: oldItem.description,
                newDescription: null,
                lengthDecimal: oldItem.lengthDecimal,
                oldQty: oldItem.qty,
                newQty: null,
                deltaQty: null
            });
        }
    });

    return results;
}

// Find a node in the tree by part number
function findNodeByPartNumber(node, targetPartNumber) {
    if (node.partNumber === targetPartNumber) {
        return node;
    }
    for (const child of node.children) {
        const found = findNodeByPartNumber(child, targetPartNumber);
        if (found) return found;
    }
    return null;
}

// Extract a subtree for scoped comparison (clone with Qty 1 at root)
function extractSubtree(node) {
    function cloneNode(n, isRoot = false) {
        const clone = new BOMNode({
            Level: n.level,
            'Part Number': n.partNumber,
            'Component Type': n.componentType,
            Description: n.description,
            Material: n.material,
            Qty: isRoot ? 1 : n.qty,
            Length: n.length,
            UofM: n.uofm,
            State: n.state,
            'Purchase Description': n.purchaseDescription,
            'NS Item Type': n.nsItemType,
            Revision: n.revision
        });
        clone.children = n.children.map(child => cloneNode(child, false));
        return clone;
    }
    return cloneNode(node, true);
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
    });

    return errors;
}

function runTest(testName, testFunc) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${testName}`);
    console.log('='.repeat(60));

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

// ============================================================================
// TEST CASES
// ============================================================================

function test1_FlatBOM_XML() {
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

function test2_Comparison_CSV() {
    console.log('  Old BOM: 258730-Rev0-As Built.csv');
    console.log('  New BOM: 258730-Rev1-As Built.csv');
    console.log('  Expected: 258730-Rev0-vs-258730-Rev1-Comparison-20251128 (from BOM Tool-2.2).xlsx');

    // Parse old BOM
    const oldRows = parseCSV(testDataPath('258730-Rev0-As Built.csv'));
    const oldTree = buildTree(oldRows);
    const oldFlattened = flattenBOM(oldTree, 1);

    // Parse new BOM
    const newRows = parseCSV(testDataPath('258730-Rev1-As Built.csv'));
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

function test3_Comparison_XML() {
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

function test4_ScopedComparison() {
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

results.push(runTest('Test 1: Flat BOM (XML)', test1_FlatBOM_XML));
results.push(runTest('Test 2: GA Comparison (CSV)', test2_Comparison_CSV));
results.push(runTest('Test 3: GA Comparison (XML)', test3_Comparison_XML));
results.push(runTest('Test 4: Scoped Comparison', test4_ScopedComparison));

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
