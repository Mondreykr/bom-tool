// ifp-merge.js - IFP Merge tab UI logic
// Created for Phase 14 - IFP Merge Tab UI

import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree, sortChildren } from '../core/tree.js';
import { mergeBOM, isReleased } from '../core/merge.js';
import { isAssembly, validateBOM } from '../core/validate.js';
import { importArtifact, validateArtifact, suggestRevision, suggestJobNumber, exportArtifact, generateFilename } from '../core/artifact.js';

export function init() {
    // ========================================
    // DOM ELEMENT REFERENCES
    // ========================================

    // Upload zones and file inputs
    const ifpSourceZone = document.getElementById('ifpSourceZone');
    const ifpSourceFile = document.getElementById('ifpSourceFile');
    const ifpSourceInfo = document.getElementById('ifpSourceInfo');
    const ifpSourceName = document.getElementById('ifpSourceName');
    const ifpSourceMeta = document.getElementById('ifpSourceMeta');

    const ifpPriorZone = document.getElementById('ifpPriorZone');
    const ifpPriorFile = document.getElementById('ifpPriorFile');
    const ifpPriorInfo = document.getElementById('ifpPriorInfo');
    const ifpPriorName = document.getElementById('ifpPriorName');
    const ifpPriorMeta = document.getElementById('ifpPriorMeta');
    const ifpPriorContainer = document.getElementById('ifpPriorContainer');

    // Controls
    const ifpRev0Toggle = document.getElementById('ifpRev0Toggle');
    const ifpMessage = document.getElementById('ifpMessage');
    const ifpValidationErrors = document.getElementById('ifpValidationErrors');
    const ifpMergeBtn = document.getElementById('ifpMergeBtn');
    const ifpResetBtn = document.getElementById('ifpResetBtn');

    // Results section
    const ifpResults = document.getElementById('ifpResults');
    const ifpTreeBody = document.getElementById('ifpTreeBody');
    const ifpExpandAllBtn = document.getElementById('ifpExpandAllBtn');
    const ifpCollapseAllBtn = document.getElementById('ifpCollapseAllBtn');
    const ifpHideGraftedToggle = document.getElementById('ifpHideGraftedToggle');

    // Stats and info
    const ifpPassedCount = document.getElementById('ifpPassedCount');
    const ifpGraftedCount = document.getElementById('ifpGraftedCount');
    const ifpPlaceholderCount = document.getElementById('ifpPlaceholderCount');
    const ifpAssemblyFilenameDisplay = document.getElementById('ifpAssemblyFilenameDisplay');
    const ifpAssemblyPartNumDesc = document.getElementById('ifpAssemblyPartNumDesc');
    const ifpAssemblyRev = document.getElementById('ifpAssemblyRev');

    // Export controls
    const ifpRevisionInput = document.getElementById('ifpRevisionInput');
    const ifpJobNumber = document.getElementById('ifpJobNumber');
    const ifpExportBtn = document.getElementById('ifpExportBtn');

    // Warnings display
    const ifpSummaryStats = document.getElementById('ifpSummaryStats');
    const ifpWarnings = document.getElementById('ifpWarnings');

    // ========================================
    // REV0 TOGGLE
    // ========================================

    ifpRev0Toggle.addEventListener('change', () => {
        if (ifpRev0Toggle.checked) {
            // REV0 mode: disable prior artifact upload
            state.ifpIsRev0 = true;
            ifpPriorContainer.classList.add('ifp-prior-disabled');

            // Clear any loaded B(n-1)
            state.ifpPriorArtifact = null;
            state.ifpPriorFilename = null;
            ifpPriorZone.classList.remove('has-file');
            ifpPriorInfo.classList.remove('show');
            ifpPriorFile.value = '';

            // Auto-suggest REV0 values if source tree exists
            if (state.ifpSourceTree) {
                ifpRevisionInput.value = 0;
                ifpJobNumber.value = suggestJobNumber(null, state.ifpSourceTree.partNumber);
                updateExportReadiness();
            }
        } else {
            // Normal mode: enable prior artifact upload
            state.ifpIsRev0 = false;
            ifpPriorContainer.classList.remove('ifp-prior-disabled');
        }

        updateMergeReadiness();
    });

    // ========================================
    // X(n) SOURCE EXPORT UPLOAD
    // ========================================

    ifpSourceZone.addEventListener('click', () => ifpSourceFile.click());

    ifpSourceZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        ifpSourceZone.classList.add('dragover');
    });

    ifpSourceZone.addEventListener('dragleave', () => {
        ifpSourceZone.classList.remove('dragover');
    });

    ifpSourceZone.addEventListener('drop', (e) => {
        e.preventDefault();
        ifpSourceZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        const fileName = file ? file.name.toLowerCase() : '';
        if (file && fileName.endsWith('.xml')) {
            handleSourceFile(file);
        } else {
            showMessage('Please upload an XML file', 'error');
        }
    });

    ifpSourceFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleSourceFile(file);
        }
    });

    function handleSourceFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Parse XML
                const decoder = new TextDecoder('utf-8');
                const xmlText = decoder.decode(e.target.result);
                state.ifpSourceData = parseXML(xmlText);
                state.ifpSourceFilename = file.name;

                // Build tree
                state.ifpSourceTree = buildTree(state.ifpSourceData);
                sortChildren(state.ifpSourceTree);

                // Validate immediately
                state.ifpValidationResult = validateBOM(state.ifpSourceTree);

                // Display tree
                displayIfpTree(state.ifpSourceTree);

                // Display validation errors if any
                displayValidationErrors(state.ifpValidationResult);

                // Render source tree preview
                renderUploadPreview(state.ifpSourceTree, 'ifpSourcePreview');

                // Update UI
                ifpSourceZone.classList.add('has-file');
                ifpSourceName.textContent = file.name;
                ifpSourceMeta.textContent = `${state.ifpSourceData.length} rows • ${(file.size / 1024).toFixed(1)} KB`;
                ifpSourceInfo.classList.add('show');

                // Auto-suggest revision and job number
                if (state.ifpIsRev0) {
                    ifpRevisionInput.value = 0;
                    ifpJobNumber.value = suggestJobNumber(null, state.ifpSourceTree.partNumber);
                } else if (state.ifpPriorArtifact) {
                    // Prior artifact already loaded — suggest job number from it
                    ifpJobNumber.value = suggestJobNumber(state.ifpPriorArtifact, state.ifpSourceTree.partNumber);
                }
                updateExportReadiness();

                updateMergeReadiness();
                showMessage(`XML loaded successfully: ${state.ifpSourceData.length} rows`, 'success');
            } catch (error) {
                showMessage(`Error parsing XML: ${error.message}`, 'error');
                console.error('Parse error:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ========================================
    // B(n-1) PRIOR ARTIFACT UPLOAD
    // ========================================

    ifpPriorZone.addEventListener('click', () => ifpPriorFile.click());

    ifpPriorZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        ifpPriorZone.classList.add('dragover');
    });

    ifpPriorZone.addEventListener('dragleave', () => {
        ifpPriorZone.classList.remove('dragover');
    });

    ifpPriorZone.addEventListener('drop', (e) => {
        e.preventDefault();
        ifpPriorZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        const fileName = file ? file.name.toLowerCase() : '';
        if (file && fileName.endsWith('.json')) {
            handlePriorFile(file);
        } else {
            showMessage('Please upload a JSON file', 'error');
        }
    });

    ifpPriorFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handlePriorFile(file);
        }
    });

    async function handlePriorFile(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target.result;

                // Import artifact
                state.ifpPriorArtifact = importArtifact(jsonString);
                state.ifpPriorFilename = file.name;

                // Validate artifact
                const expectedGA = state.ifpSourceTree ? state.ifpSourceTree.partNumber : undefined;
                const result = await validateArtifact(state.ifpPriorArtifact, { expectedGA });

                if (!result.valid) {
                    // Hash mismatch - reject the file
                    showMessage(`Artifact validation failed: ${result.errors.join(', ')}`, 'error');
                    state.ifpPriorArtifact = null;
                    state.ifpPriorFilename = null;
                    ifpPriorFile.value = '';
                    return;
                }

                // Show warnings if any (non-blocking)
                if (result.warnings.length > 0) {
                    showMessage(`Artifact loaded with warnings: ${result.warnings.join('; ')}`, 'success');
                }

                // Auto-suggest revision (always set when prior artifact loads, even before XML)
                ifpRevisionInput.value = suggestRevision(state.ifpPriorArtifact);

                // Auto-suggest job number (needs source tree for part number)
                if (state.ifpSourceTree) {
                    ifpJobNumber.value = suggestJobNumber(state.ifpPriorArtifact, state.ifpSourceTree.partNumber);
                }
                updateExportReadiness();

                // Render prior tree preview
                renderUploadPreview(state.ifpPriorArtifact.bom, 'ifpPriorPreview');

                // Update UI
                ifpPriorZone.classList.add('has-file');
                ifpPriorName.textContent = file.name;
                const rev = state.ifpPriorArtifact.metadata.revision;
                const job = state.ifpPriorArtifact.metadata.jobNumber;
                ifpPriorMeta.textContent = `REV${rev} • Job ${job}`;
                ifpPriorInfo.classList.add('show');

                updateMergeReadiness();

                if (result.warnings.length === 0) {
                    showMessage(`Prior artifact loaded: REV${rev}, Job ${job}`, 'success');
                }
            } catch (error) {
                showMessage(`Error loading artifact: ${error.message}`, 'error');
                console.error('Import error:', error);
                state.ifpPriorArtifact = null;
                state.ifpPriorFilename = null;
                ifpPriorFile.value = '';
            }
        };
        reader.readAsText(file);
    }

    // ========================================
    // STATE-AWARE TREE RENDERING
    // ========================================

    function displayIfpTree(root) {
        // Update assembly info
        ifpAssemblyFilenameDisplay.textContent = state.ifpSourceFilename || 'N/A';
        ifpAssemblyPartNumDesc.textContent = `${root.partNumber} - ${root.description}`;
        ifpAssemblyRev.textContent = root.revision || 'N/A';

        // Render tree
        ifpTreeBody.innerHTML = '';
        renderTreeNode(root, ifpTreeBody, 0, false, []);

        // Show results section
        ifpResults.classList.add('show');

        // Scroll to results
        ifpResults.scrollIntoView({ behavior: 'smooth' });
    }

    function renderTreeNode(node, container, depth = 0, isLastChild = false, ancestorContinues = []) {
        const row = document.createElement('tr');
        row.dataset.level = node.level;
        row.dataset.depth = depth;

        const hasChildren = node.children.length > 0;
        const indent = depth * 24;
        const baseIndent = 16;

        // Check if this is a WIP assembly (for hiding children)
        const isWipAssembly = isAssembly(node) && !isReleased(node.state);
        if (isWipAssembly) {
            row.dataset.wipAssembly = 'true';
        }

        // Part Number cell (with tree lines and toggle)
        const partCell = document.createElement('td');
        partCell.className = 'tree-cell';
        partCell.style.paddingLeft = `${1 + indent / 16}rem`;

        // Tree lines for non-root nodes
        if (depth > 0) {
            const linesContainer = document.createElement('div');
            linesContainer.className = 'tree-lines';

            // Vertical lines for ancestors with more siblings
            for (let i = 0; i < depth - 1; i++) {
                if (ancestorContinues[i]) {
                    const vertLine = document.createElement('div');
                    vertLine.className = 'tree-line-vertical';
                    vertLine.style.left = `${baseIndent + i * 24 + 7}px`;
                    linesContainer.appendChild(vertLine);
                }
            }

            // Vertical line for immediate parent
            const parentVertLine = document.createElement('div');
            parentVertLine.className = 'tree-line-vertical';
            if (isLastChild) {
                parentVertLine.classList.add('last-child');
            }
            parentVertLine.style.left = `${baseIndent + (depth - 1) * 24 + 7}px`;
            linesContainer.appendChild(parentVertLine);

            // Horizontal line
            const horizLine = document.createElement('div');
            horizLine.className = 'tree-line-horizontal';
            const horizStart = baseIndent + (depth - 1) * 24 + 7;
            const horizEnd = baseIndent + depth * 24;
            horizLine.style.left = `${horizStart}px`;
            horizLine.style.width = `${horizEnd - horizStart}px`;
            linesContainer.appendChild(horizLine);

            partCell.appendChild(linesContainer);
        }

        // Toggle or spacer
        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';

            // Default to first level expanded (depth 0 = root, depth 1 = direct children)
            if (depth === 0) {
                toggle.classList.add('expanded');
                toggle.textContent = '-';
                row.classList.add('expanded');
            } else {
                toggle.classList.add('collapsed');
                toggle.textContent = '+';
            }

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleChildren(row);
            });

            partCell.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.style.display = 'inline-block';
            spacer.style.width = '14px';
            spacer.style.marginRight = '6px';
            partCell.appendChild(spacer);
        }

        const partText = document.createTextNode(node.partNumber);
        partCell.appendChild(partText);

        // Qty cell
        const qtyCell = document.createElement('td');
        qtyCell.className = 'numeric';
        qtyCell.textContent = node.qty;

        // Description cell
        const descCell = document.createElement('td');
        descCell.className = 'description';
        descCell.textContent = node.description;

        // Revision cell
        const revCell = document.createElement('td');
        revCell.textContent = node.revision || '';

        // State pill cell
        const stateCell = document.createElement('td');
        const pill = document.createElement('span');
        pill.className = 'state-pill';
        if (isReleased(node.state)) {
            pill.classList.add('released');
            pill.textContent = 'Released';
        } else {
            pill.classList.add('wip');
            pill.textContent = 'WIP';
        }
        stateCell.appendChild(pill);

        // Source cell — show resolved labels (e.g., "X(2)", "B(1)", "New (WIP)")
        const sourceCell = document.createElement('td');
        sourceCell.style.fontSize = '0.8125rem';

        if (node._source && node._source.startsWith('B(')) {
            // Grafted from prior artifact
            sourceCell.textContent = node._source;
            sourceCell.style.color = '#78716c'; // Subtle grey
            row.classList.add('ifp-row-grafted');
            row.dataset.source = 'grafted';
        } else if (node._source === 'New (WIP)') {
            // Placeholder — WIP with no prior release
            sourceCell.textContent = 'New (WIP)';
            sourceCell.style.color = '#d97706'; // Orange
            row.dataset.source = 'placeholder';
        } else if (node._source === 'grafted') {
            // Legacy fallback (shouldn't happen after merge.js update)
            sourceCell.textContent = 'B(n-1)';
            sourceCell.style.color = '#78716c';
            row.classList.add('ifp-row-grafted');
            row.dataset.source = 'grafted';
        } else {
            // Current — from X(n)
            sourceCell.textContent = node._source || '';
            sourceCell.style.color = '#a8a29e'; // Very subtle
            row.dataset.source = 'current';
        }

        row.appendChild(partCell);
        row.appendChild(qtyCell);
        row.appendChild(descCell);
        row.appendChild(revCell);
        row.appendChild(stateCell);
        row.appendChild(sourceCell);

        container.appendChild(row);

        // Render children
        if (hasChildren) {
            row.classList.add('has-children');
            partCell.style.setProperty('--this-depth', depth);

            node.children.forEach((child, index) => {
                const isLast = index === node.children.length - 1;
                const childAncestorContinues = [...ancestorContinues, !isLastChild];
                const childRow = renderTreeNode(child, container, depth + 1, isLast, childAncestorContinues);
                childRow.classList.add('child-row');

                // First level is expanded by default (depth 1 = direct children of root)
                if (depth === 0) {
                    // Don't add collapsed class - these are visible
                } else {
                    childRow.classList.add('collapsed');
                }

                childRow.dataset.parentLevel = node.level;
            });
        }

        return row;
    }

    function toggleChildren(parentRow) {
        const toggle = parentRow.querySelector('.tree-toggle');
        const parentLevel = parentRow.dataset.level;
        const parentDepth = parseInt(parentRow.dataset.depth);

        let nextRow = parentRow.nextElementSibling;
        let childRows = [];

        while (nextRow) {
            const nextDepth = parseInt(nextRow.dataset.depth);
            if (nextDepth <= parentDepth) break;
            if (nextRow.dataset.parentLevel === parentLevel) {
                childRows.push(nextRow);
            }
            nextRow = nextRow.nextElementSibling;
        }

        const isCollapsed = toggle.classList.contains('collapsed');

        childRows.forEach(childRow => {
            if (isCollapsed) {
                // Expanding
                childRow.classList.remove('collapsed');
                toggle.textContent = '-';
                toggle.classList.remove('collapsed');
                toggle.classList.add('expanded');
                parentRow.classList.add('expanded');
            } else {
                // Collapsing
                childRow.classList.add('collapsed');
                const childToggle = childRow.querySelector('.tree-toggle');
                if (childToggle && childToggle.classList.contains('expanded')) {
                    toggleChildren(childRow);
                }
                toggle.textContent = '+';
                toggle.classList.remove('expanded');
                toggle.classList.add('collapsed');
                parentRow.classList.remove('expanded');
            }
        });
    }

    // ========================================
    // VALIDATION ERROR DISPLAY
    // ========================================

    function displayValidationErrors(validationResult) {
        if (validationResult.valid) {
            // Hide banner
            ifpValidationErrors.classList.remove('show');
            ifpValidationErrors.innerHTML = '';
        } else {
            // Show banner with errors
            ifpValidationErrors.classList.add('show');

            let html = '<div class="banner-title">Validation Errors — Merge Blocked</div>';
            validationResult.errors.forEach(error => {
                html += `<div class="error-item">${error.message}</div>`;
            });

            ifpValidationErrors.innerHTML = html;
        }
    }

    // ========================================
    // UPDATE MERGE READINESS
    // ========================================

    function updateMergeReadiness() {
        const hasSource = state.ifpSourceTree !== null;
        const validationPassed = state.ifpValidationResult?.valid === true;
        const hasPriorOrRev0 = state.ifpIsRev0 || state.ifpPriorArtifact !== null;

        const canMerge = hasSource && validationPassed && hasPriorOrRev0;

        ifpMergeBtn.disabled = !canMerge;
    }

    // ========================================
    // JOB NUMBER VALIDATION & EXPORT READINESS
    // ========================================

    const jobNumberPattern = /^1J\d{6}$/;

    function updateExportReadiness() {
        const hasMergedTree = state.ifpMergedTree !== null;
        const jobValid = jobNumberPattern.test(ifpJobNumber.value.trim());

        // Visual validation indicator on job number field
        if (ifpJobNumber.value.trim() === '') {
            ifpJobNumber.style.borderColor = '';
        } else if (jobValid) {
            ifpJobNumber.style.borderColor = '#22c55e'; // Green
        } else {
            ifpJobNumber.style.borderColor = '#ef4444'; // Red
        }

        ifpExportBtn.disabled = !(hasMergedTree && jobValid);
    }

    ifpJobNumber.addEventListener('input', () => {
        updateExportReadiness();
    });

    // ========================================
    // EXPAND/COLLAPSE ALL
    // ========================================

    ifpExpandAllBtn.addEventListener('click', () => {
        document.querySelectorAll('#ifpTreeBody .child-row').forEach(row => {
            row.classList.remove('collapsed');
        });
        document.querySelectorAll('#ifpTreeBody .tree-toggle').forEach(toggle => {
            toggle.classList.remove('collapsed');
            toggle.classList.add('expanded');
            toggle.textContent = '-';
        });
        document.querySelectorAll('#ifpTreeBody tr.has-children').forEach(row => {
            row.classList.add('expanded');
        });
    });

    ifpCollapseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('#ifpTreeBody .child-row').forEach(row => {
            row.classList.add('collapsed');
        });
        document.querySelectorAll('#ifpTreeBody .tree-toggle').forEach(toggle => {
            toggle.classList.remove('expanded');
            toggle.classList.add('collapsed');
            toggle.textContent = '+';
        });
        document.querySelectorAll('#ifpTreeBody tr.has-children').forEach(row => {
            row.classList.remove('expanded');
        });
    });

    // ========================================
    // HIDE B(n-1) SUBSTITUTIONS TOGGLE
    // ========================================

    ifpHideGraftedToggle.addEventListener('click', () => {
        ifpHideGraftedToggle.classList.toggle('active');

        const isActive = ifpHideGraftedToggle.classList.contains('active');

        if (isActive) {
            // Hide all grafted rows AND their children
            // A grafted assembly row and everything beneath it until we return to the same or shallower depth
            document.querySelectorAll('#ifpTreeBody tr[data-source="grafted"]').forEach(row => {
                row.classList.add('grafted-hidden');
                // Also hide all descendant rows (children of grafted assemblies)
                const graftedDepth = parseInt(row.dataset.depth);
                let nextRow = row.nextElementSibling;
                while (nextRow) {
                    const nextDepth = parseInt(nextRow.dataset.depth);
                    if (nextDepth <= graftedDepth) break;
                    nextRow.classList.add('grafted-hidden');
                    nextRow = nextRow.nextElementSibling;
                }
            });
        } else {
            // Show all grafted rows
            document.querySelectorAll('#ifpTreeBody .grafted-hidden').forEach(row => {
                row.classList.remove('grafted-hidden');
            });
        }
    });

    // ========================================
    // MERGE BUTTON
    // ========================================

    ifpMergeBtn.addEventListener('click', () => {
        try {
            // Get priorRoot
            let priorRoot = null;
            if (!state.ifpIsRev0 && state.ifpPriorArtifact) {
                priorRoot = state.ifpPriorArtifact.bom;
            }

            // Determine resolved revision numbers for source labels
            // sourceRevision comes from the XML's actual revision field, NOT the IFP output revision
            const sourceRevision = state.ifpSourceTree.revision || ifpRevisionInput.value;
            const priorRevision = state.ifpPriorArtifact ? state.ifpPriorArtifact.metadata.revision : null;

            // Execute merge with resolved revision options
            const { mergedTree, warnings, summary } = mergeBOM(state.ifpSourceTree, priorRoot, {
                sourceRevision,
                priorRevision
            });

            // Store results
            state.ifpMergedTree = mergedTree;
            state.ifpMergeSummary = summary;
            state.ifpMergeWarnings = warnings;

            // Re-render tree with merged data
            displayIfpTree(state.ifpMergedTree);

            // Reapply toggle states if active (tree re-render clears hidden classes)
            if (ifpHideGraftedToggle.classList.contains('active')) {
                ifpHideGraftedToggle.click();
                ifpHideGraftedToggle.click();
            }

            // Display merge summary stat cards
            displayMergeSummary(summary);

            // Display warnings if any
            displayMergeWarnings(warnings);

            // Update export readiness (checks job number pattern too)
            updateExportReadiness();

            // Show success message
            const warningNote = warnings.length > 0 ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : '';
            showMessage(`Merge completed successfully${warningNote}`, 'success');

            // Scroll to summary
            if (ifpSummaryStats) {
                ifpSummaryStats.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            showMessage(`Merge failed: ${error.message}`, 'error');
            console.error('Merge error:', error);
        }
    });

    // ========================================
    // EXPORT B(n) BUTTON
    // ========================================

    ifpExportBtn.addEventListener('click', async () => {
        try {
            // Validate merged tree exists
            if (!state.ifpMergedTree) {
                showMessage('No merged BOM available to export', 'error');
                return;
            }

            // Read user inputs
            const revision = parseInt(ifpRevisionInput.value) || 0;
            const jobNumber = ifpJobNumber.value.trim();

            if (!jobNumber) {
                showMessage('Job number is required', 'error');
                return;
            }

            // Build source files metadata
            const sourceFiles = {
                xn: state.ifpSourceFilename,
                bn1: state.ifpPriorFilename || null
            };

            // Export artifact
            const artifact = await exportArtifact({
                mergedTree: state.ifpMergedTree,
                summary: state.ifpMergeSummary,
                revision: revision,
                jobNumber: jobNumber,
                sourceFiles: sourceFiles
            });

            // Generate filename
            const filename = generateFilename(jobNumber, revision);

            // Convert to JSON string
            const jsonString = JSON.stringify(artifact, null, 2);

            // Trigger download using Save As behavior
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Show success message
            showMessage(`Exported: ${filename}`, 'success');
        } catch (error) {
            showMessage(`Export failed: ${error.message}`, 'error');
            console.error('Export error:', error);
        }
    });

    // ========================================
    // RESET/START OVER
    // ========================================

    // ========================================
    // UPLOAD TREE PREVIEW
    // ========================================

    /**
     * Render a compact read-only tree preview into the specified container.
     * Shows Part Number, Qty, Description, and State pill.
     * First level expanded, deeper levels collapsed.
     *
     * @param {BOMNode} rootNode - Root of the BOM tree to preview
     * @param {string} containerId - ID of the preview container element
     */
    function renderUploadPreview(rootNode, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Build table
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const columns = [
            { text: 'Part Number', className: '' },
            { text: 'Qty', className: 'numeric' },
            { text: 'Description', className: '' },
            { text: 'State', className: '' }
        ];
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.text;
            if (col.className) th.className = col.className;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        function renderPreviewNode(node, depth, isLastChild, parentExpanded) {
            const row = document.createElement('tr');
            row.dataset.previewDepth = depth;
            const hasChildren = node.children && node.children.length > 0;

            // Part Number cell with indentation
            const partCell = document.createElement('td');
            partCell.className = 'tree-cell';
            partCell.style.paddingLeft = `${0.5 + depth * 1}rem`;

            // Toggle or spacer
            if (hasChildren) {
                const toggle = document.createElement('span');
                toggle.className = 'preview-toggle';
                if (depth === 0) {
                    toggle.textContent = '-';
                    row.classList.add('preview-expanded');
                } else {
                    toggle.textContent = '+';
                }
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePreviewChildren(row, toggle);
                });
                partCell.appendChild(toggle);
            } else {
                const spacer = document.createElement('span');
                spacer.style.display = 'inline-block';
                spacer.style.width = '12px';
                spacer.style.marginRight = '4px';
                partCell.appendChild(spacer);
            }

            partCell.appendChild(document.createTextNode(node.partNumber || ''));
            row.appendChild(partCell);

            // Qty cell
            const qtyCell = document.createElement('td');
            qtyCell.className = 'numeric';
            qtyCell.textContent = node.qty || '';
            row.appendChild(qtyCell);

            // Description cell
            const descCell = document.createElement('td');
            descCell.textContent = node.description || '';
            row.appendChild(descCell);

            // State pill cell
            const stateCell = document.createElement('td');
            const pill = document.createElement('span');
            pill.className = 'state-pill';
            if (isReleased(node.state)) {
                pill.classList.add('released');
                pill.textContent = 'Released';
            } else {
                pill.classList.add('wip');
                pill.textContent = 'WIP';
            }
            stateCell.appendChild(pill);
            row.appendChild(stateCell);

            // Collapse rows deeper than depth 0
            if (depth > 0 && !parentExpanded) {
                row.classList.add('preview-collapsed');
            }

            tbody.appendChild(row);

            // Render children
            if (hasChildren) {
                const childrenExpanded = (depth === 0); // Only root's children are expanded
                node.children.forEach(child => {
                    renderPreviewNode(child, depth + 1, false, childrenExpanded);
                });
            }
        }

        function togglePreviewChildren(parentRow, toggle) {
            const parentDepth = parseInt(parentRow.dataset.previewDepth);
            const isExpanded = parentRow.classList.contains('preview-expanded');

            let nextRow = parentRow.nextElementSibling;
            while (nextRow) {
                const nextDepth = parseInt(nextRow.dataset.previewDepth);
                if (nextDepth <= parentDepth) break;

                if (isExpanded) {
                    // Collapsing — hide all descendants
                    nextRow.classList.add('preview-collapsed');
                    nextRow.classList.remove('preview-expanded');
                    const childToggle = nextRow.querySelector('.preview-toggle');
                    if (childToggle) childToggle.textContent = '+';
                } else {
                    // Expanding — show only direct children
                    if (nextDepth === parentDepth + 1) {
                        nextRow.classList.remove('preview-collapsed');
                    }
                }
                nextRow = nextRow.nextElementSibling;
            }

            if (isExpanded) {
                parentRow.classList.remove('preview-expanded');
                toggle.textContent = '+';
            } else {
                parentRow.classList.add('preview-expanded');
                toggle.textContent = '-';
            }
        }

        renderPreviewNode(rootNode, 0, false, true);
        table.appendChild(tbody);

        container.innerHTML = '';
        container.appendChild(table);
        container.classList.add('show');
    }

    // ========================================
    // RESET/START OVER
    // ========================================

    ifpResetBtn.addEventListener('click', () => {
        // Clear all state
        state.ifpSourceData = null;
        state.ifpSourceTree = null;
        state.ifpSourceFilename = null;
        state.ifpPriorArtifact = null;
        state.ifpPriorFilename = null;
        state.ifpMergedTree = null;
        state.ifpMergeSummary = null;
        state.ifpMergeWarnings = [];
        state.ifpValidationResult = null;
        state.ifpIsRev0 = false;

        // Reset UI
        ifpSourceZone.classList.remove('has-file');
        ifpSourceInfo.classList.remove('show');
        ifpSourceFile.value = '';

        ifpPriorZone.classList.remove('has-file');
        ifpPriorInfo.classList.remove('show');
        ifpPriorFile.value = '';
        ifpPriorContainer.classList.remove('ifp-prior-disabled');

        ifpRev0Toggle.checked = false;
        ifpMergeBtn.disabled = true;
        ifpExportBtn.disabled = true;
        ifpResults.classList.remove('show');
        ifpMessage.classList.remove('show');
        ifpValidationErrors.classList.remove('show');

        // Clear tree
        ifpTreeBody.innerHTML = '';

        // Clear upload previews
        const sourcePreview = document.getElementById('ifpSourcePreview');
        const priorPreview = document.getElementById('ifpPriorPreview');
        if (sourcePreview) { sourcePreview.innerHTML = ''; sourcePreview.classList.remove('show'); }
        if (priorPreview) { priorPreview.innerHTML = ''; priorPreview.classList.remove('show'); }

        // Reset inputs
        ifpRevisionInput.value = 0;
        ifpJobNumber.value = '';
        ifpJobNumber.style.borderColor = '';

        // Grafted toggle off
        ifpHideGraftedToggle.classList.remove('active');

        // Clear summary and warnings
        if (ifpSummaryStats) {
            ifpSummaryStats.classList.remove('show');
        }
        if (ifpWarnings) {
            ifpWarnings.classList.remove('show');
            ifpWarnings.innerHTML = '';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ========================================
    // HELPER: DISPLAY MERGE SUMMARY
    // ========================================

    function displayMergeSummary(summary) {
        // Show summary stats container
        if (ifpSummaryStats) {
            ifpSummaryStats.classList.add('show');
        }

        // Update stat card values
        ifpPassedCount.textContent = summary.passedThrough;
        ifpGraftedCount.textContent = summary.grafted;
        ifpPlaceholderCount.textContent = summary.placeholders;

        // Add color classes to stat cards
        const passedCard = ifpPassedCount.closest('.stat-card');
        const graftedCard = ifpGraftedCount.closest('.stat-card');
        const placeholderCard = ifpPlaceholderCount.closest('.stat-card');

        if (passedCard) passedCard.classList.add('ifp-stat-passed');
        if (graftedCard) graftedCard.classList.add('ifp-stat-grafted');
        if (placeholderCard) placeholderCard.classList.add('ifp-stat-placeholders');
    }

    // ========================================
    // HELPER: DISPLAY MERGE WARNINGS
    // ========================================

    function displayMergeWarnings(warnings) {
        if (!ifpWarnings) return;

        if (warnings.length === 0) {
            ifpWarnings.classList.remove('show');
            ifpWarnings.innerHTML = '';
        } else {
            ifpWarnings.classList.add('show');

            let html = '<div class="warning-title">Merge Warnings</div>';
            warnings.forEach(warning => {
                html += `<div class="warning-item">${warning}</div>`;
            });

            ifpWarnings.innerHTML = html;
        }
    }

    // ========================================
    // HELPER: SHOW MESSAGE
    // ========================================

    function showMessage(text, type) {
        ifpMessage.textContent = text;
        ifpMessage.className = `message ${type} show`;
        setTimeout(() => {
            ifpMessage.classList.remove('show');
        }, 5000);
    }
}
