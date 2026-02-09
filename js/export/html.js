// html.js - HTML export functions for all three tabs
// Extracted from UI modules as part of Phase 7 export extraction

import { formatDateString, formatGeneratedDate, createDownloadFilename, createComparisonFilename, downloadHtmlFile } from './shared.js';
import { createDiff, decimalToFractional } from '../core/utils.js';

/**
 * Export Flat BOM as HTML report
 * Extracted verbatim from flat-bom.js lines 268-563
 */
export function exportFlatBomHtml(flattenedBOM, uploadedFilename, rootPartNumber, rootRevision, rootDescription, unitQty) {
    const dateStr = formatDateString();
    const generatedDate = formatGeneratedDate();

    // Calculate component breakdown
    const counts = { 'Manufactured': 0, 'Purchased': 0, 'Raw Stock': 0 };
    flattenedBOM.forEach(item => {
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
    <title>Flat BOM - ${rootPartNumber} Rev${rootRevision}</title>
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
            <div class="assembly-part">${uploadedFilename || 'N/A'}</div>
            <div class="assembly-desc">${rootPartNumber} - ${rootDescription || ''}</div>
            <div class="assembly-rev">Revision: ${rootRevision}</div>
        </div>

        <div class="stats-section">
            <div class="stats-grid">
                <div class="stat-main">
                    <div class="stat-value">${flattenedBOM.length}</div>
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
                    ${flattenedBOM.map(item => `
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

    // Generate filename
    const filename = createDownloadFilename(uploadedFilename, rootPartNumber, rootRevision, 'Flat BOM', dateStr, 'html');

    // Download
    downloadHtmlFile(html, filename);
}

/**
 * Export Comparison as HTML report
 * Extracted verbatim from comparison.js lines 633-953
 */
export function exportComparisonHtml(comparisonResults, sortFn, oldBomFilename, oldBomInfo, newBomFilename, newBomInfo) {
    const dateStr = formatDateString();
    const generatedDate = formatGeneratedDate();

    const added = comparisonResults.filter(r => r.changeType === 'Added').length;
    const removed = comparisonResults.filter(r => r.changeType === 'Removed').length;
    const changed = comparisonResults.filter(r => r.changeType === 'Changed').length;

    const sorted = sortFn(comparisonResults);

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
    <title>BOM Comparison - ${oldBomInfo.partNumber} vs ${newBomInfo.partNumber}</title>
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
                <div class="assembly-value">${oldBomFilename || 'N/A'}</div>
                <div class="assembly-label" style="margin-top: 0.5rem;">${oldBomInfo.partNumber} - ${oldBomInfo.description}</div>
                <div class="assembly-label" style="margin-top: 0.25rem;">Revision: ${oldBomInfo.revision || '-'} | Scope: ${oldBomInfo.isScoped ? oldBomInfo.scopedPartNumber : 'Full Assembly'}</div>
            </div>
            <div class="assembly-card new">
                <div class="assembly-label">New BOM</div>
                <div class="assembly-value">${newBomFilename || 'N/A'}</div>
                <div class="assembly-label" style="margin-top: 0.5rem;">${newBomInfo.partNumber} - ${newBomInfo.description}</div>
                <div class="assembly-label" style="margin-top: 0.25rem;">Revision: ${newBomInfo.revision || '-'} | Scope: ${newBomInfo.isScoped ? newBomInfo.scopedPartNumber : 'Full Assembly'}</div>
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

    const filename = createComparisonFilename(oldBomFilename, oldBomInfo, newBomFilename, newBomInfo, dateStr, 'html');
    downloadHtmlFile(html, filename);
}

/**
 * Export Hierarchy as HTML report with interactive tree
 * Extracted verbatim from hierarchy.js lines 422-820
 */
export function exportHierarchyHtml(hierarchyTree, hierarchyFilename, hierarchyRootInfo, unitQty) {
    const dateStr = formatDateString();
    const generatedDate = formatGeneratedDate();

    // Generate tree HTML with interactive toggles (table rows)
    function generateTreeHTML(node, depth = 0, isLastChild = false, ancestorContinues = [], uQty = 1) {
        // ancestorContinues[i] = true means ancestor at depth i has more siblings after this subtree

        const hasChildren = node.children.length > 0;
        const indent = depth * 24; // 24px per level
        const paddingLeft = 1 + indent / 16; // Convert to rem
        const baseIndent = 16; // 1rem in pixels

        // Build class list
        let classList = [];
        if (hasChildren) classList.push('has-children');

        const classAttr = classList.length > 0 ? ` class="${classList.join(' ')}"` : '';
        const dataAttrs = `data-level="${node.level}" data-depth="${depth}"`;

        // CSS variable for parent's downward vertical line positioning
        const styleVars = hasChildren ? `padding-left: ${paddingLeft}rem; --this-depth: ${depth};` : `padding-left: ${paddingLeft}rem;`;

        let html = `<tr${classAttr} ${dataAttrs}>
                <td class="tree-cell" style="${styleVars}">`;

        // Generate tree lines for non-root nodes
        if (depth > 0) {
            html += `<div class="tree-lines">`;

            // Vertical lines for ancestors that have more siblings (depths 0 to depth-2)
            for (let i = 0; i < depth - 1; i++) {
                if (ancestorContinues[i]) {
                    const leftPos = baseIndent + i * 24 + 7;
                    html += `<div class="tree-line-vertical" style="left: ${leftPos}px;"></div>`;
                }
            }

            // Vertical line for immediate parent (depth - 1)
            const parentLeftPos = baseIndent + (depth - 1) * 24 + 7;
            const lastChildClass = isLastChild ? ' last-child' : '';
            html += `<div class="tree-line-vertical${lastChildClass}" style="left: ${parentLeftPos}px;"></div>`;

            // Horizontal line from parent's vertical to this item
            const horizStart = baseIndent + (depth - 1) * 24 + 7;
            const horizEnd = baseIndent + depth * 24;
            html += `<div class="tree-line-horizontal" style="left: ${horizStart}px; width: ${horizEnd - horizStart}px;"></div>`;

            html += `</div>`;
        }

        if (hasChildren) {
            html += `<span class="tree-toggle collapsed" onclick="toggleNode(this)">+</span>`;
        } else {
            html += `<span style="display: inline-block; width: 14px; margin-right: 6px;"></span>`;
        }

        html += `${node.partNumber}</td>
                <td class="numeric">${node.qty * uQty}</td>
                <td>${node.componentType}</td>
                <td class="description">${node.description}</td>
                <td>${node.length !== null ? decimalToFractional(node.length) : ''}</td>
                <td>${node.uofm || ''}</td>
                <td class="purchase-desc">${node.purchaseDescription ? node.purchaseDescription.replace(/\n/g, '<br>') : ''}</td>
                <td>${node.revision || ''}</td>
                <td>${node.nsItemType || ''}</td>
            </tr>`;

        // Generate child rows
        if (hasChildren) {
            node.children.forEach((child, index) => {
                const isLast = index === node.children.length - 1;
                // Build new ancestorContinues for children: copy current and add whether THIS node has more siblings
                const childAncestorContinues = [...ancestorContinues, !isLastChild];
                const childHTML = generateTreeHTML(child, depth + 1, isLast, childAncestorContinues, uQty);
                // Add child-row and collapsed classes
                const childWithClasses = childHTML.replace(
                    /<tr([^>]*)(class="([^"]*)")?/,
                    (match, attrs, classAttr, existingClasses) => {
                        const classes = existingClasses ? `${existingClasses} child-row collapsed` : 'child-row collapsed';
                        const otherAttrs = attrs.replace(/class="[^"]*"/, '').trim();
                        return `<tr ${otherAttrs} class="${classes}" data-parent-level="${node.level}"`;
                    }
                );
                html += childWithClasses;
            });
        }

        return html;
    }

    const treeHTML = generateTreeHTML(hierarchyTree, 0, false, [], unitQty);

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BOM Hierarchy - ${hierarchyRootInfo.partNumber} Rev${hierarchyRootInfo.revision}</title>
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
        tr.child-row.collapsed {
            display: none;
        }
        /* Tree toggle styling */
        .tree-toggle {
            display: inline-block;
            width: 14px;
            height: 14px;
            line-height: 12px;
            text-align: center;
            border: 1px solid #cbd5e1;
            background: white;
            cursor: pointer;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 600;
            color: #52525b;
            user-select: none;
            margin-right: 6px;
            vertical-align: middle;
        }
        .tree-toggle:hover {
            border-color: #1e40af;
            color: #1e40af;
        }
        /* Tree lines */
        .tree-cell {
            position: relative;
        }
        .tree-lines {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            right: 0;
            pointer-events: none;
        }
        .tree-line-vertical {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: #d4d4d8;
        }
        .tree-line-vertical.last-child {
            bottom: 50%;
        }
        .tree-line-horizontal {
            position: absolute;
            top: 1.5rem;  /* Align with text baseline, not row center */
            height: 1px;
            background: #d4d4d8;
        }
        /* Vertical line extending down from expanded parent toggle to children */
        tr.has-children.expanded .tree-cell::before {
            content: '';
            position: absolute;
            left: calc(1rem + var(--this-depth, 0) * 24px + 7px);
            top: 1.5rem;  /* From toggle position */
            bottom: 0;    /* To bottom of row */
            width: 1px;
            background: #d4d4d8;
            z-index: 1;
        }
        @media print {
            body { background: white; }
            .table-container { box-shadow: none; }
        }
    </style>
    <script>
        function toggleNode(toggle) {
            const parentRow = toggle.closest('tr');
            const parentLevel = parentRow.dataset.level;
            const parentDepth = parseInt(parentRow.dataset.depth);
            const isCollapsed = toggle.classList.contains('collapsed');

            // Find all direct children (need to search through all descendants)
            let nextRow = parentRow.nextElementSibling;
            let childRows = [];

            // Keep iterating until we hit a row at the same depth or shallower
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
            childRows.forEach(childRow => {
                if (isCollapsed) {
                    // Expanding
                    childRow.classList.remove('collapsed');
                    toggle.textContent = '-';
                    toggle.classList.remove('collapsed');
                    toggle.classList.add('expanded');
                    parentRow.classList.add('expanded');  // Show parent's downward line
                } else {
                    // Collapsing
                    childRow.classList.add('collapsed');
                    const childToggle = childRow.querySelector('.tree-toggle');
                    if (childToggle && childToggle.classList.contains('expanded')) {
                        toggleNode(childToggle);
                    }
                    toggle.textContent = '+';
                    toggle.classList.remove('expanded');
                    toggle.classList.add('collapsed');
                    parentRow.classList.remove('expanded');  // Hide parent's downward line
                }
            });
        }
    <\/script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BOM Hierarchy</h1>
            <div class="subtitle">Generated: ${generatedDate}</div>
        </div>

        <div class="assembly-info">
            <div class="assembly-label">Assembly</div>
            <div class="assembly-part">${hierarchyFilename || 'N/A'}</div>
            <div class="assembly-desc">${hierarchyRootInfo.partNumber} - ${hierarchyRootInfo.description || ''}</div>
            <div class="assembly-rev">Revision: ${hierarchyRootInfo.revision} | Unit Qty: ${unitQty}</div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Part Number</th>
                        <th class="numeric">Qty</th>
                        <th>Component Type</th>
                        <th>Description</th>
                        <th>Length (Fractional)</th>
                        <th>UofM</th>
                        <th>Purchase Description</th>
                        <th>Revision</th>
                        <th>NS Item Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${treeHTML}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

    const filename = createDownloadFilename(hierarchyFilename, hierarchyRootInfo.partNumber, hierarchyRootInfo.revision, 'Hierarchy', dateStr, 'html');
    downloadHtmlFile(htmlContent, filename);
}
