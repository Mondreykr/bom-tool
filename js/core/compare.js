// compare.js - BOM comparison and subtree operations

import { getCompositeKey, parseLength } from './utils.js';
import { BOMNode } from './tree.js';

// Compare two flattened BOMs and return comparison results
export function compareBOMs(oldFlattened, newFlattened) {
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
                lengthFractional: newItem.lengthFractional,
                oldQty: null,
                newQty: newItem.qty,
                deltaQty: null,
                oldPurchaseDescription: null,
                newPurchaseDescription: newItem.purchaseDescription,
                attributesChanged: []
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
                const changedAttrs = [];
                if (qtyChanged) changedAttrs.push('Qty');
                if (descChanged) changedAttrs.push('Description');
                if (purDescChanged) changedAttrs.push('Purchase Desc');

                results.push({
                    changeType: 'Changed',
                    partNumber: oldItem.partNumber,
                    componentType: oldItem.componentType || newItem.componentType,
                    oldDescription: oldItem.description,
                    newDescription: newItem.description,
                    lengthDecimal: oldItem.lengthDecimal,
                    lengthFractional: newItem.lengthFractional,
                    oldQty: oldItem.qty,
                    newQty: newItem.qty,
                    deltaQty: newItem.qty - oldItem.qty,
                    oldPurchaseDescription: oldItem.purchaseDescription,
                    newPurchaseDescription: newItem.purchaseDescription,
                    attributesChanged: changedAttrs
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
                lengthFractional: oldItem.lengthFractional,
                oldQty: oldItem.qty,
                newQty: null,
                deltaQty: null,
                oldPurchaseDescription: oldItem.purchaseDescription,
                newPurchaseDescription: null,
                attributesChanged: []
            });
        }
    });

    return results;
}

// Find a node in the tree by part number
export function findNodeByPartNumber(node, targetPartNumber) {
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
export function extractSubtree(node) {
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
