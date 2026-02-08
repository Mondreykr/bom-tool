// parser.js - XML and CSV file parsing

import { DOMParser, XLSX, isNode } from './environment.js';

// Parse XML to array of row objects
export function parseXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new Error('Invalid XML format');
    }

    const rows = [];

    const transaction = xmlDoc.getElementsByTagName('transaction')[0];
    if (!transaction) {
        throw new Error('No transaction element found');
    }

    const rootDoc = transaction.getElementsByTagName('document')[0];
    if (!rootDoc) {
        throw new Error('No root document found in XML');
    }

    // Recursive function to traverse XML hierarchy
    function traverseDocument(docElement, level, startIndex, isRoot = false) {
        const configs = docElement.getElementsByTagName('configuration');
        if (configs.length === 0) {
            return startIndex;
        }

        let childIndex = startIndex;

        // Process each configuration
        for (let configIdx = 0; configIdx < configs.length; configIdx++) {
            const config = configs[configIdx];

            // Skip nested configurations (only direct children)
            if (config.parentNode !== docElement) continue;

            const currentLevel = isRoot && configIdx === 0 ? level : level + '.' + childIndex;

            // Extract attributes
            const attributes = {};
            const attrs = config.getElementsByTagName('attribute');
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (attr.parentNode === config) {
                    const name = attr.getAttribute('name');
                    const value = attr.getAttribute('value');
                    attributes[name] = value;
                }
            }

            // Create row object
            const row = {
                'Level': currentLevel,
                'Part Number': attributes['Part Number'] || '',
                'Component Type': attributes['Component-Type'] || '',
                'Description': attributes['Description'] || '',
                'Material': attributes['Material'] || '',
                'Qty': attributes['Reference Count (BOM Quantity disregarded)'] || '1',
                'Length': attributes['Length'] || '',
                'UofM': attributes['Unit of Measure'] || '',
                'State': attributes['State'] || '',
                'Purchase Description': attributes['Purchase Description'] || '',
                'NS Item Type': attributes['NS Item Type'] || '',
                'Revision': attributes['Revision'] || ''
            };

            rows.push(row);

            if (!isRoot || configIdx > 0) {
                childIndex++;
            }

            // Process children (references)
            const references = config.getElementsByTagName('references');
            if (references.length > 0 && references[0].parentNode === config) {
                const childDocs = references[0].getElementsByTagName('document');
                for (let i = 0; i < childDocs.length; i++) {
                    if (childDocs[i].parentNode === references[0]) {
                        childIndex = traverseDocument(childDocs[i], currentLevel, childIndex, false);
                    }
                }
            }
        }

        return childIndex;
    }

    traverseDocument(rootDoc, '1', 1, true);

    return rows;
}

// Parse CSV file or text
export async function parseCSV(csvTextOrPath) {
    let csvText;

    // Determine if input is a file path or text content
    if (isNode && typeof csvTextOrPath === 'string' && (csvTextOrPath.includes('/') || csvTextOrPath.includes('\\'))) {
        // Node.js: read from file path
        const fs = await import('fs');
        const buffer = fs.readFileSync(csvTextOrPath);

        // Try UTF-16LE decoding
        try {
            csvText = buffer.toString('utf16le');
            // Remove BOM if present
            if (csvText.charCodeAt(0) === 0xFEFF) {
                csvText = csvText.substring(1);
            }
        } catch (e) {
            // Fallback to UTF-8
            csvText = buffer.toString('utf8');
        }
    } else {
        // Browser or text content directly
        csvText = csvTextOrPath;
    }

    // Use XLSX to parse CSV
    const workbook = XLSX.read(csvText, {
        type: 'string',
        raw: true,
        cellText: true,
        cellDates: false
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: ''
    });

    return data;
}
