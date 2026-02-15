// validate.js - Pre-merge BOM validation

import { isReleased } from './merge.js';

/**
 * Determines if a node is an assembly based on NS Item Type field.
 *
 * This is the SINGLE authoritative assembly check for the entire codebase.
 * Per locked user decision: "Use NS Item Type field as the authoritative
 * assembly identifier, NOT Component Type."
 *
 * Component Type is unreliable: real cases exist where Component Type =
 * 'Manufactured' but NS Item Type = 'Assembly' and the item has children.
 *
 * @param {BOMNode} node - Node to check
 * @returns {boolean} - true if node is an assembly, false otherwise
 */
export function isAssembly(node) {
    // Check if nsItemType field equals 'Assembly'
    // Handle undefined, null, or empty string — all return false
    return node.nsItemType === 'Assembly';
}

/**
 * Validates metadata for a single node (Rules 3-9).
 * Checks part number format, required fields, whitelisted values, and cross-field consistency.
 *
 * @param {BOMNode} node - Node to validate
 * @param {string} ancestorPath - Ancestor path for error messages
 * @returns {Array<{message: string, path: string, rule: string}>} - Array of error objects
 */
export function validateMetadata(node, ancestorPath) {
    const errors = [];
    const path = ancestorPath || node.partNumber;

    // Rule 3: Part Number Format
    const partNumberRegex = /^(1\d{6}(-\d{2}(-\d)?)?|[23]\d{5})$/;
    if (!partNumberRegex.test(node.partNumber)) {
        errors.push({
            message: `${node.partNumber} at ${path}: Part number does not match expected format (1xxxxxx, 2xxxxx, or 3xxxxx)`,
            path: path,
            rule: 'invalid-part-number'
        });
    }

    // Rule 4: Description Required
    if (!node.description || node.description.trim() === '') {
        errors.push({
            message: `${node.partNumber} at ${path}: Description is empty — every part must have a description`,
            path: path,
            rule: 'missing-description'
        });
    }

    // Rule 5: Revision Must Be Integer
    if (!/^\d+$/.test(String(node.revision).trim())) {
        errors.push({
            message: `${node.partNumber} at ${path}: Revision '${node.revision}' is not a valid integer`,
            path: path,
            rule: 'invalid-revision'
        });
    }

    // Rule 6: NS Item Type Whitelist
    const validNsItemTypes = ['Inventory', 'Lot Numbered Inventory', 'Assembly'];
    if (node.nsItemType && node.nsItemType !== '' && !validNsItemTypes.includes(node.nsItemType)) {
        errors.push({
            message: `${node.partNumber} at ${path}: NS Item Type '${node.nsItemType}' is not a recognized type (expected Inventory, Lot Numbered Inventory, or Assembly)`,
            path: path,
            rule: 'invalid-ns-item-type'
        });
    }

    // Rule 7: Component Type Whitelist
    const validComponentTypes = ['Purchased', 'Manufactured', 'Raw Stock', 'Assembly'];
    if (!validComponentTypes.includes(node.componentType)) {
        errors.push({
            message: `${node.partNumber} at ${path}: Component Type '${node.componentType}' is not a recognized type (expected Purchased, Manufactured, Raw Stock, or Assembly)`,
            path: path,
            rule: 'invalid-component-type'
        });
    }

    // Rule 8: Unit of Measure Whitelist
    const validUoMs = ['ea', 'in', 'sq in'];
    if (!validUoMs.includes(node.uofm)) {
        errors.push({
            message: `${node.partNumber} at ${path}: Unit of Measure '${node.uofm}' is not recognized (expected ea, in, or sq in)`,
            path: path,
            rule: 'invalid-uofm'
        });
    }

    // Rule 9: Cross-Field Consistency
    // Only run if NS Item Type is valid (passed Rule 6)
    if (validNsItemTypes.includes(node.nsItemType)) {
        if (node.nsItemType === 'Inventory') {
            // UoM must be 'ea'
            if (node.uofm !== 'ea') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Unit of Measure '${node.uofm}' is not valid for NS Item Type 'Inventory' (expected ea)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
            // Length must be empty, blank, or '-'
            const rawLength = node.rawLength.trim();
            if (rawLength !== '' && rawLength !== '-') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Length '${node.rawLength}' is not valid for NS Item Type 'Inventory' (expected empty or -)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
            // Component Type must be 'Purchased' or 'Manufactured'
            if (node.componentType !== 'Purchased' && node.componentType !== 'Manufactured') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Component Type '${node.componentType}' is not valid for NS Item Type 'Inventory' (expected Purchased or Manufactured)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
        } else if (node.nsItemType === 'Assembly') {
            // UoM must be 'ea'
            if (node.uofm !== 'ea') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Unit of Measure '${node.uofm}' is not valid for NS Item Type 'Assembly' (expected ea)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
            // Length must be empty, blank, or '-'
            const rawLength = node.rawLength.trim();
            if (rawLength !== '' && rawLength !== '-') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Length '${node.rawLength}' is not valid for NS Item Type 'Assembly' (expected empty or -)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
            // Component Type must be 'Assembly' or 'Manufactured'
            if (node.componentType !== 'Assembly' && node.componentType !== 'Manufactured') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Component Type '${node.componentType}' is not valid for NS Item Type 'Assembly' (expected Assembly or Manufactured)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
        } else if (node.nsItemType === 'Lot Numbered Inventory') {
            // UoM must be 'in' or 'sq in'
            if (node.uofm !== 'in' && node.uofm !== 'sq in') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Unit of Measure '${node.uofm}' is not valid for NS Item Type 'Lot Numbered Inventory' (expected in or sq in)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
            // Length must be a decimal number, optionally with "in" suffix
            const lengthRegex = /^\d+(\.\d+)?(in)?$/;
            if (!lengthRegex.test(node.rawLength.trim())) {
                errors.push({
                    message: `${node.partNumber} at ${path}: Length '${node.rawLength}' is not valid for NS Item Type 'Lot Numbered Inventory' (expected decimal number with optional 'in' suffix)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
            // Component Type must be 'Raw Stock'
            if (node.componentType !== 'Raw Stock') {
                errors.push({
                    message: `${node.partNumber} at ${path}: Component Type '${node.componentType}' is not valid for NS Item Type 'Lot Numbered Inventory' (expected Raw Stock)`,
                    path: path,
                    rule: 'cross-field-inconsistency'
                });
            }
        }
    }

    return errors;
}

/**
 * Validates a BOM tree before merge, checking all validation rules.
 *
 * Walks the entire tree recursively, collecting ALL errors before returning.
 * This allows users to fix all issues in one PDM session rather than
 * discovering problems one at a time.
 *
 * Validation Rules:
 * - Rule 0: GA root must be Released (IFP or IFU)
 * - Rule 1: No WIP non-assembly items under Released assemblies
 * - Rule 2: Released assemblies with only sub-assembly children must have
 *           at least one Released child (not all WIP)
 * - Missing NS Item Type on any node blocks merge
 *
 * @param {BOMNode} rootNode - Root of the BOM tree to validate
 * @returns {{valid: boolean, errors: Array<{message: string, path: string, rule: string}>}}
 */
export function validateBOM(rootNode) {
    const errors = [];

    // Rule 0: Check root node (GA must be Released)
    if (!isReleased(rootNode.state)) {
        errors.push({
            message: `GA root ${rootNode.partNumber} is WIP (${rootNode.state}) — Release GA ${rootNode.partNumber} in PDM before creating IFP artifact`,
            path: rootNode.partNumber,
            rule: 'wip-ga'
        });
    }

    // Recursive validation walk
    // Track ancestor path for error messages
    function walkAndValidate(node, ancestors = []) {
        const currentPath = ancestors.map(a => a.partNumber).join(' > ');

        // Check for missing NS Item Type (applies to ALL nodes)
        if (!node.nsItemType || node.nsItemType === '') {
            errors.push({
                message: `Missing NS Item Type on ${node.partNumber} at ${currentPath || 'root'} — cannot validate without knowing node type`,
                path: currentPath || node.partNumber,
                rule: 'missing-ns-item-type'
            });
            // Don't try to validate this node further, but DO recurse to find more missing types
            for (const child of node.children) {
                walkAndValidate(child, [...ancestors, node]);
            }
            return;
        }

        // Metadata validation (Rules 3-9) — runs on every node
        const metadataErrors = validateMetadata(node, currentPath || node.partNumber);
        errors.push(...metadataErrors);

        // If this is a Released assembly, apply validation rules to children
        if (isAssembly(node) && isReleased(node.state)) {
            // Collect child info for Rule 1 and Rule 2 checks
            let hasNonAssemblyChildren = false;
            let hasReleasedChild = false;

            for (const child of node.children) {
                // Check child for missing NS Item Type first
                if (!child.nsItemType || child.nsItemType === '') {
                    const childPath = currentPath ? `${currentPath} > ${node.partNumber}` : node.partNumber;
                    errors.push({
                        message: `Missing NS Item Type on ${child.partNumber} at ${childPath} — cannot validate without knowing node type`,
                        path: childPath,
                        rule: 'missing-ns-item-type'
                    });
                    // Continue to next child (can't validate this child)
                    continue;
                }

                const childIsAssembly = isAssembly(child);
                const childIsReleased = isReleased(child.state);

                if (!childIsAssembly) {
                    hasNonAssemblyChildren = true;

                    // Rule 1: WIP non-assembly under Released assembly
                    if (!childIsReleased) {
                        const childPath = currentPath ? `${currentPath} > ${node.partNumber}` : node.partNumber;
                        errors.push({
                            message: `${childPath} > ${child.partNumber}: WIP non-assembly item under released assembly — Release ${child.partNumber} in PDM before creating IFP artifact`,
                            path: childPath,
                            rule: 'wip-non-assembly'
                        });
                    }
                }

                // Track if any child is Released (for Rule 2)
                if (childIsReleased) {
                    hasReleasedChild = true;
                }
            }

            // Rule 2: Released assembly with only WIP sub-assemblies (no non-assembly items)
            // Only applies if parent has NO non-assembly children (only sub-assemblies)
            if (!hasNonAssemblyChildren && !hasReleasedChild && node.children.length > 0) {
                const nodePath = currentPath ? `${currentPath} > ${node.partNumber}` : node.partNumber;
                errors.push({
                    message: `${nodePath}: Released assembly has no released content — all sub-assemblies are WIP`,
                    path: nodePath,
                    rule: 'no-released-content'
                });
            }

            // Recurse into Released assembly children to continue validation
            for (const child of node.children) {
                if (child.nsItemType && isAssembly(child) && isReleased(child.state)) {
                    walkAndValidate(child, [...ancestors, node]);
                }
            }
        } else if (isAssembly(node)) {
            // WIP assembly: still recurse to find missing NS Item Types and validate Released children
            // (WIP assemblies are graft points for merge, but we still validate Released children)
            for (const child of node.children) {
                walkAndValidate(child, [...ancestors, node]);
            }
        }
    }

    // Start walk from root
    walkAndValidate(rootNode);

    return {
        valid: errors.length === 0,
        errors: errors
    };
}
