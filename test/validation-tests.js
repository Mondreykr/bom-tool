import { BOMNode } from '../js/core/tree.js';
import { isAssembly, validateBOM, validateMetadata } from '../js/core/validate.js';

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
    nsItemType, // Explicit parameter for NS Item Type (no default)
    state = 'Issued for Purchasing',
    qty = 1,
    description = 'Test Description',
    revision = '1',
    uofm = 'ea',
    length = '',
    children = []
}) {
    // If nsItemType not provided at all (arguments doesn't include it), derive from componentType
    // If nsItemType is explicitly provided (even as undefined/null), use that value
    const hasNsItemTypeArg = arguments[0] && 'nsItemType' in arguments[0];
    const finalNsItemType = hasNsItemTypeArg
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
        Length: length,
        UofM: uofm,
        State: state,
        'Purchase Description': '',
        'NS Item Type': finalNsItemType,
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
        partNumber: '1000101',
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
        componentType: 'Purchased',
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
        componentType: 'Purchased',
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
        partNumber: '1000001',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [
            makeNode({
                partNumber: '1000002',
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
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP
    });

    const A1 = makeNode({
        partNumber: '1000101',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        if (!wipPartError.path || !wipPartError.path.includes('1000100') || !wipPartError.path.includes('1000101')) {
            errors.push(`Expected error path to include full ancestor chain, got: ${wipPartError.path}`);
        }
        // Check error message includes part number
        if (!wipPartError.message.includes('1000201')) {
            errors.push('Expected error message to include part number 1000201');
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
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'Issued for Purchasing' // Released
    });

    const A1 = makeNode({
        partNumber: '1000101',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP
    });

    const C2 = makeNode({
        partNumber: '1000202',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'In Design' // WIP
    });

    const A1 = makeNode({
        partNumber: '1000101',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const A2 = makeNode({
        partNumber: '1000102',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C2]
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        partNumber: '1000101',
        state: 'Under Revision', // WIP
        nsItemType: 'Assembly'
    });

    const A2 = makeNode({
        partNumber: '1000102',
        state: 'In Design', // WIP
        nsItemType: 'Assembly'
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        if (!noReleasedContentError.message.includes('1000100')) {
            errors.push('Expected error message to include parent assembly');
        }
    }

    return errors;
}

function test11_Rule2_MixedWIPAndReleasedSubAssembliesValid() {
    console.log('  Testing: Rule 2 — Released assembly with one WIP and one Released sub-assembly is valid');
    const errors = [];

    const A1 = makeNode({
        partNumber: '1000101',
        state: 'Under Revision', // WIP
        nsItemType: 'Assembly'
    });

    const A2 = makeNode({
        partNumber: '1000102',
        state: 'Issued for Purchasing', // Released
        nsItemType: 'Assembly'
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        partNumber: '1000101',
        state: 'Under Revision', // WIP sub-assembly
        nsItemType: 'Assembly'
    });

    const C1 = makeNode({
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'Issued for Purchasing' // Released non-assembly
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: null // Missing NS Item Type
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        if (!missingTypeError.message.includes('1000201')) {
            errors.push('Expected error message to include part number 1000201');
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
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP non-assembly
    });

    const C2 = makeNode({
        partNumber: '1000202',
        componentType: 'Purchased',
        nsItemType: null // Missing NS Item Type
    });

    const A1 = makeNode({
        partNumber: '1000101',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1, C2]
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        partNumber: '1000201',
        componentType: 'Purchased',
        nsItemType: 'Inventory',
        state: 'Under Revision' // WIP
    });

    const A2 = makeNode({
        partNumber: '1000102',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [C1]
    });

    const A1 = makeNode({
        partNumber: '1000101',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [A2]
    });

    const GA = makeNode({
        partNumber: '1000100',
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
        const pathParts = ['1000100', '1000101', '1000102'];
        for (const part of pathParts) {
            if (!wipPartError.path.includes(part)) {
                errors.push(`Expected path to include ${part}, got: ${wipPartError.path}`);
            }
        }
    }

    return errors;
}

// ============================================================================
// TEST CASES - validateMetadata Rules 3-9
// ============================================================================

function test16_Rule3_ValidPartNumbersPassed() {
    console.log('  Testing: Rule 3 — Valid part numbers pass validation');
    const errors = [];

    const validPartNumbers = ['1000123', '1000123-01', '1000123-01-1', '200001', '300001'];

    for (const pn of validPartNumbers) {
        const node = makeNode({
            partNumber: pn,
            nsItemType: 'Assembly'
        });

        const result = validateBOM(node);
        const partNumberError = result.errors.find(e => e.rule === 'invalid-part-number');
        if (partNumberError) {
            errors.push(`Expected ${pn} to pass validation, but got error: ${partNumberError.message}`);
        }
    }

    return errors;
}

function test17_Rule3_InvalidPartNumbersBlocked() {
    console.log('  Testing: Rule 3 — Invalid part numbers blocked');
    const errors = [];

    const invalidPartNumbers = ['ABC123', '400001', '10001', '1000123-1'];

    for (const pn of invalidPartNumbers) {
        const node = makeNode({
            partNumber: pn,
            nsItemType: 'Assembly'
        });

        const result = validateBOM(node);
        const partNumberError = result.errors.find(e => e.rule === 'invalid-part-number');
        if (!partNumberError) {
            errors.push(`Expected ${pn} to fail validation`);
        }
    }

    return errors;
}

function test18_Rule3_PartNumberErrorIncludesPath() {
    console.log('  Testing: Rule 3 — Part number error includes path');
    const errors = [];

    const node = makeNode({
        partNumber: 'INVALID',
        nsItemType: 'Assembly'
    });

    const result = validateBOM(node);
    const partNumberError = result.errors.find(e => e.rule === 'invalid-part-number');

    if (!partNumberError) {
        errors.push('Expected to find invalid-part-number error');
    } else {
        if (!partNumberError.path) {
            errors.push('Expected error to include path');
        }
        if (!partNumberError.message.includes('INVALID')) {
            errors.push('Expected error message to include part number');
        }
    }

    return errors;
}

function test19_Rule4_EmptyDescriptionBlocked() {
    console.log('  Testing: Rule 4 — Empty/blank description blocked');
    const errors = [];

    // Test empty string
    const node1 = makeNode({
        partNumber: '1000123',
        description: '',
        nsItemType: 'Assembly'
    });

    const result1 = validateBOM(node1);
    const emptyDescError = result1.errors.find(e => e.rule === 'missing-description');
    if (!emptyDescError) {
        errors.push('Expected empty description to fail validation');
    }

    // Test whitespace only
    const node2 = makeNode({
        partNumber: '1000124',
        description: '   ',
        nsItemType: 'Assembly'
    });

    const result2 = validateBOM(node2);
    const whitespaceDescError = result2.errors.find(e => e.rule === 'missing-description');
    if (!whitespaceDescError) {
        errors.push('Expected whitespace-only description to fail validation');
    }

    return errors;
}

// --- RULE 5 TEST SUSPENDED ---
// Reason: Rule 5 (Revision Must Be Integer) is suspended in validate.js.
// Restore this test when Rule 5 is re-enabled.
//
// function test20_Rule5_NonIntegerRevisionBlocked() {
//     console.log('  Testing: Rule 5 — Non-integer revision blocked');
//     const errors = [];
//
//     const invalidRevisions = ['A', '1.5', ''];
//
//     for (const rev of invalidRevisions) {
//         const node = makeNode({
//             partNumber: '1000123',
//             revision: rev,
//             nsItemType: 'Assembly'
//         });
//
//         const result = validateBOM(node);
//         const revisionError = result.errors.find(e => e.rule === 'invalid-revision');
//         if (!revisionError) {
//             errors.push(`Expected revision '${rev}' to fail validation`);
//         }
//     }
//
//     // Test valid revisions
//     const validRevisions = ['1', '15'];
//
//     for (const rev of validRevisions) {
//         const node = makeNode({
//             partNumber: '1000123',
//             revision: rev,
//             nsItemType: 'Assembly'
//         });
//
//         const result = validateBOM(node);
//         const revisionError = result.errors.find(e => e.rule === 'invalid-revision');
//         if (revisionError) {
//             errors.push(`Expected revision '${rev}' to pass validation, got error: ${revisionError.message}`);
//         }
//     }
//
//     return errors;
// }
// --- END RULE 5 TEST SUSPENDED ---

function test21_Rule6_InvalidNsItemTypeBlocked() {
    console.log('  Testing: Rule 6 — Invalid NS Item Type blocked');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        nsItemType: 'Widget'
    });

    const result = validateBOM(node);
    const nsItemTypeError = result.errors.find(e => e.rule === 'invalid-ns-item-type');

    if (!nsItemTypeError) {
        errors.push('Expected invalid NS Item Type "Widget" to fail validation');
    }

    // Test valid values
    const validTypes = ['Inventory', 'Lot Numbered Inventory', 'Assembly'];

    for (const type of validTypes) {
        const validNode = makeNode({
            partNumber: '1000123',
            nsItemType: type,
            componentType: type === 'Assembly' ? 'Assembly' : 'Purchased'
        });

        const validResult = validateBOM(validNode);
        const validError = validResult.errors.find(e => e.rule === 'invalid-ns-item-type');
        if (validError) {
            errors.push(`Expected NS Item Type '${type}' to pass validation, got error: ${validError.message}`);
        }
    }

    return errors;
}

function test22_Rule7_InvalidComponentTypeBlocked() {
    console.log('  Testing: Rule 7 — Invalid Component Type blocked');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        componentType: 'Custom',
        nsItemType: 'Assembly'
    });

    const result = validateBOM(node);
    const componentTypeError = result.errors.find(e => e.rule === 'invalid-component-type');

    if (!componentTypeError) {
        errors.push('Expected invalid Component Type "Custom" to fail validation');
    }

    // Test valid values
    const validTypes = ['Purchased', 'Manufactured', 'Raw Stock', 'Assembly'];

    for (const type of validTypes) {
        const validNode = makeNode({
            partNumber: '1000123',
            componentType: type,
            nsItemType: 'Assembly'
        });

        const validResult = validateBOM(validNode);
        const validError = validResult.errors.find(e => e.rule === 'invalid-component-type');
        if (validError) {
            errors.push(`Expected Component Type '${type}' to pass validation, got error: ${validError.message}`);
        }
    }

    return errors;
}

function test23_Rule8_InvalidUoMBlocked() {
    console.log('  Testing: Rule 8 — Invalid Unit of Measure blocked');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        uofm: 'ft',
        nsItemType: 'Assembly'
    });

    const result = validateBOM(node);
    const uofmError = result.errors.find(e => e.rule === 'invalid-uofm');

    if (!uofmError) {
        errors.push('Expected invalid UoM "ft" to fail validation');
    }

    // Test valid values
    const validUoMs = ['ea', 'in', 'sq in'];

    for (const uom of validUoMs) {
        const validNode = makeNode({
            partNumber: '1000123',
            uofm: uom,
            nsItemType: 'Assembly'
        });

        const validResult = validateBOM(validNode);
        const validError = validResult.errors.find(e => e.rule === 'invalid-uofm');
        if (validError) {
            errors.push(`Expected UoM '${uom}' to pass validation, got error: ${validError.message}`);
        }
    }

    return errors;
}

function test24_Rule9_InventoryWithInvalidUoMBlocked() {
    console.log('  Testing: Rule 9 — Inventory with UoM="in" blocked (expected "ea")');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        nsItemType: 'Inventory',
        componentType: 'Purchased',
        uofm: 'in',
        length: ''
    });

    const result = validateBOM(node);
    const crossFieldError = result.errors.find(e => e.rule === 'cross-field-inconsistency' && e.message.includes('Unit of Measure'));

    if (!crossFieldError) {
        errors.push('Expected Inventory with UoM="in" to fail cross-field validation');
    }

    return errors;
}

function test25_Rule9_InventoryWithLengthBlocked() {
    console.log('  Testing: Rule 9 — Inventory with non-empty Length blocked');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        nsItemType: 'Inventory',
        componentType: 'Purchased',
        uofm: 'ea',
        length: '12.5'
    });

    const result = validateBOM(node);
    const crossFieldError = result.errors.find(e => e.rule === 'cross-field-inconsistency' && e.message.includes('Length'));

    if (!crossFieldError) {
        errors.push('Expected Inventory with Length="12.5" to fail cross-field validation');
    }

    return errors;
}

function test26_Rule9_LotNumberedInventoryWithInvalidUoMBlocked() {
    console.log('  Testing: Rule 9 — Lot Numbered Inventory with UoM="ea" blocked (expected "in" or "sq in")');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        nsItemType: 'Lot Numbered Inventory',
        componentType: 'Raw Stock',
        uofm: 'ea',
        length: '12.5in'
    });

    const result = validateBOM(node);
    const crossFieldError = result.errors.find(e => e.rule === 'cross-field-inconsistency' && e.message.includes('Unit of Measure'));

    if (!crossFieldError) {
        errors.push('Expected Lot Numbered Inventory with UoM="ea" to fail cross-field validation');
    }

    return errors;
}

function test27_Rule9_LotNumberedInventoryWithValidFieldsPasses() {
    console.log('  Testing: Rule 9 — Lot Numbered Inventory with valid fields passes');
    const errors = [];

    const node = makeNode({
        partNumber: '1000123',
        nsItemType: 'Lot Numbered Inventory',
        componentType: 'Raw Stock',
        uofm: 'in',
        length: '12.5in'
    });

    const result = validateBOM(node);
    const crossFieldErrors = result.errors.filter(e => e.rule === 'cross-field-inconsistency');

    if (crossFieldErrors.length > 0) {
        errors.push(`Expected valid Lot Numbered Inventory to pass, got errors: ${JSON.stringify(crossFieldErrors)}`);
    }

    return errors;
}

function test28_MetadataErrorsCollectedWithMergeErrors() {
    console.log('  Testing: Metadata errors collected alongside merge errors');
    const errors = [];

    const child = makeNode({
        partNumber: 'INVALID',
        nsItemType: 'Assembly',
        state: 'Issued for Purchasing'
    });

    const GA = makeNode({
        partNumber: '1000123',
        state: 'Under Revision', // WIP GA (Rule 0 violation)
        nsItemType: 'Assembly',
        children: [child]
    });

    const result = validateBOM(GA);

    // Should have both WIP GA error and invalid part number error
    const wipGAError = result.errors.find(e => e.rule === 'wip-ga');
    const partNumberError = result.errors.find(e => e.rule === 'invalid-part-number');

    if (!wipGAError) {
        errors.push('Expected to find wip-ga error');
    }
    if (!partNumberError) {
        errors.push('Expected to find invalid-part-number error');
    }

    return errors;
}

function test29_MetadataCheckedOnEveryNode() {
    console.log('  Testing: Metadata validation runs on every node');
    const errors = [];

    const child1 = makeNode({
        partNumber: 'INVALID1',
        nsItemType: 'Inventory',
        componentType: 'Purchased',
        state: 'Issued for Purchasing'
    });

    const child2 = makeNode({
        partNumber: '1000124',
        nsItemType: 'Inventory',
        componentType: 'Purchased',
        description: '', // Missing description
        state: 'Issued for Purchasing'
    });

    const GA = makeNode({
        partNumber: '1000123',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        children: [child1, child2]
    });

    const result = validateBOM(GA);

    // Should have errors for both children
    const partNumberError = result.errors.find(e => e.rule === 'invalid-part-number' && e.message.includes('INVALID1'));
    const descriptionError = result.errors.find(e => e.rule === 'missing-description' && e.message.includes('1000124'));

    if (!partNumberError) {
        errors.push('Expected to find invalid-part-number error for child1');
    }
    if (!descriptionError) {
        errors.push('Expected to find missing-description error for child2');
    }

    return errors;
}

function test30_ValidMetadataWithValidMergePasses() {
    console.log('  Testing: Valid metadata with valid merge passes');
    const errors = [];

    const child = makeNode({
        partNumber: '1000124',
        nsItemType: 'Inventory',
        componentType: 'Purchased',
        state: 'Issued for Purchasing',
        description: 'Valid Part',
        revision: '1',
        uofm: 'ea',
        length: ''
    });

    const GA = makeNode({
        partNumber: '1000123',
        state: 'Issued for Purchasing',
        nsItemType: 'Assembly',
        description: 'Valid Assembly',
        revision: '1',
        uofm: 'ea',
        length: '',
        children: [child]
    });

    const result = validateBOM(GA);

    if (!result.valid) {
        errors.push(`Expected validation to pass, got errors: ${JSON.stringify(result.errors)}`);
    }

    if (result.errors.length !== 0) {
        errors.push(`Expected zero errors, got ${result.errors.length}: ${JSON.stringify(result.errors)}`);
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

// Rule 3 (Part Number Format)
results.push(runTest('Test 16: Rule 3 — Valid part numbers pass', test16_Rule3_ValidPartNumbersPassed));
results.push(runTest('Test 17: Rule 3 — Invalid part numbers blocked', test17_Rule3_InvalidPartNumbersBlocked));
results.push(runTest('Test 18: Rule 3 — Part number error includes path', test18_Rule3_PartNumberErrorIncludesPath));

// Rule 4 (Description Required)
results.push(runTest('Test 19: Rule 4 — Empty/blank description blocked', test19_Rule4_EmptyDescriptionBlocked));

// Rule 5 (Revision Must Be Integer)
// SUSPENDED: Rule 5 test disabled (see test function above)
// results.push(runTest('Test 20: Rule 5 — Non-integer revision blocked', test20_Rule5_NonIntegerRevisionBlocked));

// Rule 6 (NS Item Type Whitelist)
results.push(runTest('Test 21: Rule 6 — Invalid NS Item Type blocked', test21_Rule6_InvalidNsItemTypeBlocked));

// Rule 7 (Component Type Whitelist)
results.push(runTest('Test 22: Rule 7 — Invalid Component Type blocked', test22_Rule7_InvalidComponentTypeBlocked));

// Rule 8 (Unit of Measure Whitelist)
results.push(runTest('Test 23: Rule 8 — Invalid UoM blocked', test23_Rule8_InvalidUoMBlocked));

// Rule 9 (Cross-Field Consistency)
results.push(runTest('Test 24: Rule 9 — Inventory with invalid UoM blocked', test24_Rule9_InventoryWithInvalidUoMBlocked));
results.push(runTest('Test 25: Rule 9 — Inventory with Length blocked', test25_Rule9_InventoryWithLengthBlocked));
results.push(runTest('Test 26: Rule 9 — Lot Numbered Inventory with invalid UoM blocked', test26_Rule9_LotNumberedInventoryWithInvalidUoMBlocked));
results.push(runTest('Test 27: Rule 9 — Lot Numbered Inventory with valid fields passes', test27_Rule9_LotNumberedInventoryWithValidFieldsPasses));

// Integration tests
results.push(runTest('Test 28: Metadata errors collected with merge errors', test28_MetadataErrorsCollectedWithMergeErrors));
results.push(runTest('Test 29: Metadata checked on every node', test29_MetadataCheckedOnEveryNode));
results.push(runTest('Test 30: Valid metadata with valid merge passes', test30_ValidMetadataWithValidMergePasses));

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
