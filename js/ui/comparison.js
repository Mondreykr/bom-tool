import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree } from '../core/tree.js';
import { flattenBOM } from '../core/flatten.js';
import { compareBOMs, extractSubtree } from '../core/compare.js';
import { createDiff } from '../core/utils.js';

export function init() {
    // ========================================
    // BOM COMPARISON - STATE & DOM ELEMENTS
    // ========================================

    // Comparison tab state: state.oldBomData, state.oldBomFlattened, state.oldBomInfo, state.oldBomFilename,
    //   state.oldBomTree, state.oldSelectedNode, state.newBomData, state.newBomFlattened, state.newBomInfo,
    //   state.newBomFilename, state.newBomTree, state.newSelectedNode, state.comparisonResults, state.currentFilter

    const oldBomZone = document.getElementById('oldBomZone');
    const oldBomInput = document.getElementById('oldBomFile');
    const oldBomFileInfo = document.getElementById('oldBomInfo');
    const oldBomFileName = document.getElementById('oldBomName');
    const oldBomFileMeta = document.getElementById('oldBomMeta');

    const newBomZone = document.getElementById('newBomZone');
    const newBomInput = document.getElementById('newBomFile');
    const newBomFileInfo = document.getElementById('newBomInfo');
    const newBomFileName = document.getElementById('newBomName');
    const newBomFileMeta = document.getElementById('newBomMeta');

    const compareBtn = document.getElementById('compareBtn');
    const resetCompareBtn = document.getElementById('resetCompareBtn');
    const resetScopeBtn = document.getElementById('resetScopeBtn');
    const compareMessage = document.getElementById('compareMessage');
    const compareResults = document.getElementById('compareResults');
    const compareBody = document.getElementById('compareBody');
    const exportCompareExcelBtn = document.getElementById('exportCompareExcelBtn');
    const exportCompareHtmlBtn = document.getElementById('exportCompareHtmlBtn');

    // Tree selection panel elements
    const oldBomTreePanel = document.getElementById('oldBomTreePanel');
    const oldBomPanelName = document.getElementById('oldBomPanelName');
    const oldBomTreeContainer = document.getElementById('oldBomTreeContainer');
    const oldBomSelectedDisplay = document.getElementById('oldBomSelectedDisplay');
    const oldBomChangeFile = document.getElementById('oldBomChangeFile');
    const oldBomScopeDisplay = document.getElementById('oldBomScopeDisplay');

    const newBomTreePanel = document.getElementById('newBomTreePanel');
    const newBomPanelName = document.getElementById('newBomPanelName');
    const newBomTreeContainer = document.getElementById('newBomTreeContainer');
    const newBomSelectedDisplay = document.getElementById('newBomSelectedDisplay');
    const newBomChangeFile = document.getElementById('newBomChangeFile');
    const newBomScopeDisplay = document.getElementById('newBomScopeDisplay');

    // ========================================
    // SCOPED COMPARISON - TREE SELECTION FUNCTIONS
    // ========================================

    // Render selection tree for a BOM
    function renderSelectionTree(tree, type) {
        const container = type === 'old' ? oldBomTreeContainer : newBomTreeContainer;
        container.innerHTML = '';
        renderSelectionNode(tree, container, type, 0);
    }

    // Recursive function to render a tree node for selection
    function renderSelectionNode(node, container, type, depth = 0) {
        const row = document.createElement('div');
        row.className = 'tree-select-row';
        row.dataset.level = node.level;
        row.dataset.depth = depth;

        const hasChildren = node.children.length > 0;
        const isAssembly = node.componentType === 'Assembly';
        const indent = depth * 20;

        // Make all items selectable for scoped comparison
        row.classList.add('selectable');
        row.addEventListener('click', (e) => {
            if (e.target.classList.contains('tree-select-toggle')) return;
            handleNodeSelection(node, type);
        });

        // Indent
        row.style.paddingLeft = `${1 + indent / 16}rem`;

        // Toggle or spacer
        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.className = 'tree-select-toggle';
            toggle.textContent = '+';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSelectionChildren(row, type);
            });
            row.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'tree-select-spacer';
            row.appendChild(spacer);
        }

        // Part Number
        const partSpan = document.createElement('span');
        partSpan.className = 'tree-select-part';
        partSpan.textContent = node.partNumber;
        row.appendChild(partSpan);

        // Component Type badge
        const typeSpan = document.createElement('span');
        typeSpan.className = 'tree-select-type';
        if (isAssembly) typeSpan.classList.add('assembly');
        typeSpan.textContent = node.componentType;
        row.appendChild(typeSpan);

        // Description (truncated)
        const descSpan = document.createElement('span');
        descSpan.className = 'tree-select-desc';
        descSpan.textContent = node.description || '';
        descSpan.title = node.description || '';  // Full text on hover
        row.appendChild(descSpan);

        container.appendChild(row);

        // Render children (collapsed by default)
        if (hasChildren) {
            node.children.forEach((child) => {
                const childRow = renderSelectionNode(child, container, type, depth + 1);
                childRow.classList.add('child-row', 'collapsed');
                childRow.dataset.parentLevel = node.level;
            });
        }

        return row;
    }

    // Toggle children visibility in selection tree
    function toggleSelectionChildren(parentRow, type) {
        const toggle = parentRow.querySelector('.tree-select-toggle');
        const parentLevel = parentRow.dataset.level;
        const parentDepth = parseInt(parentRow.dataset.depth);
        const container = type === 'old' ? oldBomTreeContainer : newBomTreeContainer;

        const allRows = container.querySelectorAll('.tree-select-row');
        let foundParent = false;

        allRows.forEach(row => {
            if (row === parentRow) {
                foundParent = true;
                return;
            }
            if (!foundParent) return;

            const rowDepth = parseInt(row.dataset.depth);
            if (rowDepth <= parentDepth) return;

            // Only toggle direct children
            if (row.dataset.parentLevel === parentLevel) {
                const isCollapsed = toggle.textContent === '+';
                if (isCollapsed) {
                    row.classList.remove('collapsed');
                } else {
                    row.classList.add('collapsed');
                    // Collapse grandchildren too
                    const childToggle = row.querySelector('.tree-select-toggle');
                    if (childToggle && childToggle.textContent === '-') {
                        toggleSelectionChildren(row, type);
                    }
                }
            }
        });

        toggle.textContent = toggle.textContent === '+' ? '-' : '+';
    }

    // Handle node selection click
    function handleNodeSelection(node, type) {
        const container = type === 'old' ? oldBomTreeContainer : newBomTreeContainer;
        const currentNode = type === 'old' ? state.oldSelectedNode : state.newSelectedNode;

        // Toggle selection
        if (currentNode === node) {
            // Deselect
            if (type === 'old') {
                state.oldSelectedNode = null;
            } else {
                state.newSelectedNode = null;
            }
        } else {
            // Select
            if (type === 'old') {
                state.oldSelectedNode = node;
            } else {
                state.newSelectedNode = node;
            }
        }

        // Update visual selection
        const selectedNode = type === 'old' ? state.oldSelectedNode : state.newSelectedNode;
        container.querySelectorAll('.tree-select-row').forEach(row => {
            if (selectedNode && row.dataset.level === selectedNode.level) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });

        // Update status display
        updateSelectionDisplay(type);
    }

    // Update the selection status display
    function updateSelectionDisplay(type) {
        const displayEl = type === 'old' ? oldBomSelectedDisplay : newBomSelectedDisplay;
        const selectedNode = type === 'old' ? state.oldSelectedNode : state.newSelectedNode;
        const tree = type === 'old' ? state.oldBomTree : state.newBomTree;

        if (selectedNode && selectedNode !== tree) {
            displayEl.textContent = selectedNode.partNumber;
        } else {
            displayEl.textContent = 'Full Assembly';
        }
    }

    // ========================================
    // BOM COMPARISON - FILE UPLOAD HANDLERS
    // ========================================

    // Old BOM upload
    oldBomZone.addEventListener('click', () => oldBomInput.click());

    oldBomZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        oldBomZone.classList.add('dragover');
    });

    oldBomZone.addEventListener('dragleave', () => {
        oldBomZone.classList.remove('dragover');
    });

    oldBomZone.addEventListener('drop', (e) => {
        e.preventDefault();
        oldBomZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        const fileName = file ? file.name.toLowerCase() : '';
        if (file && (fileName.endsWith('.csv') || fileName.endsWith('.xml'))) {
            handleCompareFile('old', file);
        } else {
            showCompareMessage('Please upload a CSV or XML file', 'error');
        }
    });

    oldBomInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleCompareFile('old', file);
        }
    });

    // New BOM upload
    newBomZone.addEventListener('click', () => newBomInput.click());

    newBomZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        newBomZone.classList.add('dragover');
    });

    newBomZone.addEventListener('dragleave', () => {
        newBomZone.classList.remove('dragover');
    });

    newBomZone.addEventListener('drop', (e) => {
        e.preventDefault();
        newBomZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        const fileName = file ? file.name.toLowerCase() : '';
        if (file && (fileName.endsWith('.csv') || fileName.endsWith('.xml'))) {
            handleCompareFile('new', file);
        } else {
            showCompareMessage('Please upload a CSV or XML file', 'error');
        }
    });

    newBomInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleCompareFile('new', file);
        }
    });

    function handleCompareFile(type, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileName = file.name.toLowerCase();
                const isXML = fileName.endsWith('.xml');

                console.log(`Loading ${type} BOM: ${file.name} (${isXML ? 'XML' : 'CSV'})`);

                if (isXML) {
                    const decoder = new TextDecoder('utf-8');
                    const xmlText = decoder.decode(e.target.result);
                    const parsed = parseXML(xmlText);

                    if (type === 'old') {
                        state.oldBomData = parsed;
                        state.oldBomFilename = file.name;  // Store filename
                    } else {
                        state.newBomData = parsed;
                        state.newBomFilename = file.name;  // Store filename
                    }
                } else {
                    const decoder = new TextDecoder('utf-16le');
                    let csvText = decoder.decode(e.target.result);

                    if (csvText.charCodeAt(0) === 0xFEFF) {
                        csvText = csvText.substring(1);
                    }

                    const workbook = XLSX.read(csvText, {
                        type: 'string',
                        raw: true,
                        cellText: true,
                        cellDates: false
                    });

                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const parsed = XLSX.utils.sheet_to_json(worksheet, {
                        raw: true,
                        defval: ''
                    });

                    if (type === 'old') {
                        state.oldBomData = parsed;
                        state.oldBomFilename = file.name;  // Store filename
                    } else {
                        state.newBomData = parsed;
                        state.newBomFilename = file.name;  // Store filename
                    }
                }

                console.log(`${type} BOM loaded: ${type === 'old' ? state.oldBomData.length : state.newBomData.length} rows`);

                // Build tree immediately for scoped comparison UI
                const rawData = type === 'old' ? state.oldBomData : state.newBomData;
                let tree;
                try {
                    tree = buildTree(rawData);
                } catch (treeError) {
                    showCompareMessage(`Error building tree for ${type} BOM: ${treeError.message}`, 'error');
                    console.error(`Tree build error for ${type} BOM:`, treeError);
                    return;
                }

                // Store tree globally and reset selection
                if (type === 'old') {
                    state.oldBomTree = tree;
                    state.oldSelectedNode = null;
                } else {
                    state.newBomTree = tree;
                    state.newSelectedNode = null;
                }

                // Update UI: Hide drop zone, show tree selection panel
                if (type === 'old') {
                    oldBomZone.style.display = 'none';
                    oldBomTreePanel.style.display = 'block';
                    oldBomPanelName.textContent = file.name;
                    renderSelectionTree(state.oldBomTree, 'old');
                    updateSelectionDisplay('old');
                    // Keep file info for reference
                    oldBomFileName.textContent = file.name;
                    oldBomFileMeta.textContent = `${state.oldBomData.length} rows • ${(file.size / 1024).toFixed(1)} KB`;
                } else {
                    newBomZone.style.display = 'none';
                    newBomTreePanel.style.display = 'block';
                    newBomPanelName.textContent = file.name;
                    renderSelectionTree(state.newBomTree, 'new');
                    updateSelectionDisplay('new');
                    // Keep file info for reference
                    newBomFileName.textContent = file.name;
                    newBomFileMeta.textContent = `${state.newBomData.length} rows • ${(file.size / 1024).toFixed(1)} KB`;
                }

                // Enable compare button if both files loaded
                if (state.oldBomData && state.newBomData) {
                    compareBtn.disabled = false;
                    showCompareMessage('Both BOMs loaded. Select scope and compare.', 'success');
                }
            } catch (error) {
                showCompareMessage(`Error loading ${type} BOM: ${error.message}`, 'error');
                console.error(`Error loading ${type} BOM:`, error);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function showCompareMessage(text, type) {
        compareMessage.textContent = text;
        compareMessage.className = `message ${type} show`;
        setTimeout(() => {
            compareMessage.classList.remove('show');
        }, 5000);
    }

    // ========================================
    // BOM COMPARISON - FLATTEN AND COMPARE
    // ========================================

    compareBtn.addEventListener('click', () => {
        try {
            console.log('Starting BOM comparison...');

            // Determine scope for each BOM (selected node or full tree)
            const oldScope = state.oldSelectedNode || state.oldBomTree;
            const newScope = state.newSelectedNode || state.newBomTree;

            console.log(`Old scope: ${oldScope.partNumber} (Level: ${oldScope.level})`);
            console.log(`New scope: ${newScope.partNumber} (Level: ${newScope.level})`);

            // Extract subtrees (clones with Qty 1 at root)
            const oldSubtree = extractSubtree(oldScope);
            const newSubtree = extractSubtree(newScope);

            // Flatten scoped subtrees
            console.log('Flattening old BOM scope...');
            state.oldBomFlattened = flattenBOM(oldSubtree, 1);

            // Store info for display (full GA info + scope info)
            state.oldBomInfo.partNumber = state.oldBomTree.partNumber;
            state.oldBomInfo.revision = state.oldBomTree.revision;
            state.oldBomInfo.description = state.oldBomTree.description;
            state.oldBomInfo.scopedPartNumber = oldScope.partNumber;
            state.oldBomInfo.isScoped = state.oldSelectedNode !== null;

            console.log('Flattening new BOM scope...');
            state.newBomFlattened = flattenBOM(newSubtree, 1);

            state.newBomInfo.partNumber = state.newBomTree.partNumber;
            state.newBomInfo.revision = state.newBomTree.revision;
            state.newBomInfo.description = state.newBomTree.description;
            state.newBomInfo.scopedPartNumber = newScope.partNumber;
            state.newBomInfo.isScoped = state.newSelectedNode !== null;

            console.log(`Old BOM flattened: ${state.oldBomFlattened.length} items`);
            console.log(`New BOM flattened: ${state.newBomFlattened.length} items`);

            // Compare
            console.log('Comparing BOMs...');
            state.comparisonResults = compareBOMs(state.oldBomFlattened, state.newBomFlattened);

            // Display results
            displayComparisonResults();

            // Show reset comparison button
            resetScopeBtn.style.display = '';

        } catch (error) {
            showCompareMessage(`Comparison error: ${error.message}`, 'error');
            console.error('Comparison error:', error);
        }
    });

    function displayComparisonResults() {
        // Update assembly info - filename is primary, PN/description is secondary
        document.getElementById('oldBomFilenameDisplay').textContent = state.oldBomFilename || 'N/A';
        document.getElementById('oldBomAssembly').textContent = `${state.oldBomInfo.partNumber} - ${state.oldBomInfo.description}`;
        document.getElementById('oldBomRev').textContent = state.oldBomInfo.revision || '-';
        document.getElementById('newBomFilenameDisplay').textContent = state.newBomFilename || 'N/A';
        document.getElementById('newBomAssembly').textContent = `${state.newBomInfo.partNumber} - ${state.newBomInfo.description}`;
        document.getElementById('newBomRev').textContent = state.newBomInfo.revision || '-';

        // Show scope info
        if (state.oldBomInfo.isScoped) {
            oldBomScopeDisplay.textContent = `Scope: ${state.oldBomInfo.scopedPartNumber}`;
        } else {
            oldBomScopeDisplay.textContent = 'Scope: Full Assembly';
        }
        if (state.newBomInfo.isScoped) {
            newBomScopeDisplay.textContent = `Scope: ${state.newBomInfo.scopedPartNumber}`;
        } else {
            newBomScopeDisplay.textContent = 'Scope: Full Assembly';
        }

        // Update stats
        const added = state.comparisonResults.filter(r => r.changeType === 'Added').length;
        const removed = state.comparisonResults.filter(r => r.changeType === 'Removed').length;
        const changed = state.comparisonResults.filter(r => r.changeType === 'Changed').length;

        document.getElementById('addedCount').textContent = added;
        document.getElementById('removedCount').textContent = removed;
        document.getElementById('changedCount').textContent = changed;

        // Show results section
        compareResults.classList.add('show');

        // Render table
        renderComparisonTable();

        // Show export buttons
        exportCompareExcelBtn.style.display = '';
        exportCompareHtmlBtn.style.display = '';

        // Scroll to results
        compareResults.scrollIntoView({ behavior: 'smooth' });
    }

    function sortComparisonResults(results) {
        return results.sort((a, b) => {
            // Sort by: Component Type → Description → Length
            if (a.componentType !== b.componentType) {
                return a.componentType.localeCompare(b.componentType);
            }

            const descA = a.newDescription || a.oldDescription || '';
            const descB = b.newDescription || b.oldDescription || '';
            if (descA !== descB) {
                return descA.localeCompare(descB, undefined, { numeric: true, sensitivity: 'base' });
            }

            const lengthA = a.lengthDecimal === null ? -Infinity : a.lengthDecimal;
            const lengthB = b.lengthDecimal === null ? -Infinity : b.lengthDecimal;
            return lengthA - lengthB;
        });
    }

    function renderComparisonTable() {
        compareBody.innerHTML = '';

        // Filter results
        const filtered = state.currentFilter === 'all'
            ? state.comparisonResults
            : state.comparisonResults.filter(r => r.changeType === state.currentFilter);

        // Sort results
        const sorted = sortComparisonResults(filtered);

        // Render rows
        sorted.forEach(result => {
            const row = document.createElement('tr');

            const badge = `<span class="badge ${result.changeType.toLowerCase()}">${result.changeType}</span>`;
            const partNumber = result.partNumber || '-';
            const componentType = result.componentType || '-';

            // Handle descriptions with diff highlighting
            let oldDesc = '-';
            let newDesc = '-';
            if (result.changeType === 'Changed' && result.attributesChanged.includes('Description')) {
                const diff = createDiff(result.oldDescription, result.newDescription);
                oldDesc = diff.old;
                newDesc = diff.new;
            } else {
                oldDesc = result.oldDescription || '-';
                newDesc = result.newDescription || '-';
            }

            const lengthDec = result.lengthDecimal !== null ? result.lengthDecimal : '-';
            const lengthFrac = result.lengthFractional || '-';
            const oldQty = result.oldQty !== null ? result.oldQty : '-';
            const newQty = result.newQty !== null ? result.newQty : '-';

            // Delta Qty: show '-' if no change (deltaQty === 0)
            let deltaQtyHtml = '-';
            if (result.deltaQty !== null && result.deltaQty !== 0) {
                const deltaValue = result.deltaQty >= 0 ? `+${result.deltaQty}` : result.deltaQty;
                const deltaClass = result.deltaQty > 0 ? 'delta-positive' : 'delta-negative';
                deltaQtyHtml = `<span class="${deltaClass}">${deltaValue}</span>`;
            }

            // Handle purchase descriptions with diff highlighting
            let oldPurDesc = '-';
            let newPurDesc = '-';
            if (result.changeType === 'Changed' && result.attributesChanged.includes('Purchase Desc')) {
                const diff = createDiff(
                    result.oldPurchaseDescription ? result.oldPurchaseDescription.replace(/\n/g, ' ') : '',
                    result.newPurchaseDescription ? result.newPurchaseDescription.replace(/\n/g, ' ') : ''
                );
                oldPurDesc = diff.old.replace(/\n/g, '<br>');
                newPurDesc = diff.new.replace(/\n/g, '<br>');
            } else {
                oldPurDesc = result.oldPurchaseDescription ? result.oldPurchaseDescription.replace(/\n/g, '<br>') : '-';
                newPurDesc = result.newPurchaseDescription ? result.newPurchaseDescription.replace(/\n/g, '<br>') : '-';
            }

            const changes = result.attributesChanged.length > 0 ? result.attributesChanged.join(', ') : '-';

            row.innerHTML = `
                <td>${badge}</td>
                <td>${partNumber}</td>
                <td>${componentType}</td>
                <td class="description">${oldDesc}</td>
                <td class="description">${newDesc}</td>
                <td class="numeric">${lengthDec}</td>
                <td>${lengthFrac}</td>
                <td class="numeric">${oldQty}</td>
                <td class="numeric">${newQty}</td>
                <td class="numeric">${deltaQtyHtml}</td>
                <td class="purchase-desc">${oldPurDesc}</td>
                <td class="purchase-desc">${newPurDesc}</td>
                <td>${changes}</td>
            `;

            compareBody.appendChild(row);
        });
    }

    // ========================================
    // BOM COMPARISON - FILTERING
    // ========================================

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentFilter = btn.dataset.filter;

            // Update button states
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Re-render table
            renderComparisonTable();
        });
    });

    // ========================================
    // BOM COMPARISON - EXPORTS
    // ========================================

    exportCompareExcelBtn.addEventListener('click', () => {
        const today = new Date();
        const dateStr = today.getFullYear() +
                      String(today.getMonth() + 1).padStart(2, '0') +
                      String(today.getDate()).padStart(2, '0');

        // Use uploaded filenames (strip extension) or fall back to part numbers
        const oldBase = state.oldBomFilename
            ? state.oldBomFilename.replace(/\.(csv|xml)$/i, '')
            : `${state.oldBomInfo.partNumber}-Rev${state.oldBomInfo.revision}`;
        const newBase = state.newBomFilename
            ? state.newBomFilename.replace(/\.(csv|xml)$/i, '')
            : `${state.newBomInfo.partNumber}-Rev${state.newBomInfo.revision}`;
        const filename = `${oldBase}-vs-${newBase}-Comparison-${dateStr}.xlsx`;

        // Build scope info for header
        const oldScopeText = state.oldBomInfo.isScoped ? `Scope: ${state.oldBomInfo.scopedPartNumber}` : 'Full Assembly';
        const newScopeText = state.newBomInfo.isScoped ? `Scope: ${state.newBomInfo.scopedPartNumber}` : 'Full Assembly';

        const ws_data = [
            ['Old BOM:', state.oldBomFilename || 'N/A', `${state.oldBomInfo.partNumber} - ${state.oldBomInfo.description}`, `Rev ${state.oldBomInfo.revision}`, oldScopeText],
            ['New BOM:', state.newBomFilename || 'N/A', `${state.newBomInfo.partNumber} - ${state.newBomInfo.description}`, `Rev ${state.newBomInfo.revision}`, newScopeText],
            [],
            ['Change Type', 'Part Number', 'Component Type', 'Old Description', 'New Description', 'Length (Decimal)', 'Length (Fractional)', 'Old Qty', 'New Qty', 'Δ Qty', 'Old Purchase Description', 'New Purchase Description', 'Attributes Changed']
        ];

        const sorted = sortComparisonResults(state.comparisonResults);

        sorted.forEach(result => {
            const deltaQty = result.deltaQty !== null && result.deltaQty !== 0 ? result.deltaQty : '';

            ws_data.push([
                result.changeType,
                result.partNumber,
                result.componentType,
                result.oldDescription || '',
                result.newDescription || '',
                result.lengthDecimal,
                result.lengthFractional,
                result.oldQty,
                result.newQty,
                deltaQty,
                result.oldPurchaseDescription || '',
                result.newPurchaseDescription || '',
                result.attributesChanged.join(', ')
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Comparison");

        XLSX.writeFile(wb, filename);
    });

    exportCompareHtmlBtn.addEventListener('click', () => {
        const today = new Date();
        const dateStr = today.getFullYear() +
                      String(today.getMonth() + 1).padStart(2, '0') +
                      String(today.getDate()).padStart(2, '0');

        // Format date as YYYY-MM-DD HH:MM:SS
        const generatedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

        // Use uploaded filenames (strip extension) or fall back to part numbers
        const oldBase = state.oldBomFilename
            ? state.oldBomFilename.replace(/\.(csv|xml)$/i, '')
            : `${state.oldBomInfo.partNumber}-Rev${state.oldBomInfo.revision}`;
        const newBase = state.newBomFilename
            ? state.newBomFilename.replace(/\.(csv|xml)$/i, '')
            : `${state.newBomInfo.partNumber}-Rev${state.newBomInfo.revision}`;
        const filename = `${oldBase}-vs-${newBase}-Comparison-${dateStr}.html`;

        const added = state.comparisonResults.filter(r => r.changeType === 'Added').length;
        const removed = state.comparisonResults.filter(r => r.changeType === 'Removed').length;
        const changed = state.comparisonResults.filter(r => r.changeType === 'Changed').length;

        const sorted = sortComparisonResults(state.comparisonResults);

        let tableRows = '';
        sorted.forEach(result => {
            const badge = `<span class="badge ${result.changeType.toLowerCase()}">${result.changeType}</span>`;
            const partNumber = result.partNumber || '-';
            const componentType = result.componentType || '-';

            // Handle descriptions with diff highlighting
            let oldDesc = '-';
            let newDesc = '-';
            if (result.changeType === 'Changed' && result.attributesChanged.includes('Description')) {
                const diff = createDiff(result.oldDescription, result.newDescription);
                oldDesc = diff.old;
                newDesc = diff.new;
            } else {
                oldDesc = result.oldDescription || '-';
                newDesc = result.newDescription || '-';
            }

            const lengthDec = result.lengthDecimal !== null ? result.lengthDecimal : '-';
            const lengthFrac = result.lengthFractional || '-';
            const oldQty = result.oldQty !== null ? result.oldQty : '-';
            const newQty = result.newQty !== null ? result.newQty : '-';

            // Delta Qty: show '-' if no change
            let deltaQtyHtml = '-';
            if (result.deltaQty !== null && result.deltaQty !== 0) {
                const deltaValue = result.deltaQty >= 0 ? `+${result.deltaQty}` : result.deltaQty;
                const deltaClass = result.deltaQty > 0 ? 'delta-positive' : 'delta-negative';
                deltaQtyHtml = `<span class="${deltaClass}">${deltaValue}</span>`;
            }

            // Handle purchase descriptions with diff highlighting
            let oldPurDesc = '-';
            let newPurDesc = '-';
            if (result.changeType === 'Changed' && result.attributesChanged.includes('Purchase Desc')) {
                const diff = createDiff(
                    result.oldPurchaseDescription ? result.oldPurchaseDescription.replace(/\n/g, ' ') : '',
                    result.newPurchaseDescription ? result.newPurchaseDescription.replace(/\n/g, ' ') : ''
                );
                oldPurDesc = diff.old.replace(/\n/g, '<br>');
                newPurDesc = diff.new.replace(/\n/g, '<br>');
            } else {
                oldPurDesc = result.oldPurchaseDescription ? result.oldPurchaseDescription.replace(/\n/g, '<br>') : '-';
                newPurDesc = result.newPurchaseDescription ? result.newPurchaseDescription.replace(/\n/g, '<br>') : '-';
            }

            const changes = result.attributesChanged.length > 0 ? result.attributesChanged.join(', ') : '-';

            tableRows += `<tr><td>${badge}</td><td>${partNumber}</td><td>${componentType}</td><td class="description">${oldDesc}</td><td class="description">${newDesc}</td><td class="numeric">${lengthDec}</td><td>${lengthFrac}</td><td class="numeric">${oldQty}</td><td class="numeric">${newQty}</td><td class="numeric">${deltaQtyHtml}</td><td class="purchase-desc">${oldPurDesc}</td><td class="purchase-desc">${newPurDesc}</td><td>${changes}</td></tr>`;
        });

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BOM Comparison - ${state.oldBomInfo.partNumber} vs ${state.newBomInfo.partNumber}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #fafafa;
            background-image: linear-gradient(rgba(200,200,200,0.15) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(200,200,200,0.15) 1px, transparent 1px);
            background-size: 20px 20px;
            color: #0f172a;
            padding: 2rem;
        }
        .container { max-width: 100%; }
        .header {
            margin-bottom: 3rem;
            border-left: 4px solid #1e40af;
            padding-left: 1.5rem;
        }
        h1 {
            font-family: 'JetBrains Mono', monospace;
            font-size: 2.5rem;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.02em;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
        }
        .subtitle { color: #475569; font-size: 0.875rem; }
        .assembly-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .assembly-card {
            background: #f1f5f9;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid;
        }
        .assembly-card.old { border-left-color: #10b981; }
        .assembly-card.new { border-left-color: #3b82f6; }
        .assembly-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .assembly-value { font-weight: 600; color: #0f172a; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            border-left: 4px solid;
        }
        .stat-card.added { border-left-color: #10b981; }
        .stat-card.removed { border-left-color: #ef4444; }
        .stat-card.changed { border-left-color: #f59e0b; }
        .stat-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .stat-value.added { color: #10b981; }
        .stat-value.removed { color: #ef4444; }
        .stat-value.changed { color: #f59e0b; }
        .stat-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.5rem;
        }
        .table-container {
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            overflow-x: auto;
        }
        table { width: max-content; min-width: 100%; border-collapse: collapse; }
        thead {
            background: #e2e8f0;
            position: sticky;
            top: 0;
        }
        th {
            text-align: left;
            padding: 1rem;
            color: #0f172a;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #cbd5e1;
            white-space: nowrap;
        }
        td {
            padding: 0.875rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            color: #0f172a;
            font-size: 0.875rem;
            white-space: nowrap;
            vertical-align: top;
        }
        tr:hover { background: #f8fafc; }
        .numeric {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
        }
        .description { max-width: 400px; white-space: normal; word-wrap: break-word; }
        .purchase-desc { max-width: 300px; white-space: pre-wrap; word-wrap: break-word; }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.625rem;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }
        .badge.added { background: #d1fae5; color: #065f46; }
        .badge.removed { background: #fee2e2; color: #991b1b; }
        .badge.changed { background: #fed7aa; color: #92400e; }
        .diff-removed {
            background: #fee2e2;
            text-decoration: line-through;
            padding: 0 0.125rem;
        }
        .diff-added {
            background: #d1fae5;
            padding: 0 0.125rem;
        }
        .delta-positive {
            background: #d1fae5;
            color: #065f46;
            font-weight: 600;
            padding: 0.125rem 0.25rem;
            border-radius: 3px;
        }
        .delta-negative {
            background: #fee2e2;
            color: #991b1b;
            font-weight: 600;
            padding: 0.125rem 0.25rem;
            border-radius: 3px;
        }
        @media print {
            body { background: white; }
            .table-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BOM Comparison</h1>
            <div class="subtitle">Generated: ${generatedDate}</div>
        </div>

        <div class="assembly-grid">
            <div class="assembly-card old">
                <div class="assembly-label">Old BOM</div>
                <div class="assembly-value">${state.oldBomFilename || 'N/A'}</div>
                <div class="assembly-label" style="margin-top: 0.5rem;">${state.oldBomInfo.partNumber} - ${state.oldBomInfo.description}</div>
                <div class="assembly-label" style="margin-top: 0.25rem;">Revision: ${state.oldBomInfo.revision || '-'} | Scope: ${state.oldBomInfo.isScoped ? state.oldBomInfo.scopedPartNumber : 'Full Assembly'}</div>
            </div>
            <div class="assembly-card new">
                <div class="assembly-label">New BOM</div>
                <div class="assembly-value">${state.newBomFilename || 'N/A'}</div>
                <div class="assembly-label" style="margin-top: 0.5rem;">${state.newBomInfo.partNumber} - ${state.newBomInfo.description}</div>
                <div class="assembly-label" style="margin-top: 0.25rem;">Revision: ${state.newBomInfo.revision || '-'} | Scope: ${state.newBomInfo.isScoped ? state.newBomInfo.scopedPartNumber : 'Full Assembly'}</div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card added">
                <div class="stat-value added">${added}</div>
                <div class="stat-label">Added</div>
            </div>
            <div class="stat-card removed">
                <div class="stat-value removed">${removed}</div>
                <div class="stat-label">Removed</div>
            </div>
            <div class="stat-card changed">
                <div class="stat-value changed">${changed}</div>
                <div class="stat-label">Changed</div>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Change</th>
                        <th>Part Number</th>
                        <th>Component Type</th>
                        <th>Old Description</th>
                        <th>New Description</th>
                        <th>Length (Dec)</th>
                        <th>Length (Frac)</th>
                        <th>Old Qty</th>
                        <th>New Qty</th>
                        <th>Δ Qty</th>
                        <th>Old Purchase Description</th>
                        <th>New Purchase Description</th>
                        <th>Changes</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    });

    // ========================================
    // BOM COMPARISON - RESET
    // ========================================

    // Reset Comparison button - clears results/selections, keeps files/trees loaded
    resetScopeBtn.addEventListener('click', () => {
        // Clear comparison results
        state.comparisonResults = [];
        state.oldBomFlattened = null;
        state.newBomFlattened = null;
        state.currentFilter = 'all';

        // Clear selections (but keep trees)
        state.oldSelectedNode = null;
        state.newSelectedNode = null;

        // Update selection visuals
        oldBomTreeContainer.querySelectorAll('.tree-select-row').forEach(row => {
            row.classList.remove('selected');
        });
        newBomTreeContainer.querySelectorAll('.tree-select-row').forEach(row => {
            row.classList.remove('selected');
        });

        // Update status displays
        updateSelectionDisplay('old');
        updateSelectionDisplay('new');

        // Hide results and export buttons
        compareResults.classList.remove('show');
        exportCompareExcelBtn.style.display = 'none';
        exportCompareHtmlBtn.style.display = 'none';
        resetScopeBtn.style.display = 'none';

        // Reset filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');

        // Scroll to top of comparison tab
        document.getElementById('compareTab').scrollIntoView({ behavior: 'smooth' });
    });

    // Start Over button - clears everything including files
    resetCompareBtn.addEventListener('click', () => {
        // Clear all data
        state.oldBomData = null;
        state.oldBomFlattened = null;
        state.oldBomInfo = { partNumber: '', revision: '', description: '' };
        state.oldBomFilename = null;
        state.oldBomTree = null;
        state.oldSelectedNode = null;

        state.newBomData = null;
        state.newBomFlattened = null;
        state.newBomInfo = { partNumber: '', revision: '', description: '' };
        state.newBomFilename = null;
        state.newBomTree = null;
        state.newSelectedNode = null;

        state.comparisonResults = [];
        state.currentFilter = 'all';

        // Reset Old BOM UI - show drop zone, hide tree panel
        oldBomZone.classList.remove('has-file');
        oldBomZone.style.display = '';
        oldBomTreePanel.style.display = 'none';
        oldBomTreeContainer.innerHTML = '';
        oldBomFileInfo.classList.remove('show');
        oldBomInput.value = '';

        // Reset New BOM UI - show drop zone, hide tree panel
        newBomZone.classList.remove('has-file');
        newBomZone.style.display = '';
        newBomTreePanel.style.display = 'none';
        newBomTreeContainer.innerHTML = '';
        newBomFileInfo.classList.remove('show');
        newBomInput.value = '';

        compareBtn.disabled = true;
        compareResults.classList.remove('show');
        compareMessage.classList.remove('show');

        exportCompareExcelBtn.style.display = 'none';
        exportCompareHtmlBtn.style.display = 'none';
        resetScopeBtn.style.display = 'none';

        // Reset filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Change File links - allow re-uploading a different file
    oldBomChangeFile.addEventListener('click', (e) => {
        e.preventDefault();
        // Clear old BOM data but keep new BOM
        state.oldBomData = null;
        state.oldBomTree = null;
        state.oldSelectedNode = null;

        // Reset UI
        oldBomTreePanel.style.display = 'none';
        oldBomTreeContainer.innerHTML = '';
        oldBomZone.classList.remove('has-file');
        oldBomZone.style.display = '';

        // Disable compare if no longer both loaded
        compareBtn.disabled = true;

        // Trigger file picker
        oldBomInput.click();
    });

    newBomChangeFile.addEventListener('click', (e) => {
        e.preventDefault();
        // Clear new BOM data but keep old BOM
        state.newBomData = null;
        state.newBomTree = null;
        state.newSelectedNode = null;

        // Reset UI
        newBomTreePanel.style.display = 'none';
        newBomTreeContainer.innerHTML = '';
        newBomZone.classList.remove('has-file');
        newBomZone.style.display = '';

        // Disable compare if no longer both loaded
        compareBtn.disabled = true;

        // Trigger file picker
        newBomInput.click();
    });
}
