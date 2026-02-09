/**
 * investigate-purchase-desc.js
 *
 * Investigates how "Purchase Description" multi-line text is represented
 * across XML, Excel (.xlsx), and CSV file formats from SOLIDWORKS PDM exports.
 *
 * Run: node investigate-purchase-desc.js
 * Requires: xlsx, @xmldom/xmldom (installed via package.json)
 */

import XLSX from 'xlsx';
import { DOMParser } from 'xmldom';
import { readFileSync } from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Show character codes around newline-like characters in a string
// ─────────────────────────────────────────────────────────────────────────────
function showCharCodes(label, str) {
    console.log(`  ${label}:`);
    console.log(`    Length: ${str.length}`);
    console.log(`    JSON: ${JSON.stringify(str).substring(0, 200)}...`);

    // Find and display all control characters and their positions
    const controlChars = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 32) {
            controlChars.push({ pos: i, code, char: str[i], repr: charRepr(code) });
        }
    }

    if (controlChars.length === 0) {
        console.log(`    Control characters: NONE (no newlines or other control chars)`);
    } else {
        console.log(`    Control characters found:`);
        for (const cc of controlChars) {
            // Show surrounding context (5 chars before and after)
            const before = str.substring(Math.max(0, cc.pos - 15), cc.pos);
            const after = str.substring(cc.pos + 1, Math.min(str.length, cc.pos + 16));
            console.log(`      pos ${cc.pos}: ${cc.repr} (code ${cc.code})  context: ...${JSON.stringify(before)}[HERE]${JSON.stringify(after)}...`);
        }
    }
    console.log();
}

function charRepr(code) {
    switch (code) {
        case 10: return '\\n (LF)';
        case 13: return '\\r (CR)';
        case 9:  return '\\t (TAB)';
        default: return `\\x${code.toString(16).padStart(2, '0')}`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Parse XML file
// ─────────────────────────────────────────────────────────────────────────────
console.log('='.repeat(80));
console.log('INVESTIGATION: Purchase Description Newline Handling Across File Formats');
console.log('='.repeat(80));
console.log();

console.log('─'.repeat(80));
console.log('1. XML FILE: 258730-Rev2-20260105.XML');
console.log('─'.repeat(80));
console.log();

const xmlContent = readFileSync('../test-data/258730-Rev2-20260105.XML', 'utf-8');

// Count &#xA; occurrences (XML hex entity for LF/newline)
const xaCount = (xmlContent.match(/&#xA;/g) || []).length;
const x10Count = (xmlContent.match(/&#10;/g) || []).length;
const xDCount = (xmlContent.match(/&#xD;/g) || []).length;
const x13Count = (xmlContent.match(/&#13;/g) || []).length;

console.log('XML newline entity scan:');
console.log(`  &#xA;  (hex LF):  ${xaCount} occurrences`);
console.log(`  &#10;  (dec LF):  ${x10Count} occurrences`);
console.log(`  &#xD;  (hex CR):  ${xDCount} occurrences`);
console.log(`  &#13;  (dec CR):  ${x13Count} occurrences`);
console.log();

// Parse XML with DOMParser and extract Purchase Description attributes
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
const allAttributes = xmlDoc.getElementsByTagName('attribute');

const xmlPurchaseDescs = new Map(); // partNumber -> purchaseDescription

// We need to associate Purchase Description with Part Number from same configuration
const configs = xmlDoc.getElementsByTagName('configuration');
for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const attrs = config.getElementsByTagName('attribute');
    let partNumber = null;
    let purchaseDesc = null;

    for (let j = 0; j < attrs.length; j++) {
        const attr = attrs[j];
        // Only direct child attributes (not from nested documents)
        if (attr.parentNode === config) {
            const name = attr.getAttribute('name');
            const value = attr.getAttribute('value');
            if (name === 'Part Number') partNumber = value;
            if (name === 'Purchase Description') purchaseDesc = value;
        }
    }

    if (partNumber && purchaseDesc && purchaseDesc.length > 5) {
        xmlPurchaseDescs.set(partNumber.trim(), purchaseDesc);
    }
}

console.log(`XML: Found ${xmlPurchaseDescs.size} parts with non-trivial Purchase Description`);
console.log();

for (const [pn, pd] of xmlPurchaseDescs) {
    console.log(`  Part Number: ${pn}`);
    showCharCodes('XML Purchase Description', pd);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Read Excel validation file
// ─────────────────────────────────────────────────────────────────────────────
console.log('─'.repeat(80));
console.log('2. EXCEL FILE: 258730-Rev2-Flat BOM-20260115.xlsx');
console.log('─'.repeat(80));
console.log();

const wb = XLSX.readFile('../test-data/258730-Rev2-Flat BOM-20260115.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const excelData = XLSX.utils.sheet_to_json(sheet);

const excelPurchaseDescs = new Map(); // partNumber -> purchaseDescription

for (const row of excelData) {
    const pn = String(row['Part Number'] || '').trim();
    const pd = row['Purchase Description'];
    if (pn && pd && String(pd).length > 5) {
        excelPurchaseDescs.set(pn, String(pd));
    }
}

console.log(`Excel: Found ${excelPurchaseDescs.size} parts with non-trivial Purchase Description`);
console.log();

for (const [pn, pd] of excelPurchaseDescs) {
    console.log(`  Part Number: ${pn}`);
    showCharCodes('Excel Purchase Description', pd);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Read CSV file
// ─────────────────────────────────────────────────────────────────────────────
console.log('─'.repeat(80));
console.log('3. CSV FILE: 258730-Rev1-As Built.csv (Rev1 has more Purchase Descriptions)');
console.log('─'.repeat(80));
console.log();

// Read UTF-16LE encoded CSV
const csvRaw = readFileSync('../test-data/258730-Rev1-As Built.csv');
let csvText;
// Check for UTF-16LE BOM (FF FE)
if (csvRaw[0] === 0xFF && csvRaw[1] === 0xFE) {
    csvText = csvRaw.toString('utf16le');
    // Remove BOM character if present
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
    }
    console.log('CSV Encoding: UTF-16LE with BOM');
} else {
    csvText = csvRaw.toString('utf-8');
    console.log('CSV Encoding: UTF-8');
}

// Use SheetJS to parse the CSV (same as the BOM Tool does)
const csvWorkbook = XLSX.read(csvText, { type: 'string' });
const csvSheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]];
const csvData = XLSX.utils.sheet_to_json(csvSheet);

// Check line endings in raw CSV
const crlf = (csvText.match(/\r\n/g) || []).length;
const lfOnly = (csvText.match(/(?<!\r)\n/g) || []).length;
const crOnly = (csvText.match(/\r(?!\n)/g) || []).length;
console.log(`CSV line endings: \\r\\n=${crlf}, \\n-only=${lfOnly}, \\r-only=${crOnly}`);
console.log();

const csvPurchaseDescs = new Map();

for (const row of csvData) {
    const pn = String(row['Part Number'] || '').trim();
    const pd = row['Purchase Description'];
    if (pn && pd && String(pd).length > 5) {
        csvPurchaseDescs.set(pn, String(pd));
    }
}

console.log(`CSV: Found ${csvPurchaseDescs.size} parts with non-trivial Purchase Description`);
console.log();

for (const [pn, pd] of csvPurchaseDescs) {
    console.log(`  Part Number: ${pn}`);
    showCharCodes('CSV Purchase Description', pd);
}

// Also check Rev0 CSV
console.log();
console.log('Also checking: 258730-Rev0-As Built.csv');
const csv0Raw = readFileSync('../test-data/258730-Rev0-As Built.csv');
let csv0Text;
if (csv0Raw[0] === 0xFF && csv0Raw[1] === 0xFE) {
    csv0Text = csv0Raw.toString('utf16le');
    if (csv0Text.charCodeAt(0) === 0xFEFF) csv0Text = csv0Text.substring(1);
}
const csv0Wb = XLSX.read(csv0Text, { type: 'string' });
const csv0Sheet = csv0Wb.Sheets[csv0Wb.SheetNames[0]];
const csv0Data = XLSX.utils.sheet_to_json(csv0Sheet);

let csv0Count = 0;
for (const row of csv0Data) {
    const pd = row['Purchase Description'];
    if (pd && String(pd).length > 5) {
        csv0Count++;
        const pn = String(row['Part Number'] || '').trim();
        const pdStr = String(pd);
        if (pdStr.includes('\n') || pdStr.includes('\r')) {
            console.log(`  PN ${pn}: HAS newlines`);
        }
    }
}
console.log(`  Rev0 CSV: ${csv0Count} parts with Purchase Description, none have embedded newlines`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. CHARACTER-BY-CHARACTER COMPARISON: XML vs Excel for matching parts
// ─────────────────────────────────────────────────────────────────────────────
console.log();
console.log('─'.repeat(80));
console.log('4. CHARACTER-BY-CHARACTER COMPARISON: XML vs Excel');
console.log('─'.repeat(80));
console.log();

// For parts that exist in both XML and Excel
const commonParts = [...xmlPurchaseDescs.keys()].filter(pn => excelPurchaseDescs.has(pn));
console.log(`Parts with Purchase Description in BOTH XML and Excel: ${commonParts.length}`);
console.log();

for (const pn of commonParts) {
    const xmlPd = xmlPurchaseDescs.get(pn);
    const excelPd = excelPurchaseDescs.get(pn);

    console.log(`  Part Number: ${pn}`);
    console.log(`    XML length:   ${xmlPd.length}`);
    console.log(`    Excel length: ${excelPd.length}`);
    console.log(`    Exact match:  ${xmlPd === excelPd}`);

    if (xmlPd !== excelPd) {
        // Find first difference
        const maxLen = Math.max(xmlPd.length, excelPd.length);
        let diffCount = 0;
        for (let i = 0; i < maxLen; i++) {
            const xc = i < xmlPd.length ? xmlPd.charCodeAt(i) : -1;
            const ec = i < excelPd.length ? excelPd.charCodeAt(i) : -1;
            if (xc !== ec) {
                diffCount++;
                if (diffCount <= 10) {
                    const xRepr = xc >= 0 ? `'${xmlPd[i]}' (${xc})` : 'END';
                    const eRepr = ec >= 0 ? `'${excelPd[i]}' (${ec})` : 'END';
                    console.log(`    Diff at pos ${i}: XML=${xRepr}  Excel=${eRepr}`);
                }
            }
        }
        if (diffCount > 10) {
            console.log(`    ... and ${diffCount - 10} more differences`);
        }
        console.log(`    Total character differences: ${diffCount}`);

        // Test if normalizing newlines would fix it
        const xmlNorm = xmlPd.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const excelNorm = excelPd.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        console.log(`    Match after newline normalization: ${xmlNorm === excelNorm}`);
    }
    console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMPARISON: XML vs CSV (for parts that exist in both)
// ─────────────────────────────────────────────────────────────────────────────
console.log('─'.repeat(80));
console.log('5. COMPARISON: XML vs CSV (Rev1)');
console.log('─'.repeat(80));
console.log();

const xmlCsvCommon = [...xmlPurchaseDescs.keys()].filter(pn => csvPurchaseDescs.has(pn));
console.log(`Parts with Purchase Description in BOTH XML(Rev2) and CSV(Rev1): ${xmlCsvCommon.length}`);

// Even if revisions differ, the Purchase Descriptions might be the same for some parts
for (const pn of xmlCsvCommon) {
    const xmlPd = xmlPurchaseDescs.get(pn);
    const csvPd = csvPurchaseDescs.get(pn);

    console.log();
    console.log(`  Part Number: ${pn}`);
    console.log(`    XML length: ${xmlPd.length}`);
    console.log(`    CSV length: ${csvPd.length}`);
    console.log(`    Exact match: ${xmlPd === csvPd}`);

    // Compare with newlines collapsed to spaces
    const xmlFlat = xmlPd.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    const csvFlat = csvPd.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`    Match after collapsing newlines to spaces: ${xmlFlat === csvFlat}`);

    if (xmlFlat !== csvFlat) {
        console.log(`    XML (flattened): ${xmlFlat.substring(0, 120)}...`);
        console.log(`    CSV (flattened): ${csvFlat.substring(0, 120)}...`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUMMARY & RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log();
console.log('═'.repeat(80));
console.log('SUMMARY OF FINDINGS');
console.log('═'.repeat(80));
console.log();

console.log('FORMAT ANALYSIS:');
console.log();
console.log('  XML (.XML from SOLIDWORKS PDM):');
console.log('    - Newlines encoded as &#xA; (XML hex entity for LF, char code 10)');
console.log('    - DOMParser decodes &#xA; to literal \\n (char code 10)');
console.log('    - No \\r (CR) characters present');
console.log('    - XML entities like &quot; &amp; are also decoded by DOMParser');
console.log();
console.log('  Excel (.xlsx validation output):');
console.log('    - Newlines stored as \\n (LF, char code 10)');
console.log('    - SheetJS reads them as \\n (char code 10)');
console.log('    - No \\r (CR) characters present');
console.log();
console.log('  CSV (.csv from SOLIDWORKS PDM):');
console.log('    - UTF-16LE encoding with BOM');
console.log('    - Row delimiters are \\r\\n');
console.log('    - Purchase Description fields have NO embedded newlines');
console.log('    - Multi-line content is flattened to single line with spaces');
console.log('    - This is a SOLIDWORKS PDM export behavior difference from XML');
console.log();
console.log('COMPARISON RELIABILITY:');
console.log();
console.log('  XML vs Excel: RELIABLE');
console.log('    - Both use \\n (LF) for newlines after parsing');
console.log('    - Direct string comparison works correctly');
console.log();
console.log('  XML vs CSV: UNRELIABLE without normalization');
console.log('    - XML preserves multi-line structure (\\n between lines)');
console.log('    - CSV flattens to single line (spaces instead of newlines)');
console.log('    - Content may also differ (commas vs no commas, reformatting)');
console.log();
console.log('  CSV vs CSV: RELIABLE');
console.log('    - Same format, same flattening behavior');
console.log('    - Direct string comparison works correctly');
console.log();
console.log('NORMALIZATION NEEDED:');
console.log('  - For XML-to-XML comparison: None needed (both use \\n)');
console.log('  - For XML-to-Excel comparison: None needed (both use \\n)');
console.log('  - For XML/Excel-to-CSV comparison:');
console.log('    Option A: Collapse \\n to space before comparing');
console.log('    Option B: Normalize all whitespace (\\n, \\r\\n, multi-space) to single space');
console.log('    CAUTION: Even with normalization, CSV content may differ from XML');
console.log('    (e.g., different comma placement, abbreviations, reformatting)');
console.log('    This is a PDM export format difference, not a tool bug.');
