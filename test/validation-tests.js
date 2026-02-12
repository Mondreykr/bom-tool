import { BOMNode } from '../js/core/tree.js';
import { isAssembly, validateBOM } from '../js/core/validate.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a BOMNode from simplified parameters for testing.
 * Provides sensible defaults for fields not relevant to validation logic.
 *
 * NOTE: nsItemType parameter uses real PDM values:
 * - 'Assembly' for assemblies (NS Item Type = Assembly)
 * - 'Inventory' for parts/inventory items (NS Item Type = Inventory)
 * - 'Lot Numbered Inventory' for lot-tracked items
 */
function makeNode({
    partNumber,
    componentType = 'Assembly',
    nsItemType = undefined, // Explicit parameter for NS Item Type
    state = 'Issued for Purchasing',
    qty = 1,
    description = '',
    revision = 'A',
    children = []
}) {
    // If nsItemType not specified, derive from componentType for backward compat
    const derivedNsItemType = nsItemType !== undefined
        ? nsItemType
        : (componentType === 'Assembly' ? 'Assembly' : 'Inventory');

    // Create a minimal rowData object that BOMNode constructor expects
    const rowData = {
        Level: '1', // Will be overridden by tree structure
        'Part Number': partNumber,
        'Component Type': componentType,
        Description: description,
        Material: '',
        Qty: String(qty),
        Length: '',
        UofM: '',
        State: state,
        'Purchase Description': '',
        'NS Item Type': derivedNsItemType,
        Revision: revision
    };

    const node = new BOMNode(rowData);
    node.children = children;
    return node;
}

/**
 * Build a path string from a node's ancestors.
 * Used for error message verification.
 */
function buildPath(ancestors) {
    return ancestors.map(a => a.partNumber).join(' > ');
}

// ============================================================================
// TEST RUNNER
// ============================================================================

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
// TEST CASES - isAssembly function
// ============================================================================

function test1_isAssembly_ReturnsTrue_ForAssembly() {
    console.log('  Testing: isAssembly returns true for nsItemType = "Assembly"');
    const errors = [];

    const node = makeNode({
        partNumber: 'A1',
        nsItemType: 'Assembly'
    });

    if (!isAssembly(node)) {
        errors.push('Expected isAssembly(node with nsItemType="Assembly") to return true');
    }

    return errors;
}

function test2_isAssembly_ReturnsFalse_ForInventory() {
    console.log('  Testing: isAssembly returns false for nsItemType = "Inventory"');
    const errors = [];

    const node = makeNode({
        partNumber: 'P1',
        componentType: 'Part',
        nsItemType: 'Inventory'
    });

    if (isAssembly(node)) {
        errors.push('Expected isAssembly(node with nsItemType="Inventory") to return false');
    }

    return errors;
}

function test3_isAssembly_ReturnsFalse_ForLotNumberedInventory() {
    console.log('  Testing: isAssembly returns false for nsItemType = "Lot Numbered Inventory"');
    const errors = [];

    const node = makeNode({
        partNumber: 'P2',
        componentType: 'Part',
        nsItemType: 'Lot Numbered Inventory'
    });

    if (isAssembly(node)) {
        errors.push('Expected isAssembly(node with nsItemType="Lot Numbered Inventory") to return false');
    }

    return errors;
}

function test4_isAssembly_ReturnsFalse_ForMissingNsItemType() {
    console.log('  Testing: isAssembly returns false for undefined/null/empty nsItemType');
    const errors = [];

    // Test undefined
    const node1 = makeNode({ partNumber: 'P3', nsItemType: undefined });
    if (isAssembly(node1)) {
        errors.push('Expected isAssembly(node with nsItemType=undefined) to return false');
    }

    // Test null
    const node2 = makeNode({ partNumber: 'P4', nsItemType: null });
    if (isAssembly(node2)) {
        errors.push('Expected isAssembly(node with nsItemType=null) to return false');
    }

    // Test empty string
    const node3 = makeNode({ partNumber: 'P5', nsItemType: '' });
    if (isAssembly(node3)) {
        errors.push('Expected isAssembly(node with nsItemType="") to return false');
    }

    return errors;
}

// ============================================================================
// TEST CASES - validateBOM Rule 0 (WIP GA)
// ============================================================================

function test5_Rule0_WIPGARootBlocked() {
    console.log('  Testing: Rule 0 — WIP GA root blocks merge with descriptive error');
    const errors = [];

    const GA = makeNode({
        partNumber: '12345-GA',
        state: 'Under Revision', // WIP state
        nsItemType: 'Assembly'
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for WIP GA root');
    }

    // Assert: errors array has at least one error
    if (!result.errors || result.errors.length === 0) {
        errors.push('Expected result.errors to contain at least one error');
    } else {
        // Find the WIP GA error
        const wipGAError = result.errors.find(e => e.rule === 'wip-ga');
        if (!wipGAError) {
            errors.push('Expected to find error with rule="wip-ga"');
        } else {
            // Check error includes part number
            if (!wipGAError.message.includes('12345-GA')) {
                errors.push('Expected error message to include part number');
            }
            // Check error includes suggested fix
            if (!wipGAError.message.includes('Release') && !wipGAError.message.includes('PDM')) {
                errors.push('Expected error message to include suggested fix');
            }
        }
    }

    return errors;
}

function test6_Rule0_ReleasedGAValid() {
    console.log('  Testing: Rule 0 — Released GA root with Released children is valid');
    const errors = [];

    const GA = makeNode({
        partNumber: '12345-GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [
            makeNode({
                partNumber: 'A1',
                state: 'Issued for Purchasing',
                nsItemType: 'Assembly'
            })
        ]
    });

    const result = validateBOM(GA);

    // Assert: validation passes
    if (!result.valid) {
        errors.push(`Expected validateBOM to pass for Released GA, got errors: ${JSON.stringify(result.errors)}`);
    }

    // Assert: errors array is empty
    if (result.errors.length !== 0) {
        errors.push(`Expected result.errors to be empty, got ${result.errors.length} errors`);
    }

    return errors;
}

// ============================================================================
// TEST CASES - validateBOM Rule 1 (WIP non-assembly under Released parent)
// ============================================================================

function test7_Rule1_WIPNonAssemblyUnderReleasedBlocked() {
    console.log('  Testing: Rule 1 — WIP non-assembly under Released assembly blocks merge');
    const errors = [];

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP
    });

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1]
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for WIP non-assembly under Released parent');
    }

    // Find the WIP non-assembly error
    const wipPartError = result.errors.find(e => e.rule === 'wip-non-assembly');
    if (!wipPartError) {
        errors.push('Expected to find error with rule="wip-non-assembly"');
    } else {
        // Check error includes full path
        if (!wipPartError.path || !wipPartError.path.includes('GA') || !wipPartError.path.includes('A1')) {
            errors.push(`Expected error path to include full ancestor chain, got: ${wipPartError.path}`);
        }
        // Check error message includes part number
        if (!wipPartError.message.includes('C1')) {
            errors.push('Expected error message to include part number C1');
        }
        // Check error includes suggested fix
        if (!wipPartError.message.includes('Release') || !wipPartError.message.includes('PDM')) {
            errors.push('Expected error message to include suggested fix');
        }
    }

    return errors;
}

function test8_Rule1_ReleasedNonAssemblyValid() {
    console.log('  Testing: Rule 1 — Released non-assembly under Released assembly is valid');
    const errors = [];

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'Issued for Purchasing' // Released
    });

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1]
    });

    const result = validateBOM(GA);

    // Assert: validation passes
    if (!result.valid) {
        errors.push(`Expected validateBOM to pass, got errors: ${JSON.stringify(result.errors)}`);
    }

    return errors;
}

function test9_Rule1_MultipleWIPPartsCollected() {
    console.log('  Testing: Rule 1 — Multiple WIP non-assembly items all collected');
    const errors = [];

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP
    });

    const C2 = makeNode({
        partNumber: 'C2',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'In Design' // WIP
    });

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const A2 = makeNode({
        partNumber: 'A2',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C2]
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1, A2]
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for multiple WIP parts');
    }

    // Assert: at least 2 errors collected
    const wipPartErrors = result.errors.filter(e => e.rule === 'wip-non-assembly');
    if (wipPartErrors.length < 2) {
        errors.push(`Expected at least 2 WIP non-assembly errors, got ${wipPartErrors.length}`);
    }

    return errors;
}

// ============================================================================
// TEST CASES - validateBOM Rule 2 (Released assembly with only WIP sub-assemblies)
// ============================================================================

function test10_Rule2_ReleasedAssemblyOnlyWIPSubAssembliesBlocked() {
    console.log('  Testing: Rule 2 — Released assembly with ONLY WIP sub-assemblies blocks merge');
    const errors = [];

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Under Revision', // WIP
        nsItemType: 'Assembly'
    });

    const A2 = makeNode({
        partNumber: 'A2',
        state: 'In Design', // WIP
        nsItemType: 'Assembly'
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1, A2] // Only sub-assemblies, all WIP
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for Released assembly with only WIP sub-assemblies');
    }

    // Find the no-released-content error
    const noReleasedContentError = result.errors.find(e => e.rule === 'no-released-content');
    if (!noReleasedContentError) {
        errors.push('Expected to find error with rule="no-released-content"');
    } else {
        // Check error includes parent assembly path
        if (!noReleasedContentError.message.includes('GA')) {
            errors.push('Expected error message to include parent assembly');
        }
    }

    return errors;
}

function test11_Rule2_MixedWIPAndReleasedSubAssembliesValid() {
    console.log('  Testing: Rule 2 — Released assembly with one WIP and one Released sub-assembly is valid');
    const errors = [];

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Under Revision', // WIP
        nsItemType: 'Assembly'
    });

    const A2 = makeNode({
        partNumber: 'A2',
        state: 'Issued for Purchasing', // Released
        nsItemType: 'Assembly'
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1, A2] // Mixed: one WIP, one Released
    });

    const result = validateBOM(GA);

    // Assert: validation passes (at least one Released child)
    if (!result.valid) {
        errors.push(`Expected validateBOM to pass, got errors: ${JSON.stringify(result.errors)}`);
    }

    return errors;
}

function test12_Rule2_WIPSubAssemblyWithReleasedPartValid() {
    console.log('  Testing: Rule 2 — Released assembly with WIP sub-assembly AND Released non-assembly is valid');
    const errors = [];

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Under Revision', // WIP sub-assembly
        nsItemType: 'Assembly'
    });

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'Issued for Purchasing' // Released non-assembly
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1, C1] // Has released content (C1)
    });

    const result = validateBOM(GA);

    // Assert: validation passes (has released non-assembly child)
    if (!result.valid) {
        errors.push(`Expected validateBOM to pass, got errors: ${JSON.stringify(result.errors)}`);
    }

    return errors;
}

// ============================================================================
// TEST CASES - validateBOM Missing NS Item Type
// ============================================================================

function test13_MissingNsItemTypeBlocked() {
    console.log('  Testing: Missing NS Item Type blocks merge with error');
    const errors = [];

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: null // Missing NS Item Type
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for missing NS Item Type');
    }

    // Find the missing-ns-item-type error
    const missingTypeError = result.errors.find(e => e.rule === 'missing-ns-item-type');
    if (!missingTypeError) {
        errors.push('Expected to find error with rule="missing-ns-item-type"');
    } else {
        // Check error includes part number
        if (!missingTypeError.message.includes('C1')) {
            errors.push('Expected error message to include part number C1');
        }
        // Check error includes path
        if (!missingTypeError.path) {
            errors.push('Expected error to include path');
        }
    }

    return errors;
}

// ============================================================================
// TEST CASES - validateBOM Completeness
// ============================================================================

function test14_MultipleViolationsAllCollected() {
    console.log('  Testing: Multiple violations all collected (WIP GA + WIP parts + missing type)');
    const errors = [];

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP non-assembly
    });

    const C2 = makeNode({
        partNumber: 'C2',
        componentType: 'Part',
        nsItemType: null // Missing NS Item Type
    });

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1, C2]
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Under Revision', // WIP GA
        nsItemType: 'Assembly',
        children: [A1]
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for multiple violations');
    }

    // Assert: at least 3 errors collected (WIP GA + WIP part + missing type)
    if (result.errors.length < 3) {
        errors.push(`Expected at least 3 errors, got ${result.errors.length}`);
    }

    // Check for each type
    const hasWipGAError = result.errors.some(e => e.rule === 'wip-ga');
    const hasWipPartError = result.errors.some(e => e.rule === 'wip-non-assembly');
    const hasMissingTypeError = result.errors.some(e => e.rule === 'missing-ns-item-type');

    if (!hasWipGAError) {
        errors.push('Expected to find wip-ga error');
    }
    if (!hasWipPartError) {
        errors.push('Expected to find wip-non-assembly error');
    }
    if (!hasMissingTypeError) {
        errors.push('Expected to find missing-ns-item-type error');
    }

    return errors;
}

function test15_DeepTreeWIPPartFullPath() {
    console.log('  Testing: Deep tree (L3) WIP non-assembly error includes full path');
    const errors = [];

    const C1 = makeNode({
        partNumber: 'C1',
        componentType: 'Part',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP
    });

    const A2 = makeNode({
        partNumber: 'A2',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A2]
    });

    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A1]
    });

    const result = validateBOM(GA);

    // Assert: validation fails
    if (result.valid) {
        errors.push('Expected validateBOM to fail for deep WIP part');
    }

    // Find the WIP part error
    const wipPartError = result.errors.find(e => e.rule === 'wip-non-assembly');
    if (!wipPartError) {
        errors.push('Expected to find wip-non-assembly error');
    } else {
        // Check path includes all ancestors
        const pathParts = ['GA', 'A1', 'A2'];
        for (const part of pathParts) {
            if (!wipPartError.path.includes(part)) {
                errors.push(`Expected path to include ${part}, got: ${wipPartError.path}`);
            }
        }
    }

    return errors;
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('BOM TOOL - VALIDATION TESTS');
console.log('='.repeat(60));

const results = [];

// isAssembly tests
results.push(runTest('Test 1: isAssembly returns true for Assembly', test1_isAssembly_ReturnsTrue_ForAssembly));
results.push(runTest('Test 2: isAssembly returns false for Inventory', test2_isAssembly_ReturnsFalse_ForInventory));
results.push(runTest('Test 3: isAssembly returns false for Lot Numbered Inventory', test3_isAssembly_ReturnsFalse_ForLotNumberedInventory));
results.push(runTest('Test 4: isAssembly returns false for missing nsItemType', test4_isAssembly_ReturnsFalse_ForMissingNsItemType));

// Rule 0 (WIP GA)
results.push(runTest('Test 5: Rule 0 — WIP GA root blocked', test5_Rule0_WIPGARootBlocked));
results.push(runTest('Test 6: Rule 0 — Released GA valid', test6_Rule0_ReleasedGAValid));

// Rule 1 (WIP non-assembly under Released parent)
results.push(runTest('Test 7: Rule 1 — WIP non-assembly under Released blocked', test7_Rule1_WIPNonAssemblyUnderReleasedBlocked));
results.push(runTest('Test 8: Rule 1 — Released non-assembly valid', test8_Rule1_ReleasedNonAssemblyValid));
results.push(runTest('Test 9: Rule 1 — Multiple WIP parts collected', test9_Rule1_MultipleWIPPartsCollected));

// Rule 2 (Released assembly with only WIP sub-assemblies)
results.push(runTest('Test 10: Rule 2 — Released assembly only WIP sub-assemblies blocked', test10_Rule2_ReleasedAssemblyOnlyWIPSubAssembliesBlocked));
results.push(runTest('Test 11: Rule 2 — Mixed WIP and Released sub-assemblies valid', test11_Rule2_MixedWIPAndReleasedSubAssembliesValid));
results.push(runTest('Test 12: Rule 2 — WIP sub-assembly with Released part valid', test12_Rule2_WIPSubAssemblyWithReleasedPartValid));

// Missing NS Item Type
results.push(runTest('Test 13: Missing NS Item Type blocked', test13_MissingNsItemTypeBlocked));

// Completeness
results.push(runTest('Test 14: Multiple violations all collected', test14_MultipleViolationsAllCollected));
results.push(runTest('Test 15: Deep tree WIP part full path', test15_DeepTreeWIPPartFullPath));

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
