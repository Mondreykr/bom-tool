// state.js - Centralized application state
// All global state variables consolidated from index.html

export const state = {
    // ========================================
    // FLAT BOM TAB STATE
    // ========================================
    csvData: null,
    flattenedBOM: null,
    treeRoot: null,
    uploadedFilename: null,

    // ========================================
    // COMPARISON TAB STATE
    // ========================================
    oldBomData: null,
    oldBomFlattened: null,
    oldBomInfo: { partNumber: '', revision: '', description: '' },
    oldBomFilename: null,
    oldBomTree: null,
    oldSelectedNode: null,

    newBomData: null,
    newBomFlattened: null,
    newBomInfo: { partNumber: '', revision: '', description: '' },
    newBomFilename: null,
    newBomTree: null,
    newSelectedNode: null,

    comparisonResults: [],
    currentFilter: 'all',

    // ========================================
    // HIERARCHY TAB STATE
    // ========================================
    hierarchyData: null,
    hierarchyTree: null,
    hierarchyFilename: null,
    hierarchyRootInfo: { partNumber: '', revision: '', description: '' }
};
