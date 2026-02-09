// flat-bom.js - Flat BOM tab UI logic
// Extracted from index.html as part of Phase 6 UI module extraction

import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree, getRootPartNumber, getRootRevision, getRootDescription, resetRootInfo } from '../core/tree.js';
import { flattenBOM, sortBOM } from '../core/flatten.js';
import { parseLength, decimalToFractional } from '../core/utils.js';
import { exportFlatBomExcel } from '../export/excel.js';
import { exportFlatBomHtml } from '../export/html.js';

export function init() {
    // Flat BOM tab state: state.csvData, state.flattenedBOM, state.treeRoot, state.uploadedFilename

    // DOM elements
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('csvFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileNameDisplay = document.getElementById('fileName');
    const fileMeta = document.getElementById('fileMeta');
    const unitQtyInput = document.getElementById('unitQty');
    const flattenBtn = document.getElementById('flattenBtn');
    const resetBtn = document.getElementById('resetBtn');
    const message = document.getElementById('message');
    const results = document.getElementById('results');
    const resultsBody = document.getElementById('resultsBody');
    const totalItems = document.getElementById('totalItems');
    const unitQtyDisplay = document.getElementById('unitQtyDisplay');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportHtmlBtn = document.getElementById('exportHtmlBtn');

    // File upload handlers
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        const fileName = file ? file.name.toLowerCase() : '';
        if (file && (fileName.endsWith('.csv') || fileName.endsWith('.xml'))) {
            handleFile(file);
        } else {
            showMessage('Please upload a CSV or XML file', 'error');
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Detect file type
                const fileName = file.name.toLowerCase();
                const isXML = fileName.endsWith('.xml');

                console.log(`File type detected: ${isXML ? 'XML' : 'CSV'}`);

                if (isXML) {
                    // Parse XML
                    const decoder = new TextDecoder('utf-8');
                    const xmlText = decoder.decode(e.target.result);
                    state.csvData = parseXML(xmlText);

                    console.log(`XML parsed: ${state.csvData.length} data rows`);
                    console.log('First 5 rows:', state.csvData.slice(0, 5).map(r => r.Level + ': ' + r['Part Number']).join(', '));
                    console.log('Root assembly:', state.csvData[0]);

                    // Store filename for exports
                    state.uploadedFilename = file.name;

                    // Update UI
                    uploadZone.classList.add('has-file');
                    fileNameDisplay.textContent = file.name;
                    fileMeta.textContent = `${state.csvData.length} rows • ${(file.size / 1024).toFixed(1)} KB`;
                    fileInfo.classList.add('show');
                    flattenBtn.disabled = false;
                    showMessage(`XML loaded successfully: ${state.csvData.length} rows`, 'success');
                } else {
                    // Parse CSV
                    // Decode UTF-16 first
                    const decoder = new TextDecoder('utf-16le');
                    let csvText = decoder.decode(e.target.result);

                    // Remove BOM if present
                    if (csvText.charCodeAt(0) === 0xFEFF) {
                        csvText = csvText.substring(1);
                    }

                    // Use XLSX to parse CSV text (it handles quotes correctly)
                    const workbook = XLSX.read(csvText, {
                        type: 'string',
                        raw: true,        // Keep raw values - don't parse dates/numbers
                        cellText: true,   // Treat everything as text
                        cellDates: false  // Don't convert to dates
                    });

                    // Get first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Convert to JSON (array of objects)
                    state.csvData = XLSX.utils.sheet_to_json(worksheet, {
                        raw: true,       // Keep raw values
                        defval: ''       // Empty cells = empty string
                    });

                    console.log(`CSV parsed: ${state.csvData.length} data rows`);
                    console.log('First 5 rows:', state.csvData.slice(0, 5).map(r => r.Level + ': ' + r['Part Number']).join(', '));

                    // Store filename for exports
                    state.uploadedFilename = file.name;

                    // Update UI
                    uploadZone.classList.add('has-file');
                    fileNameDisplay.textContent = file.name;
                    fileMeta.textContent = `${state.csvData.length} rows • ${(file.size / 1024).toFixed(1)} KB`;
                    fileInfo.classList.add('show');
                    flattenBtn.disabled = false;
                    showMessage(`CSV loaded successfully: ${state.csvData.length} rows`, 'success');
                }
            } catch (error) {
                showMessage(`Error parsing file: ${error.message}`, 'error');
                console.error('Parse error:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    }


    // Flatten button handler
    flattenBtn.addEventListener('click', () => {
        try {
            const unitQty = parseInt(unitQtyInput.value);
            if (unitQty < 1) {
                showMessage('Unit Quantity must be at least 1', 'error');
                return;
            }

            // Build tree and preserve it
            state.treeRoot = buildTree(state.csvData);

            // Flatten and aggregate
            const items = flattenBOM(state.treeRoot, unitQty);

            // Sort
            state.flattenedBOM = sortBOM(items);

            // Display results
            displayResults(state.flattenedBOM, unitQty);

            showMessage('BOM flattened successfully!', 'success');
        } catch (error) {
            showMessage(`Error flattening BOM: ${error.message}`, 'error');
            console.error(error);
        }
    });

    // Display results
    function displayResults(items, unitQty) {
        // Update stats
        totalItems.textContent = items.length;
        unitQtyDisplay.textContent = unitQty;

        // Calculate component type counts (number of unique items, not quantities)
        const counts = {
            'Manufactured': 0,
            'Purchased': 0,
            'Raw Stock': 0
        };

        items.forEach(item => {
            if (counts.hasOwnProperty(item.componentType)) {
                counts[item.componentType]++;
            }
        });

        // Update component type breakdown
        const breakdown = document.getElementById('componentBreakdown');
        const manufacturedBreakdown = document.getElementById('manufacturedBreakdown');
        const purchasedBreakdown = document.getElementById('purchasedBreakdown');
        const rawStockBreakdown = document.getElementById('rawStockBreakdown');

        let hasBreakdown = false;

        if (counts['Manufactured'] > 0) {
            document.getElementById('manufacturedCount').textContent = counts['Manufactured'];
            manufacturedBreakdown.style.display = '';
            hasBreakdown = true;
        } else {
            manufacturedBreakdown.style.display = 'none';
        }

        if (counts['Purchased'] > 0) {
            document.getElementById('purchasedCount').textContent = counts['Purchased'];
            purchasedBreakdown.style.display = '';
            hasBreakdown = true;
        } else {
            purchasedBreakdown.style.display = 'none';
        }

        if (counts['Raw Stock'] > 0) {
            document.getElementById('rawStockCount').textContent = counts['Raw Stock'];
            rawStockBreakdown.style.display = '';
            hasBreakdown = true;
        } else {
            rawStockBreakdown.style.display = 'none';
        }

        // Show breakdown section if any component types exist
        breakdown.style.display = hasBreakdown ? '' : 'none';

        // Update assembly info - filename is primary, PN/description is secondary
        document.getElementById('assemblyFilenameDisplay').textContent = state.uploadedFilename || 'N/A';
        document.getElementById('assemblyPartNumDesc').textContent = `${getRootPartNumber()} - ${getRootDescription() || ''}`;
        document.getElementById('assemblyRev').textContent = getRootRevision();

        // Show export buttons
        exportExcelBtn.style.display = '';
        exportHtmlBtn.style.display = '';

        // Build table with natural text wrapping (no expand/collapse)
        resultsBody.innerHTML = items.map((item, index) => {
            // Purchase description preserves native line breaks
            const purDesc = item.purchaseDescription || '';

            return `
            <tr>
                <td class="numeric">${item.qty}</td>
                <td>${item.partNumber}</td>
                <td>${item.componentType}</td>
                <td class="description">${item.description}</td>
                <td class="numeric">${item.lengthDecimal !== null ? item.lengthDecimal : ''}</td>
                <td>${item.lengthFractional}</td>
                <td>${item.uofm}</td>
                <td class="purchase-desc">${purDesc}</td>
                <td>${item.state}</td>
                <td>${item.revision}</td>
                <td>${item.nsItemType}</td>
            </tr>
        `}).join('');

        // Show results
        results.classList.add('show');
        results.scrollIntoView({ behavior: 'smooth' });
    }

    // Export to Excel
    exportExcelBtn.addEventListener('click', () => {
        if (!state.flattenedBOM) return;
        exportFlatBomExcel(state.flattenedBOM, state.uploadedFilename, getRootPartNumber(), getRootRevision());
    });

    // Export to HTML
    exportHtmlBtn.addEventListener('click', () => {
        if (!state.flattenedBOM) return;
        const unitQty = parseInt(unitQtyInput.value);
        exportFlatBomHtml(state.flattenedBOM, state.uploadedFilename, getRootPartNumber(), getRootRevision(), getRootDescription(), unitQty);
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        state.csvData = null;
        state.flattenedBOM = null;
        state.treeRoot = null;
        resetRootInfo();
        state.uploadedFilename = null;
        fileInput.value = '';
        uploadZone.classList.remove('has-file');
        fileInfo.classList.remove('show');
        flattenBtn.disabled = true;
        results.classList.remove('show');
        message.classList.remove('show');
        unitQtyInput.value = 1;
        exportExcelBtn.style.display = 'none';
        exportHtmlBtn.style.display = 'none';
    });

    // Show message helper
    function showMessage(text, type) {
        message.textContent = text;
        message.className = `message ${type} show`;
        setTimeout(() => {
            message.classList.remove('show');
        }, 5000);
    }
}
