// tree.js - BOMNode class and tree construction

import { parseLength, getParentLevel } from './utils.js';

// Module-level root info storage
let _rootPartNumber = null;
let _rootRevision = null;
let _rootDescription = null;

// Root info getter functions
export function getRootPartNumber() { return _rootPartNumber; }
export function getRootRevision() { return _rootRevision; }
export function getRootDescription() { return _rootDescription; }

// Root info reset function
export function resetRootInfo() {
    _rootPartNumber = null;
    _rootRevision = null;
    _rootDescription = null;
}

// Tree Node Class
export class BOMNode {
    constructor(rowData) {
        this.level = rowData.Level;
        this.partNumber = rowData['Part Number'].trim();
        this.componentType = rowData['Component Type'];
        this.description = rowData.Description;
        this.material = rowData.Material;
        this.qty = parseInt(rowData.Qty) || 0;
        this.rawLength = rowData.Length || '';
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
export function buildTree(rows) {
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
    _rootPartNumber = root.partNumber;
    _rootRevision = root.revision;
    _rootDescription = root.description;

    return root;
}

// Sort tree children recursively (for display purposes)
export function sortChildren(node) {
    if (node.children.length > 0) {
        // Sort by: Component Type > Description > Length (decimal)
        node.children.sort((a, b) => {
            if (a.componentType !== b.componentType) {
                return a.componentType.localeCompare(b.componentType);
            }
            if (a.description !== b.description) {
                return a.description.localeCompare(b.description, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            }
            if (a.length === null && b.length === null) return 0;
            if (a.length === null) return 1;
            if (b.length === null) return -1;
            return a.length - b.length;
        });
        node.children.forEach(child => sortChildren(child));
    }
}
