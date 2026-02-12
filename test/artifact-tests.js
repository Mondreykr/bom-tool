import { BOMNode } from '../js/core/tree.js';
import { exportArtifact, computeHash, generateFilename, suggestRevision, suggestJobNumber, importArtifact, validateArtifact } from '../js/core/artifact.js';
import { mergeBOM } from '../js/core/merge.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a BOMNode from simplified parameters for testing.
 * Provides sensible defaults for fields not relevant to artifact logic.
 */
function makeNode({
    partNumber,
    componentType = 'Assembly',
    state = 'Issued for Purchasing',
    qty = 1,
    description = '',
    revision = 'A',
    children = [],
    _source = undefined,
    _changes = undefined
}) {
    // Create a minimal rowData object that BOMNode constructor expects
    const rowData = {
        Level: '1',
        'Part Number': partNumber,
        'Component Type': componentType,
        Description: description,
        Material: '',
        Qty: String(qty),
        Length: '',
        UofM: '',
        State: state,
        'Purchase Description': '',
        'NS Item Type': componentType === 'Assembly' ? 'Assembly Item' : 'Inventory Item',
        Revision: revision
    };

    const node = new BOMNode(rowData);
    node.children = children;

    // Add ephemeral tags if provided
    if (_source) node._source = _source;
    if (_changes) node._changes = _changes;

    return node;
}

/**
 * Test result tracking
 */
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        failCount++;
        return false;
    } else {
        console.log(`✓ PASS: ${message}`);
        passCount++;
        return true;
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ FAIL: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        failCount++;
        return false;
    } else {
        console.log(`✓ PASS: ${message}`);
        passCount++;
        return true;
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);

    if (actualStr !== expectedStr) {
        console.error(`❌ FAIL: ${message}`);
        console.error(`   Expected: ${expectedStr}`);
        console.error(`   Actual:   ${actualStr}`);
        failCount++;
        return false;
    } else {
        console.log(`✓ PASS: ${message}`);
        passCount++;
        return true;
    }
}

// ============================================================================
// TESTS
// ============================================================================

console.log('=== Artifact Export Tests ===\n');

// Test 1: exportArtifact produces valid JSON structure (ARTF-01)
async function test1() {
    console.log('Test 1: exportArtifact produces valid JSON structure (ARTF-01)');

    const child1 = makeNode({
        partNumber: 'CHILD-1',
        componentType: 'Part',
        state: 'Issued for Purchasing',
        _source: 'current'
    });

    const child2 = makeNode({
        partNumber: 'CHILD-2',
        componentType: 'Assembly',
        state: 'Issued for Use',
        _source: 'grafted'
    });

    const root = makeNode({
        partNumber: '258758',
        state: 'Issued for Purchasing',
        children: [child1, child2],
        _source: 'current'
    });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 1, placeholders: 0 },
        revision: 4,
        jobNumber: '1J258758',
        sourceFiles: { xn: 'test.xml', bn1: 'test.json' },
        date: new Date('2026-02-11T10:00:00Z')
    });

    // Check top-level structure
    assert(artifact.formatVersion !== undefined, 'artifact has formatVersion');
    assert(artifact.metadata !== undefined, 'artifact has metadata');
    assert(artifact.bom !== undefined, 'artifact has bom');

    // Check metadata fields
    assert(artifact.metadata.revision === 4, 'metadata has revision');
    assert(artifact.metadata.jobNumber === '1J258758', 'metadata has jobNumber');
    assert(artifact.metadata.generatedDate !== undefined, 'metadata has generatedDate');
    assert(artifact.metadata.hash !== undefined, 'metadata has hash');
    assert(artifact.metadata.sourceFiles !== undefined, 'metadata has sourceFiles');
    assert(artifact.metadata.summary !== undefined, 'metadata has summary');

    // Check BOM tree preservation
    assert(artifact.bom.partNumber === '258758', 'bom root partNumber preserved');
    assert(artifact.bom.componentType === 'Assembly', 'bom root componentType preserved');
    assert(artifact.bom.state === 'Issued for Purchasing', 'bom root state preserved');
    assert(artifact.bom.children.length === 2, 'bom root has 2 children');
    assert(artifact.bom._source === 'current', 'bom root _source preserved');

    console.log('');
}

// Test 2: exportArtifact includes merge summary in metadata (ARTF-01)
async function test2() {
    console.log('Test 2: exportArtifact includes merge summary in metadata (ARTF-01)');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });
    const summary = { passedThrough: 5, grafted: 2, placeholders: 1 };

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: summary,
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    assertDeepEqual(
        artifact.metadata.summary,
        { passedThrough: 5, grafted: 2, placeholders: 1 },
        'metadata.summary matches provided summary'
    );

    console.log('');
}

// Test 3: exportArtifact includes source filenames in metadata (ARTF-01)
async function test3() {
    console.log('Test 3: exportArtifact includes source filenames in metadata (ARTF-01)');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 4,
        jobNumber: '1J258758',
        sourceFiles: {
            xn: '258758-Rev4-20260211.XML',
            bn1: '1J258758-IFP REV3 (Feb 5, 2026).json'
        }
    });

    assertEqual(
        artifact.metadata.sourceFiles.xn,
        '258758-Rev4-20260211.XML',
        'metadata.sourceFiles.xn preserved'
    );

    assertEqual(
        artifact.metadata.sourceFiles.bn1,
        '1J258758-IFP REV3 (Feb 5, 2026).json',
        'metadata.sourceFiles.bn1 preserved'
    );

    console.log('');
}

// Test 4: exportArtifact includes _source tags and _changes (ARTF-01)
async function test4() {
    console.log('Test 4: exportArtifact includes _source tags and _changes (ARTF-01)');

    const graftedNode = makeNode({
        partNumber: 'GRAFT-1',
        qty: 3,
        _source: 'grafted',
        _changes: [{ field: 'qty', from: 2, to: 3 }]
    });

    const root = makeNode({
        partNumber: 'ROOT',
        _source: 'current',
        children: [graftedNode]
    });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 1, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    // Check _source on root
    assertEqual(artifact.bom._source, 'current', 'root _source included');

    // Check _source and _changes on grafted child
    assertEqual(artifact.bom.children[0]._source, 'grafted', 'child _source included');
    assert(artifact.bom.children[0]._changes !== undefined, 'child _changes included');
    assertEqual(artifact.bom.children[0]._changes.length, 1, '_changes has 1 item');
    assertEqual(artifact.bom.children[0]._changes[0].field, 'qty', '_changes field correct');
    assertEqual(artifact.bom.children[0]._changes[0].from, 2, '_changes from correct');
    assertEqual(artifact.bom.children[0]._changes[0].to, 3, '_changes to correct');

    console.log('');
}

// Test 5: computeHash returns SHA-256 hex string (ARTF-02)
async function test5() {
    console.log('Test 5: computeHash returns SHA-256 hex string (ARTF-02)');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });
    const hash = await computeHash(root);

    assert(typeof hash === 'string', 'hash is a string');
    assertEqual(hash.length, 64, 'hash is 64 characters (SHA-256 hex)');
    assert(/^[0-9a-f]+$/.test(hash), 'hash contains only lowercase hex characters');

    console.log('');
}

// Test 6: computeHash detects BOM changes (ARTF-02)
async function test6() {
    console.log('Test 6: computeHash detects BOM changes (ARTF-02)');

    const root1 = makeNode({ partNumber: 'ROOT', qty: 1, _source: 'current' });
    const hash1 = await computeHash(root1);

    const root2 = makeNode({ partNumber: 'ROOT', qty: 1, _source: 'current' });
    const hash2 = await computeHash(root2);

    // Same tree should produce same hash
    assertEqual(hash1, hash2, 'identical trees produce identical hashes');

    const root3 = makeNode({ partNumber: 'ROOT', qty: 2, _source: 'current' });
    const hash3 = await computeHash(root3);

    // Changed tree should produce different hash
    assert(hash1 !== hash3, 'changed tree produces different hash');

    console.log('');
}

// Test 7: exportArtifact stores hash in metadata (ARTF-02)
async function test7() {
    console.log('Test 7: exportArtifact stores hash in metadata (ARTF-02)');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    assert(artifact.metadata.hash !== undefined, 'metadata.hash exists');
    assertEqual(artifact.metadata.hash.length, 64, 'metadata.hash is 64 characters');

    // Verify hash matches computeHash of the bom
    const expectedHash = await computeHash(root);
    assertEqual(artifact.metadata.hash, expectedHash, 'metadata.hash matches computeHash(bom)');

    console.log('');
}

// Test 8: generateFilename follows pattern (ARTF-05)
async function test8() {
    console.log('Test 8: generateFilename follows pattern (ARTF-05)');

    const fixedDate = new Date('2026-02-11T10:00:00Z');
    const filename = generateFilename('1J258758', 4, fixedDate);

    assertEqual(
        filename,
        '1J258758-IFP REV4 (Feb 11, 2026).json',
        'filename matches pattern with correct date'
    );

    console.log('');
}

// Test 9: generateFilename handles REV0 (ARTF-05)
async function test9() {
    console.log('Test 9: generateFilename handles REV0 (ARTF-05)');

    const fixedDate = new Date('2026-01-15T10:00:00Z');
    const filename = generateFilename('1J258758', 0, fixedDate);

    assertEqual(
        filename,
        '1J258758-IFP REV0 (Jan 15, 2026).json',
        'REV0 filename correct'
    );

    console.log('');
}

// Test 10: suggestRevision returns 0 for REV0 mode (ARTF-06)
async function test10() {
    console.log('Test 10: suggestRevision returns 0 for REV0 mode (ARTF-06)');

    const revision = suggestRevision(null);
    assertEqual(revision, 0, 'suggestRevision(null) returns 0');

    const revision2 = suggestRevision(undefined);
    assertEqual(revision2, 0, 'suggestRevision(undefined) returns 0');

    console.log('');
}

// Test 11: suggestRevision returns B(n-1) revision + 1 (ARTF-06)
async function test11() {
    console.log('Test 11: suggestRevision returns B(n-1) revision + 1 (ARTF-06)');

    const priorArtifact = {
        metadata: { revision: 3 }
    };

    const revision = suggestRevision(priorArtifact);
    assertEqual(revision, 4, 'suggestRevision increments B(n-1) revision by 1');

    console.log('');
}

// Test 12: suggestJobNumber returns "1J" + root PN for REV0 (ARTF-05/ARTF-06)
async function test12() {
    console.log('Test 12: suggestJobNumber returns "1J" + root PN for REV0 (ARTF-05/ARTF-06)');

    const jobNumber = suggestJobNumber(null, '258758');
    assertEqual(jobNumber, '1J258758', 'REV0 job number = "1J" + root PN');

    console.log('');
}

// Test 13: suggestJobNumber returns B(n-1) jobNumber for REV1+ (ARTF-05/ARTF-06)
async function test13() {
    console.log('Test 13: suggestJobNumber returns B(n-1) jobNumber for REV1+ (ARTF-05/ARTF-06)');

    const priorArtifact = {
        metadata: { jobNumber: '1J258730' }
    };

    const jobNumber = suggestJobNumber(priorArtifact, '258758');
    assertEqual(jobNumber, '1J258730', 'REV1+ job number pulled from B(n-1)');

    console.log('');
}

// Test 14: Round-trip: exported JSON can be parsed back to valid tree structure
async function test14() {
    console.log('Test 14: Round-trip: exported JSON can be parsed back to valid tree structure');

    const child = makeNode({
        partNumber: 'CHILD-1',
        componentType: 'Part',
        qty: 5,
        _source: 'current'
    });

    const root = makeNode({
        partNumber: 'ROOT',
        qty: 1,
        children: [child],
        _source: 'current'
    });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    // Round-trip through JSON
    const jsonString = JSON.stringify(artifact);
    const parsed = JSON.parse(jsonString);

    // Verify structure is intact
    assert(parsed.bom.partNumber === 'ROOT', 'root partNumber preserved after round-trip');
    assert(parsed.bom.children.length === 1, 'root children array preserved');
    assert(parsed.bom.children[0].partNumber === 'CHILD-1', 'child partNumber preserved');
    assert(parsed.bom.children[0].qty === 5, 'child qty preserved');
    assert(parsed.bom._source === 'current', '_source tag preserved');

    console.log('');
}

// Test 15: importArtifact parses JSON string to artifact object
async function test15() {
    console.log('Test 15: importArtifact parses JSON string to artifact object');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    assert(imported.formatVersion !== undefined, 'imported artifact has formatVersion');
    assert(imported.metadata !== undefined, 'imported artifact has metadata');
    assert(imported.bom !== undefined, 'imported artifact has bom');
    assert(imported.bom.partNumber === 'ROOT', 'imported bom tree has correct root partNumber');
    assert(Array.isArray(imported.bom.children), 'imported bom root has children array');

    console.log('');
}

// Test 16: importArtifact reconstructs tree with all BOMNode fields
async function test16() {
    console.log('Test 16: importArtifact reconstructs tree with all BOMNode fields');

    const child = makeNode({
        partNumber: 'CHILD-1',
        componentType: 'Part',
        description: 'Test Part',
        qty: 5,
        _source: 'current'
    });

    const root = makeNode({
        partNumber: 'ROOT',
        componentType: 'Assembly',
        description: 'Test Assembly',
        qty: 1,
        children: [child],
        _source: 'current'
    });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    // Check root node has all fields
    assert(imported.bom.partNumber !== undefined, 'root has partNumber');
    assert(imported.bom.componentType !== undefined, 'root has componentType');
    assert(imported.bom.description !== undefined, 'root has description');
    assert(imported.bom.material !== undefined, 'root has material');
    assert(imported.bom.qty !== undefined, 'root has qty');
    assert(imported.bom.length !== undefined, 'root has length');
    assert(imported.bom.uofm !== undefined, 'root has uofm');
    assert(imported.bom.state !== undefined, 'root has state');
    assert(imported.bom.purchaseDescription !== undefined, 'root has purchaseDescription');
    assert(imported.bom.nsItemType !== undefined, 'root has nsItemType');
    assert(imported.bom.revision !== undefined, 'root has revision');
    assert(Array.isArray(imported.bom.children), 'root has children array');

    // Check child node
    assert(imported.bom.children[0].partNumber === 'CHILD-1', 'child has partNumber');
    assert(Array.isArray(imported.bom.children[0].children), 'child has children array');

    console.log('');
}

// Test 17: importArtifact strips stale _changes from B(n-1) nodes
async function test17() {
    console.log('Test 17: importArtifact strips stale _changes from B(n-1) nodes');

    const child = makeNode({
        partNumber: 'CHILD-1',
        qty: 5,
        _source: 'grafted',
        _changes: [{ field: 'qty', from: 3, to: 5 }]
    });

    const root = makeNode({
        partNumber: 'ROOT',
        children: [child],
        _source: 'current',
        _changes: [{ field: 'description', from: 'Old', to: 'New' }]
    });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 1, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    // _changes should be stripped (stale from prior merge)
    assert(imported.bom._changes === undefined, 'root _changes stripped');
    assert(imported.bom.children[0]._changes === undefined, 'child _changes stripped');

    console.log('');
}

// Test 18: importArtifact preserves _source tags
async function test18() {
    console.log('Test 18: importArtifact preserves _source tags');

    const child = makeNode({
        partNumber: 'CHILD-1',
        _source: 'grafted'
    });

    const root = makeNode({
        partNumber: 'ROOT',
        children: [child],
        _source: 'current'
    });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 1, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    // _source should be preserved (useful for cross-tab display)
    assertEqual(imported.bom._source, 'current', 'root _source preserved');
    assertEqual(imported.bom.children[0]._source, 'grafted', 'child _source preserved');

    console.log('');
}

// Test 19: validateArtifact passes for unmodified artifact (ARTF-03)
async function test19() {
    console.log('Test 19: validateArtifact passes for unmodified artifact (ARTF-03)');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    const result = await validateArtifact(imported);

    assertEqual(result.valid, true, 'unmodified artifact is valid');
    assertEqual(result.errors.length, 0, 'no errors for unmodified artifact');
    assertEqual(result.warnings.length, 0, 'no warnings for unmodified artifact');

    console.log('');
}

// Test 20: validateArtifact detects hash mismatch (ARTF-03)
async function test20() {
    console.log('Test 20: validateArtifact detects hash mismatch (ARTF-03)');

    const root = makeNode({ partNumber: 'ROOT', qty: 1, _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = JSON.parse(jsonString);

    // Tamper with the bom data
    imported.bom.qty = 99;

    const result = await validateArtifact(imported);

    assertEqual(result.valid, false, 'tampered artifact is invalid');
    assert(result.errors.length > 0, 'errors array has items');

    // Error should contain both expected and actual hash
    const errorMsg = result.errors[0];
    assert(errorMsg.includes('expected') || errorMsg.includes('stored'), 'error mentions expected/stored hash');
    assert(errorMsg.includes('computed') || errorMsg.includes('actual'), 'error mentions computed/actual hash');

    console.log('');
}

// Test 21: validateArtifact detects hash mismatch from added node (ARTF-03)
async function test21() {
    console.log('Test 21: validateArtifact detects hash mismatch from added node (ARTF-03)');

    const root = makeNode({ partNumber: 'ROOT', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J123456',
        sourceFiles: { xn: 'test.xml', bn1: null }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = JSON.parse(jsonString);

    // Add a child node to tamper with the tree
    const newChild = {
        partNumber: 'FAKE-CHILD',
        componentType: 'Part',
        description: '',
        material: '',
        qty: 1,
        length: '',
        uofm: '',
        state: 'Issued for Purchasing',
        purchaseDescription: '',
        nsItemType: 'Inventory Item',
        revision: 'A',
        children: []
    };
    imported.bom.children.push(newChild);

    const result = await validateArtifact(imported);

    assertEqual(result.valid, false, 'artifact with added node is invalid');
    assert(result.errors.length > 0, 'errors array has items for added node');

    console.log('');
}

// Test 22: validateArtifact validates GA part number match (ARTF-04)
async function test22() {
    console.log('Test 22: validateArtifact validates GA part number match (ARTF-04)');

    const root = makeNode({ partNumber: '258758', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 2,
        jobNumber: '1J258758',
        sourceFiles: { xn: 'test.xml', bn1: 'prior.json' }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    const result = await validateArtifact(imported, { expectedGA: '258758' });

    assertEqual(result.valid, true, 'matching GA part number passes');
    assertEqual(result.warnings.length, 0, 'no warnings for matching GA');

    console.log('');
}

// Test 23: validateArtifact warns on GA part number mismatch (ARTF-04)
async function test23() {
    console.log('Test 23: validateArtifact warns on GA part number mismatch (ARTF-04)');

    const root = makeNode({ partNumber: '258758', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 2,
        jobNumber: '1J258758',
        sourceFiles: { xn: 'test.xml', bn1: 'prior.json' }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    const result = await validateArtifact(imported, { expectedGA: '258730' });

    assertEqual(result.valid, true, 'GA mismatch warns but does not block');
    assert(result.warnings.length > 0, 'warnings array has items for GA mismatch');

    const warningMsg = result.warnings[0];
    assert(warningMsg.includes('258730'), 'warning mentions X(n) GA (258730)');
    assert(warningMsg.includes('258758'), 'warning mentions B(n-1) GA (258758)');

    console.log('');
}

// Test 24: validateArtifact warns on revision gap (ARTF-06 related)
async function test24() {
    console.log('Test 24: validateArtifact warns on revision gap (ARTF-06 related)');

    const root = makeNode({ partNumber: '258758', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 2,
        jobNumber: '1J258758',
        sourceFiles: { xn: 'test.xml', bn1: 'prior.json' }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    // Expected revision should be 3 (sequential), but we're passing 5 (gap)
    const result = await validateArtifact(imported, { expectedRevision: 5 });

    assertEqual(result.valid, true, 'revision gap warns but does not block');
    assert(result.warnings.length > 0, 'warnings array has items for revision gap');

    const warningMsg = result.warnings.find(w => w.includes('gap') || w.includes('REV'));
    assert(warningMsg !== undefined, 'warning mentions revision gap');

    console.log('');
}

// Test 25: validateArtifact passes for sequential revision (no gap warning)
async function test25() {
    console.log('Test 25: validateArtifact passes for sequential revision (no gap warning)');

    const root = makeNode({ partNumber: '258758', _source: 'current' });

    const artifact = await exportArtifact({
        mergedTree: root,
        summary: { passedThrough: 1, grafted: 0, placeholders: 0 },
        revision: 2,
        jobNumber: '1J258758',
        sourceFiles: { xn: 'test.xml', bn1: 'prior.json' }
    });

    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    // Sequential revision (2 -> 3)
    const result = await validateArtifact(imported, { expectedRevision: 3 });

    assertEqual(result.valid, true, 'sequential revision is valid');

    // Should have no revision-related warnings
    const revisionWarning = result.warnings.find(w => w.includes('gap') || w.includes('REV'));
    assert(revisionWarning === undefined, 'no revision gap warning for sequential revisions');

    console.log('');
}

// Test 26: importArtifact output is usable as priorRoot in mergeBOM
async function test26() {
    console.log('Test 26: importArtifact output is usable as priorRoot in mergeBOM');

    // Create an initial B(n-1) tree with a released assembly
    const releasedChild = makeNode({
        partNumber: 'SUB-ASSY',
        componentType: 'Assembly',
        state: 'Issued for Purchasing',
        qty: 2,
        description: 'Released Subassembly',
        children: [
            makeNode({
                partNumber: 'PART-1',
                componentType: 'Part',
                state: 'Issued for Purchasing',
                qty: 3
            })
        ],
        _source: 'current'
    });

    const bn1Root = makeNode({
        partNumber: '258758',
        componentType: 'Assembly',
        state: 'Issued for Purchasing',
        children: [releasedChild],
        _source: 'current'
    });

    // Export B(n-1) to artifact
    const artifact = await exportArtifact({
        mergedTree: bn1Root,
        summary: { passedThrough: 2, grafted: 0, placeholders: 0 },
        revision: 1,
        jobNumber: '1J258758',
        sourceFiles: { xn: '258758-Rev1.xml', bn1: null }
    });

    // Round-trip: stringify -> import
    const jsonString = JSON.stringify(artifact);
    const imported = importArtifact(jsonString);

    // Create X(n) with SUB-ASSY as WIP (should graft from B(n-1))
    const wipChild = makeNode({
        partNumber: 'SUB-ASSY',
        componentType: 'Assembly',
        state: 'Work in Progress',
        qty: 4,
        description: 'WIP Subassembly'
    });

    const xnRoot = makeNode({
        partNumber: '258758',
        componentType: 'Assembly',
        state: 'Issued for Purchasing',
        children: [wipChild]
    });

    // Merge with imported B(n-1) as priorRoot
    const mergeResult = mergeBOM(xnRoot, imported.bom);

    assert(mergeResult !== undefined, 'mergeBOM returns result');
    assert(mergeResult.mergedTree !== undefined, 'mergeResult has mergedTree');
    assert(mergeResult.summary.grafted > 0, 'graft occurred from imported B(n-1)');

    // Verify the grafted content came from B(n-1)
    const mergedChild = mergeResult.mergedTree.children[0];
    assert(mergedChild._source === 'grafted', 'SUB-ASSY marked as grafted');
    assert(mergedChild.children.length === 1, 'grafted SUB-ASSY has children from B(n-1)');
    assert(mergedChild.children[0].partNumber === 'PART-1', 'grafted child content matches B(n-1)');

    console.log('');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

(async function runTests() {
    try {
        await test1();
        await test2();
        await test3();
        await test4();
        await test5();
        await test6();
        await test7();
        await test8();
        await test9();
        await test10();
        await test11();
        await test12();
        await test13();
        await test14();
        await test15();
        await test16();
        await test17();
        await test18();
        await test19();
        await test20();
        await test21();
        await test22();
        await test23();
        await test24();
        await test25();
        await test26();

        console.log('=================================');
        console.log(`✓ Passed: ${passCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log('=================================');

        if (failCount > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ TEST SUITE ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
