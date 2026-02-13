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
    hierarchyRootInfo: { partNumber: '', revision: '', description: '' },

    // ========================================
    // IFP MERGE TAB STATE
    // ========================================
    ifpSourceData: null,         // Parsed XML rows from X(n)
    ifpSourceTree: null,         // Built BOM tree from X(n)
    ifpSourceFilename: null,     // X(n) filename
    ifpPriorArtifact: null,      // Imported B(n-1) artifact object
    ifpPriorFilename: null,      // B(n-1) filename
    ifpMergedTree: null,         // Result of mergeBOM
    ifpMergeSummary: null,       // {passedThrough, grafted, placeholders}
    ifpMergeWarnings: [],        // Warnings from merge
    ifpValidationResult: null,   // {valid, errors} from validateBOM
    ifpIsRev0: false             // REV0 mode toggle state
};
