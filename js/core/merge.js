// merge.js - IFP BOM Merge Engine

import { isAssembly } from './validate.js';

/**
 * Determines if an assembly state qualifies as "Released" (approved for production).
 * Uses a whitelist approach: only IFP and IFU are approved states.
 * Everything else is considered WIP (Work In Progress).
 *
 * @param {string} state - The state value from BOM data
 * @returns {boolean} - true if Released, false if WIP
 */
export function isReleased(state) {
    return state === 'Issued for Purchasing' || state === 'Issued for Use';
}

/**
 * Builds a part number index of all Assembly nodes in a BOM tree.
 * Used to enable O(1) lookup of prior assemblies during grafting.
 * Only indexes the first occurrence of each PN (B(n-1) is treated as flat truth).
 *
 * @param {BOMNode} rootNode - Root of the BOM tree to index
 * @returns {Map<string, BOMNode>} - Map of partNumber -> node
 */
export function buildPNIndex(rootNode) {
    const index = new Map();

    function walk(node) {
        // Only index Assembly nodes
        if (isAssembly(node)) {
            // Store first occurrence only (B(n-1) is flat truth)
            if (!index.has(node.partNumber)) {
                index.set(node.partNumber, node);
            }
        }

        // Recurse to children
        node.children.forEach(child => walk(child));
    }

    walk(rootNode);
    return index;
}

/**
 * Deep clone a node and its entire subtree.
 * Creates new objects so original tree is not mutated.
 *
 * @param {BOMNode} node - Node to clone
 * @returns {BOMNode} - Cloned node with cloned children
 */
function deepClone(node) {
    // Shallow copy all properties
    const cloned = { ...node };

    // Deep clone children array
    cloned.children = node.children.map(child => deepClone(child));

    return cloned;
}

/**
 * Shallow copy a node (copy properties but not children).
 * Used when building merged tree with new children array.
 *
 * @param {BOMNode} node - Node to copy
 * @returns {Object} - New object with copied properties, empty children array
 */
function shallowCopy(node) {
    const copy = { ...node };
    copy.children = []; // Will be populated by caller
    return copy;
}

/**
 * Create an empty placeholder for a WIP assembly with no prior release.
 * Preserves assembly identity from X(n) but has no children.
 *
 * @param {BOMNode} sourceNode - The WIP assembly node from X(n)
 * @returns {Object} - Placeholder node
 */
function createPlaceholder(sourceNode) {
    return {
        partNumber: sourceNode.partNumber,
        componentType: 'Assembly',
        description: sourceNode.description,
        material: sourceNode.material,
        qty: sourceNode.qty,
        length: sourceNode.length,
        uofm: sourceNode.uofm,
        state: sourceNode.state,
        purchaseDescription: sourceNode.purchaseDescription,
        nsItemType: sourceNode.nsItemType, // Preserve NS Item Type
        revision: sourceNode.revision,
        level: sourceNode.level,
        children: []
    };
}

/**
 * Compare fields between source node (X(n)) and prior node (B(n-1)).
 * Returns array of changes for fields that differ.
 *
 * Note: State is NOT compared because it's inherently different (WIP vs Released)
 * and is the reason we're grafting in the first place.
 *
 * @param {BOMNode} sourceNode - Node from X(n)
 * @param {BOMNode} priorNode - Node from B(n-1)
 * @returns {Array} - Array of change objects: {field, from, to}
 */
function computeChanges(sourceNode, priorNode) {
    const changes = [];
    const fieldsToCompare = [
        'qty', 'description', 'revision', 'material',
        'length', 'uofm', 'purchaseDescription'
    ];

    for (const field of fieldsToCompare) {
        const sourceValue = sourceNode[field];
        const priorValue = priorNode[field];

        // Compare values (handle undefined/null/empty string)
        if (sourceValue !== priorValue) {
            changes.push({
                field: field,
                from: priorValue,
                to: sourceValue
            });
        }
    }

    return changes;
}

/**
 * Collect all assembly part numbers in a tree.
 * Used to detect missing assemblies.
 *
 * @param {BOMNode} rootNode - Root of tree to walk
 * @returns {Set<string>} - Set of assembly part numbers
 */
function collectAllAssemblyPNs(rootNode) {
    const assemblyPNs = new Set();

    function walk(node) {
        if (isAssembly(node)) {
            assemblyPNs.add(node.partNumber);
        }
        node.children.forEach(child => walk(child));
    }

    walk(rootNode);
    return assemblyPNs;
}

/**
 * Recursively tag a node and all descendants with a source tag.
 * Used to mark grafted subtrees.
 *
 * @param {Object} node - Node to tag
 * @param {string} source - 'current' or 'grafted'
 */
function tagSource(node, source) {
    node._source = source;
    node.children.forEach(child => tagSource(child, source));
}

/**
 * Core IFP BOM Merge Algorithm.
 *
 * Walks the source tree (X(n)) top-down. For each assembly:
 * - If Released (IFP or IFU): include from X(n), recurse to children
 * - If WIP: stop recursion, graft entire subtree from B(n-1) if available
 *   - If not in B(n-1): create empty placeholder with warning
 *
 * Every node in the result is tagged with _source ('current' or 'grafted').
 *
 * @param {BOMNode} sourceRoot - Root of X(n) (current/new BOM)
 * @param {BOMNode|null} priorRoot - Root of B(n-1) (prior IFP artifact), or null for REV0
 * @returns {{mergedTree: Object, warnings: string[], summary: Object}} - Merged tree, warnings, and summary
 */
export function mergeBOM(sourceRoot, priorRoot) {
    // Build PN index from B(n-1) for O(1) graft lookups
    const priorIndex = priorRoot ? buildPNIndex(priorRoot) : new Map();
    const warnings = [];

    // Track summary statistics
    let passedThroughCount = 0;
    let graftedCount = 0;
    let placeholderCount = 0;

    /**
     * Recursive walk-and-merge function.
     *
     * @param {BOMNode} sourceNode - Current node from X(n)
     * @returns {Object} - Merged node (may be from X(n) or grafted from B(n-1))
     */
    function walkAndMerge(sourceNode) {
        // Check if this is a WIP assembly
        if (isAssembly(sourceNode) && !isReleased(sourceNode.state)) {
            // GRAFT LOGIC: Find this assembly in B(n-1)
            const priorNode = priorIndex.get(sourceNode.partNumber);

            if (priorNode) {
                // GRAFT: Clone entire subtree from B(n-1)
                const grafted = deepClone(priorNode);

                // Compute change annotations BEFORE updating qty
                // (compare X(n) vs B(n-1) to show what changed)
                const changes = computeChanges(sourceNode, priorNode);
                if (changes.length > 0) {
                    grafted._changes = changes;
                }

                // MERGE-07: Qty at graft point comes from X(n) (parent's declaration)
                // All other fields (description, revision, children) stay from B(n-1)
                grafted.qty = sourceNode.qty;

                // Tag entire grafted subtree
                tagSource(grafted, 'grafted');

                graftedCount++;

                return grafted;
            } else {
                // PLACEHOLDER: WIP assembly with no prior release
                const placeholder = createPlaceholder(sourceNode);
                placeholder._source = 'grafted'; // Per locked decision

                warnings.push(
                    `${sourceNode.partNumber} [${sourceNode.state}] has no prior released BOM — included as empty placeholder`
                );

                placeholderCount++;

                return placeholder;
            }
        }

        // RELEASED ASSEMBLY or PART: Include from current (X(n))
        const result = shallowCopy(sourceNode);
        result._source = 'current';

        // Count Released assemblies
        if (isAssembly(sourceNode)) {
            passedThroughCount++;
        }

        // Recurse to children
        result.children = sourceNode.children.map(child => {
            if (isAssembly(child)) {
                // Recurse for assemblies (may trigger graft)
                return walkAndMerge(child);
            } else {
                // Parts pass through directly
                const childCopy = shallowCopy(child);
                childCopy._source = 'current';
                return childCopy;
            }
        });

        return result;
    }

    // Start merge from root
    const mergedTree = walkAndMerge(sourceRoot);

    // Detect missing assemblies (in B(n-1) but absent from X(n))
    if (priorRoot) {
        const priorAssemblies = collectAllAssemblyPNs(priorRoot);
        const sourceAssemblies = collectAllAssemblyPNs(sourceRoot);

        for (const priorPN of priorAssemblies) {
            if (!sourceAssemblies.has(priorPN)) {
                warnings.push(
                    `Assembly ${priorPN} exists in B(n-1) but is absent from X(n) — may be deleted or suppressed`
                );
            }
        }
    }

    // Build summary
    const summary = {
        passedThrough: passedThroughCount,
        grafted: graftedCount,
        placeholders: placeholderCount
    };

    return { mergedTree, warnings, summary };
}
