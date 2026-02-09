// flat-bom.js - Flat BOM tab UI logic
// Extracted from index.html as part of Phase 6 UI module extraction

import { state } from './state.js';
import { parseXML } from '../core/parser.js';
import { buildTree, getRootPartNumber, getRootRevision, getRootDescription, resetRootInfo } from '../core/tree.js';
import { flattenBOM, sortBOM } from '../core/flatten.js';
import { parseLength, decimalToFractional } from '../core/utils.js';
import { exportFlatBomExcel } from '../export/excel.js';

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
        const today = new Date();
        const dateStr = today.getFullYear() +
                      String(today.getMonth() + 1).padStart(2, '0') +
                      String(today.getDate()).padStart(2, '0');

        // Format date as YYYY-MM-DD HH:MM:SS
        const generatedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

        // Calculate component breakdown
        const counts = { 'Manufactured': 0, 'Purchased': 0, 'Raw Stock': 0 };
        state.flattenedBOM.forEach(item => {
            if (counts.hasOwnProperty(item.componentType)) {
                counts[item.componentType]++;
            }
        });

        // Build breakdown HTML
        let breakdownHTML = '';
        if (counts['Manufactured'] > 0) {
            breakdownHTML += `
                <div style="text-align: center;">
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 600; color: #0f172a;">${counts['Manufactured']}</div>
                    <div style="color: #64748b; margin-top: 0.125rem; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.65rem;">Manufactured</div>
                </div>`;
        }
        if (counts['Purchased'] > 0) {
            breakdownHTML += `
                <div style="text-align: center;">
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 600; color: #0f172a;">${counts['Purchased']}</div>
                    <div style="color: #64748b; margin-top: 0.125rem; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.65rem;">Purchased</div>
                </div>`;
        }
        if (counts['Raw Stock'] > 0) {
            breakdownHTML += `
                <div style="text-align: center;">
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 600; color: #0f172a;">${counts['Raw Stock']}</div>
                    <div style="color: #64748b; margin-top: 0.125rem; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.65rem;">Raw Stock</div>
                </div>`;
        }

        // Create HTML report
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Flat BOM - ${getRootPartNumber()} Rev${getRootRevision()}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #fafafa;
            background-image:
                linear-gradient(rgba(200, 200, 200, 0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(200, 200, 200, 0.15) 1px, transparent 1px);
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
        .subtitle {
            color: #475569;
            font-size: 0.875rem;
        }
        .assembly-info {
            background: #f1f5f9;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            border-left: 4px solid #1e40af;
        }
        .assembly-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .assembly-part {
            font-size: 1.25rem;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 0.25rem;
        }
        .assembly-desc {
            font-size: 0.875rem;
            color: #334155;
        }
        .assembly-rev {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #64748b;
            margin-top: 0.5rem;
        }
        .stats-section {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            margin-bottom: 2rem;
        }
        .stats-grid {
            display: flex;
            gap: 2rem;
            align-items: center;
        }
        .stat-main {
            flex-shrink: 0;
            text-align: center;
        }
        .stat-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 3rem;
            font-weight: 700;
            color: #1e40af;
            line-height: 1;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.5rem;
        }
        .breakdown {
            border-left: 2px solid #cbd5e1;
            padding-left: 2rem;
            display: flex;
            gap: 2rem;
            flex: 1;
        }
        .table-container {
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            overflow-x: auto;
            overflow-y: visible;
        }
        table {
            width: max-content;
            min-width: 100%;
            border-collapse: collapse;
        }
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
        tr:hover {
            background: #f8fafc;
        }
        .numeric {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
        }
        .description {
            max-width: 400px;
            white-space: normal;
            word-wrap: break-word;
        }
        .purchase-desc {
            max-width: 300px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        @media print {
            body { background: white; }
            .stats-section, .table-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Flat BOM</h1>
            <div class="subtitle">Generated: ${generatedDate}</div>
        </div>

        <div class="assembly-info">
            <div class="assembly-label">Assembly</div>
            <div class="assembly-part">${state.uploadedFilename || 'N/A'}</div>
            <div class="assembly-desc">${getRootPartNumber()} - ${getRootDescription() || ''}</div>
            <div class="assembly-rev">Revision: ${getRootRevision()}</div>
        </div>

        <div class="stats-section">
            <div class="stats-grid">
                <div class="stat-main">
                    <div class="stat-value">${state.flattenedBOM.length}</div>
                    <div class="stat-label">Unique Items</div>
                </div>
                ${breakdownHTML ? `<div class="breakdown">${breakdownHTML}</div>` : ''}
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Qty</th>
                        <th>Part Number</th>
                        <th>Component Type</th>
                        <th>Description</th>
                        <th>Length (Decimal)</th>
                        <th>Length (Fractional)</th>
                        <th>UofM</th>
                        <th>Purchase Description</th>
                        <th>State</th>
                        <th>Revision</th>
                        <th>NS Item Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.flattenedBOM.map(item => `
                        <tr>
                            <td class="numeric">${item.qty}</td>
                            <td>${item.partNumber}</td>
                            <td>${item.componentType}</td>
                            <td class="description">${item.description}</td>
                            <td class="numeric">${item.lengthDecimal !== null ? item.lengthDecimal : ''}</td>
                            <td>${item.lengthFractional}</td>
                            <td>${item.uofm}</td>
                            <td class="purchase-desc">${item.purchaseDescription ? item.purchaseDescription.replace(/\n/g, '<br>') : ''}</td>
                            <td>${item.state}</td>
                            <td>${item.revision}</td>
                            <td>${item.nsItemType}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
        `;

        // Generate filename using uploaded filename
        const baseFilename = state.uploadedFilename
            ? state.uploadedFilename.replace(/\.(csv|xml)$/i, '')
            : `${getRootPartNumber()}-Rev${getRootRevision()}`;
        const filename = `${baseFilename}-Flat BOM-${dateStr}.html`;

        // Download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
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
