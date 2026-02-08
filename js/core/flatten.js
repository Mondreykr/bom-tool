// flatten.js - BOM flattening and sorting

import { getCompositeKey, decimalToFractional } from './utils.js';

// Flatten BOM with recursive aggregation
export function flattenBOM(rootNode, unitQty) {
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
export function sortBOM(items) {
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
