// excel.js - Excel export functions for all three tabs
// Extracted from UI modules as part of Phase 7 export extraction

import { formatDateString, createDownloadFilename, createComparisonFilename } from './shared.js';
import { decimalToFractional } from '../core/utils.js';

/**
 * Export Flat BOM to Excel
 * @param {Array} flattenedBOM - Flattened BOM data
 * @param {string|null} uploadedFilename - Original uploaded filename
 * @param {string} rootPartNumber - Root assembly part number
 * @param {string} rootRevision - Root assembly revision
 */
export function exportFlatBomExcel(flattenedBOM, uploadedFilename, rootPartNumber, rootRevision) {
    // Prepare data for Excel with new column order
    const excelData = flattenedBOM.map(item => ({
        'Qty': item.qty,
        'Part Number': item.partNumber,
        'Component Type': item.componentType,
        'Description': item.description,
        'Length (Decimal)': item.lengthDecimal !== null ? item.lengthDecimal : '',
        'Length (Fractional)': item.lengthFractional,
        'UofM': item.uofm,
        'Purchase Description': item.purchaseDescription || '',
        'State': item.state,
        'Revision': item.revision,
        'NS Item Type': item.nsItemType
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Flat BOM');

    // Generate filename
    const dateStr = formatDateString();
    const filename = createDownloadFilename(uploadedFilename, rootPartNumber, rootRevision, 'Flat BOM', dateStr, 'xlsx');

    // Download
    XLSX.writeFile(wb, filename);
}

/**
 * Export Comparison to Excel
 * @param {Array} comparisonResults - Comparison results data
 * @param {Function} sortFn - Sort function for comparison results
 * @param {string|null} oldBomFilename - Old BOM filename
 * @param {object} oldBomInfo - Old BOM info (partNumber, revision, description, isScoped, scopedPartNumber)
 * @param {string|null} newBomFilename - New BOM filename
 * @param {object} newBomInfo - New BOM info (partNumber, revision, description, isScoped, scopedPartNumber)
 */
export function exportComparisonExcel(comparisonResults, sortFn, oldBomFilename, oldBomInfo, newBomFilename, newBomInfo) {
    const dateStr = formatDateString();
    const filename = createComparisonFilename(oldBomFilename, oldBomInfo, newBomFilename, newBomInfo, dateStr, 'xlsx');

    // Build scope info for header
    const oldScopeText = oldBomInfo.isScoped ? `Scope: ${oldBomInfo.scopedPartNumber}` : 'Full Assembly';
    const newScopeText = newBomInfo.isScoped ? `Scope: ${newBomInfo.scopedPartNumber}` : 'Full Assembly';

    const ws_data = [
        ['Old BOM:', oldBomFilename || 'N/A', `${oldBomInfo.partNumber} - ${oldBomInfo.description}`, `Rev ${oldBomInfo.revision}`, oldScopeText],
        ['New BOM:', newBomFilename || 'N/A', `${newBomInfo.partNumber} - ${newBomInfo.description}`, `Rev ${newBomInfo.revision}`, newScopeText],
        [],
        ['Change Type', 'Part Number', 'Component Type', 'Old Description', 'New Description', 'Length (Decimal)', 'Length (Fractional)', 'Old Qty', 'New Qty', 'Δ Qty', 'Old Purchase Description', 'New Purchase Description', 'Attributes Changed']
    ];

    const sorted = sortFn(comparisonResults);

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
}

/**
 * Export Hierarchy to Excel
 * @param {object} hierarchyTree - Hierarchy tree root node
 * @param {string|null} hierarchyFilename - Original uploaded filename
 * @param {object} hierarchyRootInfo - Root info (partNumber, revision, description)
 * @param {number} unitQty - Unit quantity multiplier
 */
export function exportHierarchyExcel(hierarchyTree, hierarchyFilename, hierarchyRootInfo, unitQty) {
    const dateStr = formatDateString();
    const filename = createDownloadFilename(hierarchyFilename, hierarchyRootInfo.partNumber, hierarchyRootInfo.revision, 'Hierarchy', dateStr, 'xlsx');

    // Flatten tree to rows with Level column
    const rows = [];
    function traverseForExport(node, parentLevel = '', childIndex = 1) {
        const level = parentLevel ? `${parentLevel}.${childIndex}` : String(childIndex);
        rows.push({
            'Level': level,
            'Part Number': node.partNumber,
            'Qty': node.qty * unitQty,
            'Component Type': node.componentType,
            'Description': node.description,
            'Length (Decimal)': node.length !== null ? node.length : '',
            'Length (Fractional)': node.length !== null ? decimalToFractional(node.length) : '',
            'UofM': node.uofm || '',
            'Purchase Description': node.purchaseDescription || '',
            'Revision': node.revision || '',
            'NS Item Type': node.nsItemType || ''
        });
        node.children.forEach((child, idx) => {
            traverseForExport(child, level, idx + 1);
        });
    }
    traverseForExport(hierarchyTree, '', 1);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hierarchy');

    XLSX.writeFile(wb, filename);
}
