// merge.js - IFP BOM Merge Engine

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
        if (node.componentType === 'Assembly') {
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
        nsItemType: sourceNode.nsItemType,
        revision: sourceNode.revision,
        level: sourceNode.level,
        children: []
    };
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
 * @returns {{mergedTree: Object, warnings: string[]}} - Merged tree and warnings
 */
export function mergeBOM(sourceRoot, priorRoot) {
    // Build PN index from B(n-1) for O(1) graft lookups
    const priorIndex = priorRoot ? buildPNIndex(priorRoot) : new Map();
    const warnings = [];

    /**
     * Recursive walk-and-merge function.
     *
     * @param {BOMNode} sourceNode - Current node from X(n)
     * @returns {Object} - Merged node (may be from X(n) or grafted from B(n-1))
     */
    function walkAndMerge(sourceNode) {
        // Check if this is a WIP assembly
        if (sourceNode.componentType === 'Assembly' && !isReleased(sourceNode.state)) {
            // GRAFT LOGIC: Find this assembly in B(n-1)
            const priorNode = priorIndex.get(sourceNode.partNumber);

            if (priorNode) {
                // GRAFT: Clone entire subtree from B(n-1)
                const grafted = deepClone(priorNode);

                // Tag entire grafted subtree
                tagSource(grafted, 'grafted');

                return grafted;
            } else {
                // PLACEHOLDER: WIP assembly with no prior release
                const placeholder = createPlaceholder(sourceNode);
                placeholder._source = 'grafted'; // Per locked decision

                warnings.push(
                    `${sourceNode.partNumber} [${sourceNode.state}] has no prior released BOM — included as empty placeholder`
                );

                return placeholder;
            }
        }

        // RELEASED ASSEMBLY or PART: Include from current (X(n))
        const result = shallowCopy(sourceNode);
        result._source = 'current';

        // Recurse to children
        result.children = sourceNode.children.map(child => {
            if (child.componentType === 'Assembly') {
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

    return { mergedTree, warnings };
}
