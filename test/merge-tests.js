import { BOMNode } from '../js/core/tree.js';
import { isReleased, buildPNIndex, mergeBOM } from '../js/core/merge.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a BOMNode from simplified parameters for testing.
 * Provides sensible defaults for fields not relevant to merge logic.
 */
function makeNode({
    partNumber,
    componentType = 'Assembly',
    state = 'Issued for Purchasing',
    qty = 1,
    description = '',
    revision = 'A',
    children = []
}) {
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
        'NS Item Type': componentType === 'Assembly' ? 'Assembly Item' : 'Inventory Item',
        Revision: revision
    };

    const node = new BOMNode(rowData);
    node.children = children;
    return node;
}

/**
 * Walk the tree and verify every node has a source tag.
 * Returns array of errors (empty if all nodes tagged).
 */
function verifySourceTags(node, path = '') {
    const errors = [];
    const nodePath = path ? `${path}/${node.partNumber}` : node.partNumber;

    if (!node._source || (node._source !== 'current' && node._source !== 'grafted')) {
        errors.push(`Node ${nodePath} missing or invalid source tag (got: ${node._source})`);
    }

    node.children.forEach(child => {
        errors.push(...verifySourceTags(child, nodePath));
    });

    return errors;
}

/**
 * Count nodes by source tag in the tree.
 */
function countSourceTags(node) {
    let current = 0;
    let grafted = 0;

    function walk(n) {
        if (n._source === 'current') current++;
        if (n._source === 'grafted') grafted++;
        n.children.forEach(walk);
    }

    walk(node);
    return { current, grafted };
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
// TEST CASES
// ============================================================================

function test1_StateWhitelistDetection() {
    console.log('  Testing: isReleased state whitelist (MERGE-01)');
    const errors = [];

    // Should return true for approved states
    if (!isReleased('Issued for Purchasing')) {
        errors.push('isReleased("Issued for Purchasing") should return true');
    }
    if (!isReleased('Issued for Use')) {
        errors.push('isReleased("Issued for Use") should return true');
    }

    // Should return false for WIP states
    if (isReleased('Under Revision')) {
        errors.push('isReleased("Under Revision") should return false');
    }
    if (isReleased('In Design')) {
        errors.push('isReleased("In Design") should return false');
    }

    // Should return false for edge cases
    if (isReleased('')) {
        errors.push('isReleased("") should return false');
    }
    if (isReleased(undefined)) {
        errors.push('isReleased(undefined) should return false');
    }
    if (isReleased(null)) {
        errors.push('isReleased(null) should return false');
    }
    if (isReleased('Random String')) {
        errors.push('isReleased("Random String") should return false');
    }

    return errors;
}

function test2_BasicGraftL1WIP() {
    console.log('  Testing: Basic graft — L1 WIP assembly (MERGE-02)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[Under Revision] with children C1(3), C2(2)
    const C1_current = makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 });
    const C2_current = makeNode({ partNumber: 'C2', componentType: 'Part', qty: 2 });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Under Revision',
        children: [C1_current, C2_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1): GA -> A1 with children C1(1), C2(1)
    const C1_prior = makeNode({ partNumber: 'C1', componentType: 'Part', qty: 1 });
    const C2_prior = makeNode({ partNumber: 'C2', componentType: 'Part', qty: 1 });
    const A1_prior = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        children: [C1_prior, C2_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A1's children come from B(n-1) (qty 1, 1), not X(n) (qty 3, 2)
    const mergedA1 = mergedTree.children[0];
    if (mergedA1.children.length !== 2) {
        errors.push(`Expected A1 to have 2 children, got ${mergedA1.children.length}`);
    } else {
        const mergedC1 = mergedA1.children.find(c => c.partNumber === 'C1');
        const mergedC2 = mergedA1.children.find(c => c.partNumber === 'C2');

        if (!mergedC1) {
            errors.push('C1 not found in merged A1');
        } else if (mergedC1.qty !== 1) {
            errors.push(`Expected C1 qty from B(n-1) = 1, got ${mergedC1.qty}`);
        }

        if (!mergedC2) {
            errors.push('C2 not found in merged A1');
        } else if (mergedC2.qty !== 1) {
            errors.push(`Expected C2 qty from B(n-1) = 1, got ${mergedC2.qty}`);
        }
    }

    // Assert: A1 node tagged 'grafted', GA tagged 'current'
    if (mergedA1._source !== 'grafted') {
        errors.push(`Expected A1._source = 'grafted', got '${mergedA1._source}'`);
    }
    if (mergedTree._source !== 'current') {
        errors.push(`Expected GA._source = 'current', got '${mergedTree._source}'`);
    }

    return errors;
}

function test3_REV0Mode() {
    console.log('  Testing: REV0 mode — no prior artifact (MERGE-03)');
    const errors = [];

    // Build tree: GA[IFP] -> A1[IFU] with children, A2[Under Revision] with children
    const A1 = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part' })
        ]
    });
    const A2 = makeNode({
        partNumber: 'A2',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C2', componentType: 'Part' })
        ]
    });
    const GA = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1, A2]
    });

    // Call merge with priorBOM = null
    const { mergedTree, warnings } = mergeBOM(GA, null);

    // Assert: A1 passes through (Released)
    const mergedA1 = mergedTree.children.find(c => c.partNumber === 'A1');
    if (!mergedA1) {
        errors.push('A1 not found in merged tree');
    } else {
        if (mergedA1.children.length !== 1) {
            errors.push(`Expected A1 to have 1 child, got ${mergedA1.children.length}`);
        }
        if (mergedA1._source !== 'current') {
            errors.push(`Expected A1._source = 'current', got '${mergedA1._source}'`);
        }
    }

    // Assert: A2 becomes empty placeholder (no children)
    const mergedA2 = mergedTree.children.find(c => c.partNumber === 'A2');
    if (!mergedA2) {
        errors.push('A2 not found in merged tree');
    } else {
        if (mergedA2.children.length !== 0) {
            errors.push(`Expected A2 to be empty placeholder, got ${mergedA2.children.length} children`);
        }
        if (mergedA2._source !== 'grafted') {
            errors.push(`Expected A2._source = 'grafted', got '${mergedA2._source}'`);
        }
    }

    // Assert: warning generated for A2
    const hasA2Warning = warnings.some(w => w.includes('A2'));
    if (!hasA2Warning) {
        errors.push('Expected warning for A2 being WIP with no prior release');
    }

    return errors;
}

function test4_EmptyPlaceholderForNewWIP() {
    console.log('  Testing: Empty placeholder for WIP not in B(n-1) (MERGE-04)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFP], A2[In Design] (A2 is new)
    const A1_current = makeNode({ partNumber: 'A1', state: 'Issued for Purchasing' });
    const A2_current = makeNode({
        partNumber: 'A2',
        state: 'In Design',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part' })
        ]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current, A2_current]
    });

    // Build B(n-1) containing only A1 (no A2)
    const A1_prior = makeNode({ partNumber: 'A1' });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A2 is present in result as assembly node with zero children
    const mergedA2 = mergedTree.children.find(c => c.partNumber === 'A2');
    if (!mergedA2) {
        errors.push('A2 not found in merged tree');
    } else {
        if (mergedA2.componentType !== 'Assembly') {
            errors.push(`Expected A2 componentType = 'Assembly', got '${mergedA2.componentType}'`);
        }
        if (mergedA2.children.length !== 0) {
            errors.push(`Expected A2 to be empty placeholder, got ${mergedA2.children.length} children`);
        }
    }

    // Assert: warning generated for A2
    const hasA2Warning = warnings.some(w => w.includes('A2'));
    if (!hasA2Warning) {
        errors.push('Expected warning for A2 being WIP with no prior release');
    }

    return errors;
}

function test5_MultiBranchIndependence() {
    console.log('  Testing: Multi-branch independence (MERGE-05)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[Under Revision], A2[IFU] -> A6[IFU], A3[IFP], C7
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 5 })
        ]
    });
    const A6_current = makeNode({
        partNumber: 'A6',
        state: 'Issued for Use'
    });
    const A2_current = makeNode({
        partNumber: 'A2',
        state: 'Issued for Use',
        children: [A6_current]
    });
    const A3_current = makeNode({
        partNumber: 'A3',
        state: 'Issued for Purchasing'
    });
    const C7_current = makeNode({
        partNumber: 'C7',
        componentType: 'Part'
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current, A2_current, A3_current, C7_current]
    });

    // Build B(n-1) with A1 having different children than X(n)
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A1 grafted
    const mergedA1 = mergedTree.children.find(c => c.partNumber === 'A1');
    if (!mergedA1) {
        errors.push('A1 not found in merged tree');
    } else {
        if (mergedA1._source !== 'grafted') {
            errors.push(`Expected A1._source = 'grafted', got '${mergedA1._source}'`);
        }
        // Check that A1's children came from B(n-1) (qty 3, not 5)
        const C1 = mergedA1.children.find(c => c.partNumber === 'C1');
        if (!C1) {
            errors.push('C1 not found in grafted A1');
        } else if (C1.qty !== 3) {
            errors.push(`Expected C1 qty from B(n-1) = 3, got ${C1.qty}`);
        }
    }

    // Assert: A2, A6, A3, C7 all from current
    const mergedA2 = mergedTree.children.find(c => c.partNumber === 'A2');
    const mergedA3 = mergedTree.children.find(c => c.partNumber === 'A3');
    const mergedC7 = mergedTree.children.find(c => c.partNumber === 'C7');

    if (!mergedA2 || mergedA2._source !== 'current') {
        errors.push(`Expected A2._source = 'current', got '${mergedA2?._source}'`);
    }
    if (!mergedA3 || mergedA3._source !== 'current') {
        errors.push(`Expected A3._source = 'current', got '${mergedA3?._source}'`);
    }
    if (!mergedC7 || mergedC7._source !== 'current') {
        errors.push(`Expected C7._source = 'current', got '${mergedC7?._source}'`);
    }

    // Check A6 under A2
    if (mergedA2) {
        const mergedA6 = mergedA2.children.find(c => c.partNumber === 'A6');
        if (!mergedA6 || mergedA6._source !== 'current') {
            errors.push(`Expected A6._source = 'current', got '${mergedA6?._source}'`);
        }
    }

    return errors;
}

function test6_DeepWIPAtL2() {
    console.log('  Testing: Deep WIP at L2 (MERGE-06)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFU] -> A5[Under Revision] with children C1(5)
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 5 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1): GA -> A1 -> A5 with children C1(3)
    const A5_prior = makeNode({
        partNumber: 'A5',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A1 from current (released)
    const mergedA1 = mergedTree.children[0];
    if (mergedA1._source !== 'current') {
        errors.push(`Expected A1._source = 'current', got '${mergedA1._source}'`);
    }

    // Assert: A5 grafted from B(n-1) (C1 qty 3, not 5)
    const mergedA5 = mergedA1.children[0];
    if (mergedA5._source !== 'grafted') {
        errors.push(`Expected A5._source = 'grafted', got '${mergedA5._source}'`);
    }
    if (mergedA5.children.length !== 1) {
        errors.push(`Expected A5 to have 1 child, got ${mergedA5.children.length}`);
    } else {
        const C1 = mergedA5.children[0];
        if (C1.qty !== 3) {
            errors.push(`Expected C1 qty from B(n-1) = 3, got ${C1.qty}`);
        }
    }

    return errors;
}

function test7_DeepWIPAtL3() {
    console.log('  Testing: Deep WIP at L3 (MERGE-06)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFU] -> A5[IFU] -> A9[Under Revision] with children
    const A9_current = makeNode({
        partNumber: 'A9',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 7 })
        ]
    });
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Issued for Use',
        children: [A9_current]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1) with A9 having different children
    const A9_prior = makeNode({
        partNumber: 'A9',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 4 })
        ]
    });
    const A5_prior = makeNode({
        partNumber: 'A5',
        children: [A9_prior]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A1 and A5 from current
    const mergedA1 = mergedTree.children[0];
    const mergedA5 = mergedA1.children[0];

    if (mergedA1._source !== 'current') {
        errors.push(`Expected A1._source = 'current', got '${mergedA1._source}'`);
    }
    if (mergedA5._source !== 'current') {
        errors.push(`Expected A5._source = 'current', got '${mergedA5._source}'`);
    }

    // Assert: A9 grafted from B(n-1)
    const mergedA9 = mergedA5.children[0];
    if (mergedA9._source !== 'grafted') {
        errors.push(`Expected A9._source = 'grafted', got '${mergedA9._source}'`);
    }
    if (mergedA9.children.length !== 1) {
        errors.push(`Expected A9 to have 1 child, got ${mergedA9.children.length}`);
    } else {
        const C1 = mergedA9.children[0];
        if (C1.qty !== 4) {
            errors.push(`Expected C1 qty from B(n-1) = 4, got ${C1.qty}`);
        }
    }

    return errors;
}

function test8_SourceTagsOnEveryNode() {
    console.log('  Testing: Source tags on every node (all)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[Under Revision], A2[IFU] -> A6[IFU], A3[IFP], C7
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 5 })
        ]
    });
    const A6_current = makeNode({
        partNumber: 'A6',
        state: 'Issued for Use'
    });
    const A2_current = makeNode({
        partNumber: 'A2',
        state: 'Issued for Use',
        children: [A6_current]
    });
    const A3_current = makeNode({
        partNumber: 'A3',
        state: 'Issued for Purchasing'
    });
    const C7_current = makeNode({
        partNumber: 'C7',
        componentType: 'Part'
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current, A2_current, A3_current, C7_current]
    });

    // Build B(n-1) with A1 having different children than X(n)
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Verify EVERY node has a source tag
    const tagErrors = verifySourceTags(mergedTree);
    errors.push(...tagErrors);

    // Verify the WIP assembly node and all children beneath it are tagged 'grafted'
    const mergedA1 = mergedTree.children.find(c => c.partNumber === 'A1');
    if (mergedA1) {
        const graftedNodeErrors = verifySourceTags(mergedA1).filter(e => !e.includes('grafted'));
        if (graftedNodeErrors.length > 0) {
            errors.push('All nodes under grafted A1 should be tagged grafted');
        }
    }

    return errors;
}

function test9_SameWIPAtMultipleLocations() {
    console.log('  Testing: Same WIP assembly at multiple locations');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFU] -> A5[WIP](qty 2), and also GA -> A5[WIP](qty 1) directly under GA
    const A5_under_A1 = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        qty: 2,
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 10 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_under_A1]
    });
    const A5_under_GA = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        qty: 1,
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 10 })
        ]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current, A5_under_GA]
    });

    // Build B(n-1) with A5 having children C1(3)
    const A5_prior = makeNode({
        partNumber: 'A5',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A5_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: Both instances of A5 get grafted from B(n-1)
    const mergedA1 = mergedTree.children.find(c => c.partNumber === 'A1');
    const mergedA5_under_A1 = mergedA1?.children.find(c => c.partNumber === 'A5');
    const mergedA5_under_GA = mergedTree.children.find(c => c.partNumber === 'A5');

    if (!mergedA5_under_A1) {
        errors.push('A5 under A1 not found in merged tree');
    } else {
        if (mergedA5_under_A1._source !== 'grafted') {
            errors.push(`Expected A5 under A1 to be grafted, got '${mergedA5_under_A1._source}'`);
        }
        // Check children came from B(n-1)
        const C1 = mergedA5_under_A1.children.find(c => c.partNumber === 'C1');
        if (!C1) {
            errors.push('C1 not found in grafted A5 under A1');
        } else if (C1.qty !== 3) {
            errors.push(`Expected C1 qty in A5 under A1 = 3, got ${C1.qty}`);
        }
    }

    if (!mergedA5_under_GA) {
        errors.push('A5 under GA not found in merged tree');
    } else {
        if (mergedA5_under_GA._source !== 'grafted') {
            errors.push(`Expected A5 under GA to be grafted, got '${mergedA5_under_GA._source}'`);
        }
        // Check children came from B(n-1)
        const C1 = mergedA5_under_GA.children.find(c => c.partNumber === 'C1');
        if (!C1) {
            errors.push('C1 not found in grafted A5 under GA');
        } else if (C1.qty !== 3) {
            errors.push(`Expected C1 qty in A5 under GA = 3, got ${C1.qty}`);
        }
    }

    return errors;
}

function test10_AllAssembliesReleasedPassthrough() {
    console.log('  Testing: All assemblies released — passthrough');
    const errors = [];

    // Build tree where every assembly is IFP or IFU
    const A2_current = makeNode({
        partNumber: 'A2',
        state: 'Issued for Use',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 2 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        children: [A2_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1) (should not be used)
    const A2_prior = makeNode({
        partNumber: 'A2',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 99 })
        ]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A2_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: result structurally identical to X(n), all nodes tagged 'current'
    const counts = countSourceTags(mergedTree);
    if (counts.grafted !== 0) {
        errors.push(`Expected no grafted nodes, found ${counts.grafted}`);
    }
    if (counts.current === 0) {
        errors.push('Expected all nodes to be current');
    }

    // Check that C1 qty is from X(n) (2), not B(n-1) (99)
    const mergedA1 = mergedTree.children[0];
    const mergedA2 = mergedA1.children[0];
    const mergedC1 = mergedA2.children[0];
    if (mergedC1.qty !== 2) {
        errors.push(`Expected C1 qty from X(n) = 2, got ${mergedC1.qty}`);
    }

    return errors;
}

function test11_PNBasedMatching() {
    console.log('  Testing: PN-based matching');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFU] -> A5[WIP]
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 10 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1) where A5 is at a different tree position (directly under GA)
    const A5_prior = makeNode({
        partNumber: 'A5',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A5_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A5 is still found and grafted by PN match regardless of position
    const mergedA1 = mergedTree.children[0];
    const mergedA5 = mergedA1.children[0];

    if (mergedA5._source !== 'grafted') {
        errors.push(`Expected A5 to be grafted, got '${mergedA5._source}'`);
    }

    // Check children came from B(n-1)
    const C1 = mergedA5.children.find(c => c.partNumber === 'C1');
    if (!C1) {
        errors.push('C1 not found in grafted A5');
    } else if (C1.qty !== 3) {
        errors.push(`Expected C1 qty from B(n-1) = 3, got ${C1.qty}`);
    }

    return errors;
}

function test12_QuantitySourcingAtGraftBoundary() {
    console.log('  Testing: Quantity sourcing at graft boundary (MERGE-07)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFU] -> A5[Under Revision](qty 3 in X(n))
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        qty: 3,
        description: 'Assembly Rev B',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 10 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1): GA -> A1 -> A5(qty 2) with children C1(3), C2(2)
    const A5_prior = makeNode({
        partNumber: 'A5',
        qty: 2,
        description: 'Assembly Rev A',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 }),
            makeNode({ partNumber: 'C2', componentType: 'Part', qty: 2 })
        ]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A5 appears in result under A1 with qty 3 (from X(n))
    const mergedA1 = mergedTree.children[0];
    const mergedA5 = mergedA1.children[0];

    if (mergedA5.qty !== 3) {
        errors.push(`Expected A5 qty from X(n) = 3, got ${mergedA5.qty}`);
    }

    // Assert: A5's children are from B(n-1): C1(3), C2(2)
    if (mergedA5.children.length !== 2) {
        errors.push(`Expected A5 to have 2 children from B(n-1), got ${mergedA5.children.length}`);
    } else {
        const C1 = mergedA5.children.find(c => c.partNumber === 'C1');
        const C2 = mergedA5.children.find(c => c.partNumber === 'C2');

        if (!C1 || C1.qty !== 3) {
            errors.push(`Expected C1 qty from B(n-1) = 3, got ${C1?.qty}`);
        }
        if (!C2 || C2.qty !== 2) {
            errors.push(`Expected C2 qty from B(n-1) = 2, got ${C2?.qty}`);
        }
    }

    // Assert: A5's metadata (description) comes from B(n-1), not X(n)
    if (mergedA5.description !== 'Assembly Rev A') {
        errors.push(`Expected A5 description from B(n-1) = "Assembly Rev A", got "${mergedA5.description}"`);
    }

    return errors;
}

function test13_QuantitySourcingRootLevelWIP() {
    console.log('  Testing: Quantity sourcing — root-level WIP (MERGE-07)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[Under Revision](qty 1)
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Under Revision',
        qty: 1,
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 5 })
        ]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1): GA -> A1(qty 1) with children C1(5)
    const A1_prior = makeNode({
        partNumber: 'A1',
        qty: 1,
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 5 })
        ]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A1's qty in result is 1 (from X(n)'s GA declaration)
    const mergedA1 = mergedTree.children[0];
    if (mergedA1.qty !== 1) {
        errors.push(`Expected A1 qty from X(n) = 1, got ${mergedA1.qty}`);
    }

    // Assert: A1's children from B(n-1)
    if (mergedA1.children.length !== 1) {
        errors.push(`Expected A1 to have 1 child from B(n-1), got ${mergedA1.children.length}`);
    } else {
        const C1 = mergedA1.children[0];
        if (C1.qty !== 5) {
            errors.push(`Expected C1 qty from B(n-1) = 5, got ${C1.qty}`);
        }
    }

    return errors;
}

function test14_ChangeAnnotationsAtGraftPoint() {
    console.log('  Testing: Change annotations at graft point (locked decision)');
    const errors = [];

    // Build X(n): GA[IFP] -> A1[IFU] -> A5[WIP](qty 3, description "Assembly Rev B")
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        qty: 3,
        description: 'Assembly Rev B',
        revision: 'C',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 10 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1): GA -> A1 -> A5(qty 2, description "Assembly Rev A") with children
    const A5_prior = makeNode({
        partNumber: 'A5',
        qty: 2,
        description: 'Assembly Rev A',
        revision: 'A',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: Grafted A5 node has _changes property
    const mergedA1 = mergedTree.children[0];
    const mergedA5 = mergedA1.children[0];

    if (!mergedA5._changes) {
        errors.push('Expected A5 to have _changes property');
    } else {
        // _changes should be an array
        if (!Array.isArray(mergedA5._changes)) {
            errors.push('Expected _changes to be an array');
        } else {
            // Check for qty difference
            const qtyChange = mergedA5._changes.find(c => c.field === 'qty');
            if (!qtyChange) {
                errors.push('Expected _changes to include qty difference');
            } else {
                if (qtyChange.from !== 2 || qtyChange.to !== 3) {
                    errors.push(`Expected qty change from 2 to 3, got from ${qtyChange.from} to ${qtyChange.to}`);
                }
            }

            // Check for description difference
            const descChange = mergedA5._changes.find(c => c.field === 'description');
            if (!descChange) {
                errors.push('Expected _changes to include description difference');
            } else {
                if (descChange.from !== 'Assembly Rev A' || descChange.to !== 'Assembly Rev B') {
                    errors.push(`Expected description change from "Assembly Rev A" to "Assembly Rev B", got from "${descChange.from}" to "${descChange.to}"`);
                }
            }

            // Check for revision difference
            const revChange = mergedA5._changes.find(c => c.field === 'revision');
            if (!revChange) {
                errors.push('Expected _changes to include revision difference');
            } else {
                if (revChange.from !== 'A' || revChange.to !== 'C') {
                    errors.push(`Expected revision change from "A" to "C", got from "${revChange.from}" to "${revChange.to}"`);
                }
            }
        }
    }

    // Assert: Changes are informational — merge still succeeds (no blocking)
    if (mergedTree.children.length === 0) {
        errors.push('Merge should succeed despite changes');
    }

    return errors;
}

function test15_NoChangeAnnotationsWhenFieldsMatch() {
    console.log('  Testing: No change annotations when fields match (locked decision)');
    const errors = [];

    // Build X(n) with WIP assembly having identical fields to B(n-1) version
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        qty: 2,
        description: 'Assembly Rev A',
        revision: 'A',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1) with identical A5
    const A5_prior = makeNode({
        partNumber: 'A5',
        qty: 2,
        description: 'Assembly Rev A',
        revision: 'A',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: _changes is empty or absent on the grafted node
    const mergedA1 = mergedTree.children[0];
    const mergedA5 = mergedA1.children[0];

    if (mergedA5._changes && Array.isArray(mergedA5._changes) && mergedA5._changes.length > 0) {
        errors.push(`Expected _changes to be empty when fields match, got ${mergedA5._changes.length} changes`);
    }

    return errors;
}

function test16_MissingAssemblyWarningAbsentFromXn() {
    console.log('  Testing: Missing assembly warning — in B(n-1) but absent from X(n) (locked decision)');
    const errors = [];

    // Build B(n-1): GA -> A1, A2, A3 (all assemblies)
    const A1_prior = makeNode({ partNumber: 'A1' });
    const A2_prior = makeNode({ partNumber: 'A2' });
    const A3_prior = makeNode({ partNumber: 'A3' });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior, A2_prior, A3_prior]
    });

    // Build X(n): GA[IFP] -> A1[IFP], A3[IFP] (A2 missing — deleted or suppressed)
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing'
    });
    const A3_current = makeNode({
        partNumber: 'A3',
        state: 'Issued for Purchasing'
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current, A3_current]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: warnings include message about A2 being in B(n-1) but absent from X(n)
    const hasA2Warning = warnings.some(w => w.includes('A2') && (w.includes('absent') || w.includes('missing')));
    if (!hasA2Warning) {
        errors.push('Expected warning for A2 being in B(n-1) but absent from X(n)');
    }

    // Assert: A2 is NOT carried forward into the merged result
    const mergedA2 = mergedTree.children.find(c => c.partNumber === 'A2');
    if (mergedA2) {
        errors.push('A2 should not be carried forward (warning is informational only)');
    }

    // Assert: A1 and A3 pass through normally
    const mergedA1 = mergedTree.children.find(c => c.partNumber === 'A1');
    const mergedA3 = mergedTree.children.find(c => c.partNumber === 'A3');
    if (!mergedA1 || mergedA1._source !== 'current') {
        errors.push('A1 should pass through from X(n)');
    }
    if (!mergedA3 || mergedA3._source !== 'current') {
        errors.push('A3 should pass through from X(n)');
    }

    return errors;
}

function test17_MissingAssemblyWarningDeepAssemblyAbsent() {
    console.log('  Testing: Missing assembly warning — deep assembly absent (locked decision)');
    const errors = [];

    // Build B(n-1): GA -> A1 -> A5, A6
    const A5_prior = makeNode({ partNumber: 'A5' });
    const A6_prior = makeNode({ partNumber: 'A6' });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior, A6_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Build X(n): GA[IFP] -> A1[IFP] -> A5[IFP] (A6 absent)
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Issued for Purchasing'
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Purchasing',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: warning about A6 missing
    const hasA6Warning = warnings.some(w => w.includes('A6') && (w.includes('absent') || w.includes('missing')));
    if (!hasA6Warning) {
        errors.push('Expected warning for A6 being in B(n-1) but absent from X(n)');
    }

    // Assert: A6 not in result
    const mergedA1 = mergedTree.children[0];
    const mergedA6 = mergedA1.children.find(c => c.partNumber === 'A6');
    if (mergedA6) {
        errors.push('A6 should not be carried forward');
    }

    return errors;
}

function test18_MergeSummaryStatistics() {
    console.log('  Testing: Merge summary statistics (for downstream UI)');
    const errors = [];

    // Build tree with mix of Released assemblies, grafted WIP assemblies, and one placeholder
    // GA[IFP] -> A1[IFU], A2[Under Revision] (graft), A3[In Design] (placeholder)
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part' })
        ]
    });
    const A2_current = makeNode({
        partNumber: 'A2',
        state: 'Under Revision',
        children: [
            makeNode({ partNumber: 'C2', componentType: 'Part', qty: 10 })
        ]
    });
    const A3_current = makeNode({
        partNumber: 'A3',
        state: 'In Design',
        children: [
            makeNode({ partNumber: 'C3', componentType: 'Part', qty: 5 })
        ]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current, A2_current, A3_current]
    });

    // Build B(n-1) with A2 only (A3 not present — will be placeholder)
    const A2_prior = makeNode({
        partNumber: 'A2',
        children: [
            makeNode({ partNumber: 'C2', componentType: 'Part', qty: 3 })
        ]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A2_prior]
    });

    // Merge
    const result = mergeBOM(GA_current, GA_prior);

    // Assert: return value includes summary object
    if (!result.summary) {
        errors.push('Expected result to include summary object');
        return errors;
    }

    const { summary } = result;

    // Assert: summary has required counts
    if (typeof summary.passedThrough !== 'number') {
        errors.push('Expected summary.passedThrough to be a number');
    }
    if (typeof summary.grafted !== 'number') {
        errors.push('Expected summary.grafted to be a number');
    }
    if (typeof summary.placeholders !== 'number') {
        errors.push('Expected summary.placeholders to be a number');
    }

    // Expected counts:
    // passedThrough: GA (root), A1 = 2
    // grafted: A2 = 1
    // placeholders: A3 = 1
    if (summary.passedThrough !== 2) {
        errors.push(`Expected passedThrough = 2, got ${summary.passedThrough}`);
    }
    if (summary.grafted !== 1) {
        errors.push(`Expected grafted = 1, got ${summary.grafted}`);
    }
    if (summary.placeholders !== 1) {
        errors.push(`Expected placeholders = 1, got ${summary.placeholders}`);
    }

    return errors;
}

function test19_RevisionMismatchStillGrafts() {
    console.log('  Testing: Revision mismatch — still grafts (locked decision)');
    const errors = [];

    // Build X(n) with A5[WIP] revision "C"
    const A5_current = makeNode({
        partNumber: 'A5',
        state: 'Under Revision',
        revision: 'C',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 10 })
        ]
    });
    const A1_current = makeNode({
        partNumber: 'A1',
        state: 'Issued for Use',
        children: [A5_current]
    });
    const GA_current = makeNode({
        partNumber: 'GA',
        state: 'Issued for Purchasing',
        children: [A1_current]
    });

    // Build B(n-1) with A5 revision "A"
    const A5_prior = makeNode({
        partNumber: 'A5',
        revision: 'A',
        children: [
            makeNode({ partNumber: 'C1', componentType: 'Part', qty: 3 })
        ]
    });
    const A1_prior = makeNode({
        partNumber: 'A1',
        children: [A5_prior]
    });
    const GA_prior = makeNode({
        partNumber: 'GA',
        children: [A1_prior]
    });

    // Merge
    const { mergedTree, warnings } = mergeBOM(GA_current, GA_prior);

    // Assert: A5 is still grafted (no additional warning for rev mismatch)
    const mergedA1 = mergedTree.children[0];
    const mergedA5 = mergedA1.children[0];

    if (mergedA5._source !== 'grafted') {
        errors.push(`Expected A5 to be grafted despite revision mismatch, got source '${mergedA5._source}'`);
    }

    // Assert: Graft happened (children from B(n-1))
    if (mergedA5.children.length !== 1) {
        errors.push(`Expected A5 to have children from B(n-1), got ${mergedA5.children.length} children`);
    } else {
        const C1 = mergedA5.children[0];
        if (C1.qty !== 3) {
            errors.push(`Expected C1 qty from B(n-1) = 3, got ${C1.qty}`);
        }
    }

    return errors;
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('BOM TOOL - MERGE ENGINE TESTS');
console.log('='.repeat(60));

const results = [];

results.push(runTest('Test 1: State whitelist detection', test1_StateWhitelistDetection));
results.push(runTest('Test 2: Basic graft — L1 WIP assembly', test2_BasicGraftL1WIP));
results.push(runTest('Test 3: REV0 mode — no prior artifact', test3_REV0Mode));
results.push(runTest('Test 4: Empty placeholder for WIP not in B(n-1)', test4_EmptyPlaceholderForNewWIP));
results.push(runTest('Test 5: Multi-branch independence', test5_MultiBranchIndependence));
results.push(runTest('Test 6: Deep WIP at L2', test6_DeepWIPAtL2));
results.push(runTest('Test 7: Deep WIP at L3', test7_DeepWIPAtL3));
results.push(runTest('Test 8: Source tags on every node', test8_SourceTagsOnEveryNode));
results.push(runTest('Test 9: Same WIP assembly at multiple locations', test9_SameWIPAtMultipleLocations));
results.push(runTest('Test 10: All assemblies released — passthrough', test10_AllAssembliesReleasedPassthrough));
results.push(runTest('Test 11: PN-based matching', test11_PNBasedMatching));
results.push(runTest('Test 12: Quantity sourcing at graft boundary', test12_QuantitySourcingAtGraftBoundary));
results.push(runTest('Test 13: Quantity sourcing — root-level WIP', test13_QuantitySourcingRootLevelWIP));
results.push(runTest('Test 14: Change annotations at graft point', test14_ChangeAnnotationsAtGraftPoint));
results.push(runTest('Test 15: No change annotations when fields match', test15_NoChangeAnnotationsWhenFieldsMatch));
results.push(runTest('Test 16: Missing assembly warning — absent from X(n)', test16_MissingAssemblyWarningAbsentFromXn));
results.push(runTest('Test 17: Missing assembly warning — deep assembly absent', test17_MissingAssemblyWarningDeepAssemblyAbsent));
results.push(runTest('Test 18: Merge summary statistics', test18_MergeSummaryStatistics));
results.push(runTest('Test 19: Revision mismatch — still grafts', test19_RevisionMismatchStillGrafts));

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
