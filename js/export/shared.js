// shared.js - Common export utilities
// Shared functions used by both Excel and HTML exports
// Extracted from UI modules as part of Phase 7 export extraction

/**
 * Format date as YYYYMMDD string
 * @returns {string} Date string in YYYYMMDD format
 */
export function formatDateString() {
    const today = new Date();
    return today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');
}

/**
 * Format date as "YYYY-MM-DD HH:MM:SS" string
 * @returns {string} Date string in YYYY-MM-DD HH:MM:SS format
 */
export function formatGeneratedDate() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;
}

/**
 * Create download filename for Flat BOM and Hierarchy exports
 * @param {string|null} uploadedFilename - Original uploaded filename (optional)
 * @param {string} rootPartNumber - Root assembly part number
 * @param {string} rootRevision - Root assembly revision
 * @param {string} reportType - Report type (e.g., 'Flat BOM', 'Hierarchy')
 * @param {string} dateStr - Date string in YYYYMMDD format
 * @param {string} extension - File extension (without dot)
 * @returns {string} Generated filename
 */
export function createDownloadFilename(uploadedFilename, rootPartNumber, rootRevision, reportType, dateStr, extension) {
    const baseFilename = uploadedFilename
        ? uploadedFilename.replace(/\.(csv|xml)$/i, '')
        : `${rootPartNumber}-Rev${rootRevision}`;
    return `${baseFilename}-${reportType}-${dateStr}.${extension}`;
}

/**
 * Create comparison filename for Comparison tab exports
 * @param {string|null} oldFilename - Old BOM filename (optional)
 * @param {object} oldInfo - Old BOM info with partNumber and revision
 * @param {string|null} newFilename - New BOM filename (optional)
 * @param {object} newInfo - New BOM info with partNumber and revision
 * @param {string} dateStr - Date string in YYYYMMDD format
 * @param {string} extension - File extension (without dot)
 * @returns {string} Generated comparison filename
 */
export function createComparisonFilename(oldFilename, oldInfo, newFilename, newInfo, dateStr, extension) {
    const oldBase = oldFilename
        ? oldFilename.replace(/\.(csv|xml)$/i, '')
        : `${oldInfo.partNumber}-Rev${oldInfo.revision}`;
    const newBase = newFilename
        ? newFilename.replace(/\.(csv|xml)$/i, '')
        : `${newInfo.partNumber}-Rev${newInfo.revision}`;
    return `${oldBase}-vs-${newBase}-Comparison-${dateStr}.${extension}`;
}

/**
 * Download HTML content as a file using Blob API
 * @param {string} htmlContent - HTML content to download
 * @param {string} filename - Filename for download
 */
export function downloadHtmlFile(htmlContent, filename) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
