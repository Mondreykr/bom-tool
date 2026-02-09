// hierarchy.js - Hierarchy View tab UI logic
// Extracted from index.html as part of Phase 6 UI module extraction

import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree, sortChildren, getRootPartNumber, getRootRevision, getRootDescription, resetRootInfo } from '../core/tree.js';
import { decimalToFractional } from '../core/utils.js';
import { exportHierarchyExcel } from '../export/excel.js';
import { exportHierarchyHtml } from '../export/html.js';

export function init() {
    // ========================================
    // HIERARCHY VIEW - STATE & DOM ELEMENTS
    // ========================================

    // Hierarchy tab state: state.hierarchyData, state.hierarchyTree, state.hierarchyFilename, state.hierarchyRootInfo

    const hierarchyUploadZone = document.getElementById('hierarchyUploadZone');
    const hierarchyFileInput = document.getElementById('hierarchyFile');
    const hierarchyFileInfo = document.getElementById('hierarchyFileInfo');
    const hierarchyFileName = document.getElementById('hierarchyFileName');
    const hierarchyFileMeta = document.getElementById('hierarchyFileMeta');
    const hierarchyMessage = document.getElementById('hierarchyMessage');
    const viewHierarchyBtn = document.getElementById('viewHierarchyBtn');
    const resetHierarchyBtn = document.getElementById('resetHierarchyBtn');
    const hierarchyResults = document.getElementById('hierarchyResults');
    const hierarchyTreeBody = document.getElementById('hierarchyTreeBody');
    const hierarchyFilenameDisplay = document.getElementById('hierarchyFilenameDisplay');
    const hierarchyAssemblyPartNumDesc = document.getElementById('hierarchyAssemblyPartNumDesc');
    const hierarchyAssemblyRev = document.getElementById('hierarchyAssemblyRev');
    const hierarchyUnitQtyInput = document.getElementById('hierarchyUnitQty');
    const hierarchyUnitQtyDisplay = document.getElementById('hierarchyUnitQtyDisplay');
    const hierarchyExpandAllBtn = document.getElementById('hierarchyExpandAllBtn');
    const hierarchyCollapseAllBtn = document.getElementById('hierarchyCollapseAllBtn');
    const exportHierarchyExcelBtn = document.getElementById('exportHierarchyExcelBtn');
    const exportHierarchyHtmlBtn = document.getElementById('exportHierarchyHtmlBtn');

    // ========================================
    // HIERARCHY VIEW - FILE UPLOAD HANDLERS
    // ========================================

    hierarchyUploadZone.addEventListener('click', () => hierarchyFileInput.click());

    hierarchyUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        hierarchyUploadZone.classList.add('dragover');
    });

    hierarchyUploadZone.addEventListener('dragleave', () => {
        hierarchyUploadZone.classList.remove('dragover');
    });

    hierarchyUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        hierarchyUploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        const fileName = file ? file.name.toLowerCase() : '';
        if (file && (fileName.endsWith('.csv') || fileName.endsWith('.xml'))) {
            handleHierarchyFile(file);
        } else {
            showHierarchyMessage('Please upload a CSV or XML file', 'error');
        }
    });

    hierarchyFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleHierarchyFile(file);
        }
    });

    function handleHierarchyFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileName = file.name.toLowerCase();
                const isXML = fileName.endsWith('.xml');

                if (isXML) {
                    const decoder = new TextDecoder('utf-8');
                    const xmlText = decoder.decode(e.target.result);
                    state.hierarchyData = parseXML(xmlText);
                    state.hierarchyFilename = file.name;
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
                    state.hierarchyData = XLSX.utils.sheet_to_json(worksheet, {
                        raw: true,
                        defval: ''
                    });
                    state.hierarchyFilename = file.name;
                }

                // Update UI
                hierarchyUploadZone.classList.add('has-file');
                hierarchyFileName.textContent = file.name;
                hierarchyFileMeta.textContent = `${state.hierarchyData.length} rows • ${(file.size / 1024).toFixed(1)} KB`;
                hierarchyFileInfo.classList.add('show');
                viewHierarchyBtn.disabled = false;
                showHierarchyMessage(`${isXML ? 'XML' : 'CSV'} loaded successfully: ${state.hierarchyData.length} rows`, 'success');
            } catch (error) {
                showHierarchyMessage(`Error parsing file: ${error.message}`, 'error');
                console.error('Parse error:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function showHierarchyMessage(text, type) {
        hierarchyMessage.textContent = text;
        hierarchyMessage.className = `message ${type} show`;
        setTimeout(() => {
            hierarchyMessage.classList.remove('show');
        }, 5000);
    }

    // ========================================
    // HIERARCHY VIEW - BUILD & DISPLAY
    // ========================================

    viewHierarchyBtn.addEventListener('click', () => {
        try {
            // Build tree
            state.hierarchyTree = buildTree(state.hierarchyData);
            sortChildren(state.hierarchyTree);

            // Store root info
            state.hierarchyRootInfo = {
                partNumber: getRootPartNumber(),
                revision: getRootRevision(),
                description: getRootDescription()
            };

            // Display tree
            displayHierarchyTree(state.hierarchyTree);

            showHierarchyMessage('Hierarchy displayed successfully!', 'success');
        } catch (error) {
            showHierarchyMessage(`Error building hierarchy: ${error.message}`, 'error');
            console.error(error);
        }
    });

    // Re-render tree when unit qty changes
    hierarchyUnitQtyInput.addEventListener('change', () => {
        if (state.hierarchyTree) {
            displayHierarchyTree(state.hierarchyTree);
        }
    });

    function displayHierarchyTree(root) {
        // Get unit qty multiplier
        const unitQty = parseInt(hierarchyUnitQtyInput.value) || 1;

        // Update assembly info - filename is primary, PN/description is secondary
        hierarchyFilenameDisplay.textContent = state.hierarchyFilename || 'N/A';
        hierarchyAssemblyPartNumDesc.textContent = `${root.partNumber} - ${root.description}`;
        hierarchyAssemblyRev.textContent = root.revision;
        hierarchyUnitQtyDisplay.textContent = unitQty;

        // Render tree with unit qty
        hierarchyTreeBody.innerHTML = '';
        renderTreeNode(root, hierarchyTreeBody, 0, false, [], unitQty);

        // Show results and export buttons
        hierarchyResults.classList.add('show');
        exportHierarchyExcelBtn.style.display = '';
        exportHierarchyHtmlBtn.style.display = '';

        // Scroll to results
        hierarchyResults.scrollIntoView({ behavior: 'smooth' });
    }

    function renderTreeNode(node, container, depth = 0, isLastChild = false, ancestorContinues = [], unitQty = 1) {
        // ancestorContinues[i] = true means ancestor at depth i has more siblings after this subtree

        const row = document.createElement('tr');
        row.dataset.level = node.level;
        row.dataset.depth = depth;

        const hasChildren = node.children.length > 0;
        const indent = depth * 24; // 24px per level
        const baseIndent = 16; // 1rem in pixels

        // Part Number cell (with tree lines and toggle)
        const partCell = document.createElement('td');
        partCell.className = 'tree-cell';
        partCell.style.paddingLeft = `${1 + indent / 16}rem`;

        // Create tree lines for non-root nodes
        if (depth > 0) {
            const linesContainer = document.createElement('div');
            linesContainer.className = 'tree-lines';

            // Draw vertical lines for ancestors that have more siblings (depths 0 to depth-2)
            for (let i = 0; i < depth - 1; i++) {
                if (ancestorContinues[i]) {
                    const vertLine = document.createElement('div');
                    vertLine.className = 'tree-line-vertical';
                    // Position: baseIndent + i * 24px + 7px (center of toggle at that depth)
                    vertLine.style.left = `${baseIndent + i * 24 + 7}px`;
                    linesContainer.appendChild(vertLine);
                }
            }

            // Draw vertical line for immediate parent (depth - 1)
            const parentVertLine = document.createElement('div');
            parentVertLine.className = 'tree-line-vertical';
            if (isLastChild) {
                parentVertLine.classList.add('last-child'); // Half-height for L-shape
            }
            parentVertLine.style.left = `${baseIndent + (depth - 1) * 24 + 7}px`;
            linesContainer.appendChild(parentVertLine);

            // Draw horizontal line from parent's vertical to this item
            const horizLine = document.createElement('div');
            horizLine.className = 'tree-line-horizontal';
            const horizStart = baseIndent + (depth - 1) * 24 + 7; // Parent's vertical line position
            const horizEnd = baseIndent + depth * 24; // Where toggle/spacer starts
            horizLine.style.left = `${horizStart}px`;
            horizLine.style.width = `${horizEnd - horizStart}px`;
            linesContainer.appendChild(horizLine);

            partCell.appendChild(linesContainer);
        }

        // Create toggle or spacer
        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle collapsed';
            toggle.textContent = '+';

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleChildren(row);
            });

            partCell.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.style.display = 'inline-block';
            spacer.style.width = '14px'; // Match toggle width
            spacer.style.marginRight = '6px';
            partCell.appendChild(spacer);
        }

        const partText = document.createTextNode(node.partNumber);
        partCell.appendChild(partText);

        // Qty cell (multiplied by unit qty)
        const qtyCell = document.createElement('td');
        qtyCell.className = 'numeric';
        qtyCell.textContent = node.qty * unitQty;

        // Component Type cell
        const typeCell = document.createElement('td');
        typeCell.textContent = node.componentType;

        // Description cell
        const descCell = document.createElement('td');
        descCell.className = 'description';
        descCell.textContent = node.description;

        // Length (Fractional) cell
        const lengthCell = document.createElement('td');
        lengthCell.textContent = node.length !== null ? decimalToFractional(node.length) : '';

        // UofM cell
        const uofmCell = document.createElement('td');
        uofmCell.textContent = node.uofm || '';

        // Purchase Description cell
        const purchaseDescCell = document.createElement('td');
        purchaseDescCell.className = 'purchase-desc';
        purchaseDescCell.textContent = node.purchaseDescription || '';

        // Revision cell
        const revCell = document.createElement('td');
        revCell.textContent = node.revision || '';

        // NS Item Type cell
        const nsItemCell = document.createElement('td');
        nsItemCell.textContent = node.nsItemType || '';

        row.appendChild(partCell);
        row.appendChild(qtyCell);
        row.appendChild(typeCell);
        row.appendChild(descCell);
        row.appendChild(lengthCell);
        row.appendChild(uofmCell);
        row.appendChild(purchaseDescCell);
        row.appendChild(revCell);
        row.appendChild(nsItemCell);

        container.appendChild(row);

        // Render children
        if (hasChildren) {
            row.classList.add('has-children');
            // Set CSS variable for parent's downward vertical line positioning
            partCell.style.setProperty('--this-depth', depth);
            node.children.forEach((child, index) => {
                const isLast = index === node.children.length - 1;
                // Build new ancestorContinues array for children:
                // Copy current array and add whether THIS node has more siblings
                const childAncestorContinues = [...ancestorContinues, !isLastChild];
                const childRow = renderTreeNode(child, container, depth + 1, isLast, childAncestorContinues, unitQty);
                childRow.classList.add('child-row', 'collapsed');
                childRow.dataset.parentLevel = node.level;
            });
        }

        return row;
    }

    function toggleChildren(parentRow) {
        const toggle = parentRow.querySelector('.tree-toggle');
        const parentLevel = parentRow.dataset.level;
        const parentDepth = parseInt(parentRow.dataset.depth);

        // Find all direct children (need to iterate through all descendants to find them)
        let nextRow = parentRow.nextElementSibling;
        let childRows = [];

        // Keep iterating until we hit a row at the same depth or shallower (sibling or ancestor)
        while (nextRow) {
            const nextDepth = parseInt(nextRow.dataset.depth);

            // Stop if we've reached a sibling or ancestor
            if (nextDepth <= parentDepth) {
                break;
            }

            // Collect direct children (those whose parent level matches our level)
            if (nextRow.dataset.parentLevel === parentLevel) {
                childRows.push(nextRow);
            }

            nextRow = nextRow.nextElementSibling;
        }

        // Toggle visibility
        const isCollapsed = toggle.classList.contains('collapsed');

        childRows.forEach(childRow => {
            if (isCollapsed) {
                // Expanding
                childRow.classList.remove('collapsed');
                toggle.textContent = '-';
                toggle.classList.remove('collapsed');
                toggle.classList.add('expanded');
                parentRow.classList.add('expanded');  // Show parent's downward line
            } else {
                // Collapsing - hide this row and all its descendants
                childRow.classList.add('collapsed');
                const childToggle = childRow.querySelector('.tree-toggle');
                if (childToggle && childToggle.classList.contains('expanded')) {
                    // If child was expanded, collapse it too
                    toggleChildren(childRow);
                }
                toggle.textContent = '+';
                toggle.classList.remove('expanded');
                toggle.classList.add('collapsed');
                parentRow.classList.remove('expanded');  // Hide parent's downward line
            }
        });
    }

    // ========================================
    // HIERARCHY VIEW - EXPAND/COLLAPSE ALL
    // ========================================

    hierarchyExpandAllBtn.addEventListener('click', () => {
        document.querySelectorAll('#hierarchyTreeBody .child-row').forEach(row => {
            row.classList.remove('collapsed');
        });
        document.querySelectorAll('#hierarchyTreeBody .tree-toggle').forEach(toggle => {
            toggle.classList.remove('collapsed');
            toggle.classList.add('expanded');
            toggle.textContent = '-';
        });
        document.querySelectorAll('#hierarchyTreeBody tr.has-children').forEach(row => {
            row.classList.add('expanded');
        });
    });

    hierarchyCollapseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('#hierarchyTreeBody .child-row').forEach(row => {
            row.classList.add('collapsed');
        });
        document.querySelectorAll('#hierarchyTreeBody .tree-toggle').forEach(toggle => {
            toggle.classList.remove('expanded');
            toggle.classList.add('collapsed');
            toggle.textContent = '+';
        });
        document.querySelectorAll('#hierarchyTreeBody tr.has-children').forEach(row => {
            row.classList.remove('expanded');
        });
    });

    // ========================================
    // HIERARCHY VIEW - EXPORTS
    // ========================================

    exportHierarchyExcelBtn.addEventListener('click', () => {
        const unitQty = parseInt(hierarchyUnitQtyInput.value) || 1;
        exportHierarchyExcel(state.hierarchyTree, state.hierarchyFilename, state.hierarchyRootInfo, unitQty);
    });

    exportHierarchyHtmlBtn.addEventListener('click', () => {
        const unitQty = parseInt(hierarchyUnitQtyInput.value) || 1;
        exportHierarchyHtml(state.hierarchyTree, state.hierarchyFilename, state.hierarchyRootInfo, unitQty);
    });

    // ========================================
    // HIERARCHY VIEW - RESET
    // ========================================

    resetHierarchyBtn.addEventListener('click', () => {
        state.hierarchyData = null;
        state.hierarchyTree = null;
        state.hierarchyFilename = null;
        state.hierarchyRootInfo = { partNumber: '', revision: '', description: '' };

        hierarchyUploadZone.classList.remove('has-file');
        hierarchyFileInfo.classList.remove('show');
        hierarchyFileInput.value = '';

        viewHierarchyBtn.disabled = true;
        hierarchyResults.classList.remove('show');
        hierarchyMessage.classList.remove('show');

        // Clear tree content and assembly info
        hierarchyTreeBody.innerHTML = '';
        hierarchyFilenameDisplay.textContent = '';
        hierarchyAssemblyPartNumDesc.textContent = '';
        hierarchyAssemblyRev.textContent = '';

        // Reset unit qty
        hierarchyUnitQtyInput.value = 1;

        exportHierarchyExcelBtn.style.display = 'none';
        exportHierarchyHtmlBtn.style.display = 'none';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
