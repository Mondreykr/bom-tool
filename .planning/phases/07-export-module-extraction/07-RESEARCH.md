# Phase 7: Export Module Extraction - Research

**Researched:** 2026-02-09
**Domain:** Export functionality - Excel (SheetJS) and HTML (static file generation)
**Confidence:** HIGH

## Summary

Phase 7 extracts export functionality from three UI modules (flat-bom.js, comparison.js, hierarchy.js) into two dedicated export modules. The codebase currently has 6 export button handlers (2 per tab: Excel + HTML) that duplicate date formatting, filename generation, and file download patterns. Each handler is inline, ranges from ~40 lines (Excel) to ~300 lines (HTML with embedded CSS), and directly depends on SheetJS (XLSX) and browser Blob API.

The primary challenge is maintaining exact output behavior - Excel exports are validated by automated tests against baseline control files, and HTML exports must render identically to current behavior. SheetJS is loaded via CDN script tag before modules execute, and the environment.js module already abstracts XLSX access for both browser and Node.js contexts.

**Primary recommendation:** Extract export logic into two modules (js/export/excel.js and js/export/html.js) with named export functions per tab type. UI modules will import and call these functions with data parameters. This maintains testability, eliminates duplication of date/filename/download patterns, and follows the established "init function pattern" from Phase 6.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SheetJS (xlsx.js) | 0.18.5 | Excel export | Industry standard for browser-based Excel generation. Used extensively in web apps for spreadsheet export. |
| Blob API | Native | File download | Browser standard for creating downloadable files from JavaScript. Works universally in modern browsers. |
| URL.createObjectURL | Native | Temporary download URLs | Browser standard for generating download links from Blobs. Memory-efficient with URL.revokeObjectURL cleanup. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| File System Access API | Native (Chrome 86+) | Direct file save dialog | Optional enhancement for Chromium browsers. Current codebase uses Blob download (broader compatibility). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SheetJS (CDN) | @e965/xlsx (npm) | Maintained npm fork vs. CDN. Project uses CDN to avoid build tools. |
| Blob + anchor click | saveAs library | FileSaver.js adds polyfills but project already has working Blob pattern. |
| Inline HTML templates | Template literals | Current approach (template literals) works well for static HTML generation. |

**Installation:**
```bash
# No installation needed - SheetJS loaded via CDN in index.html
# <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

## Architecture Patterns

### Recommended Project Structure
```
js/export/
├── excel.js         # Excel export functions (one per tab)
├── html.js          # HTML export functions (one per tab)
└── shared.js        # Common utilities (date formatting, filename generation, download)
```

### Pattern 1: Named Export Functions per Tab
**What:** Each export module exports specific functions per tab type (e.g., exportFlatBomExcel, exportComparisonExcel)
**When to use:** When different tabs require different data structures and column configurations
**Example:**
```javascript
// js/export/excel.js
import { XLSX } from '../core/environment.js';
import { formatDateString, createDownloadFilename } from './shared.js';

export function exportFlatBomExcel(flattenedBOM, uploadedFilename, rootInfo) {
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

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Flat BOM');

    const dateStr = formatDateString();
    const filename = createDownloadFilename(uploadedFilename, rootInfo, 'Flat BOM', dateStr, 'xlsx');

    XLSX.writeFile(wb, filename);
}
```

### Pattern 2: Data-Driven HTML Generation
**What:** HTML exports use template literals to embed data, styles, and structure in a single function
**When to use:** For static report generation where all content is known at export time
**Example:**
```javascript
// js/export/html.js
import { formatDateString, formatGeneratedDate, createDownloadFilename } from './shared.js';

export function exportFlatBomHtml(flattenedBOM, uploadedFilename, rootInfo, unitQty) {
    const dateStr = formatDateString();
    const generatedDate = formatGeneratedDate();

    // Calculate component breakdown
    const counts = { 'Manufactured': 0, 'Purchased': 0, 'Raw Stock': 0 };
    flattenedBOM.forEach(item => {
        if (counts.hasOwnProperty(item.componentType)) {
            counts[item.componentType]++;
        }
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Flat BOM - ${rootInfo.partNumber} Rev${rootInfo.revision}</title>
    <!-- embedded styles and content -->
</head>
<body>
    <!-- data rendering -->
</body>
</html>`;

    const filename = createDownloadFilename(uploadedFilename, rootInfo, 'Flat BOM', dateStr, 'html');
    downloadHtmlFile(html, filename);
}

function downloadHtmlFile(htmlContent, filename) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
```

### Pattern 3: Shared Utilities Module
**What:** Extract common date formatting, filename generation, and download logic to shared.js
**When to use:** When 6+ export functions all duplicate the same 10-20 lines of code
**Example:**
```javascript
// js/export/shared.js
export function formatDateString() {
    const today = new Date();
    return today.getFullYear() +
           String(today.getMonth() + 1).padStart(2, '0') +
           String(today.getDate()).padStart(2, '0');
}

export function formatGeneratedDate() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;
}

export function createDownloadFilename(uploadedFilename, rootInfo, reportType, dateStr, extension) {
    const baseFilename = uploadedFilename
        ? uploadedFilename.replace(/\.(csv|xml)$/i, '')
        : `${rootInfo.partNumber}-Rev${rootInfo.revision}`;
    return `${baseFilename}-${reportType}-${dateStr}.${extension}`;
}
```

### Anti-Patterns to Avoid
- **Modifying state during export:** Export functions should read data, not mutate state. Keep them pure.
- **Hardcoded column orders:** Use explicit object mappings so column order is clear and testable.
- **Missing URL cleanup:** Always call URL.revokeObjectURL() after Blob download to free memory.
- **Async export functions:** SheetJS XLSX.writeFile() is synchronous. Don't introduce async unless required.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file generation | Custom XLSX binary writer | SheetJS XLSX.utils | Complex binary format with strict spec compliance requirements. SheetJS handles all edge cases. |
| File download in browser | Manual form submission or iframe tricks | Blob + URL.createObjectURL | Modern standard, works across all browsers, handles large files efficiently. |
| Date formatting | Custom date string builders | Template with padStart() | Native JS methods are fast, readable, and don't require date libraries. |
| CSV generation | String concatenation with escaping | SheetJS sheet_to_csv | CSV has subtle quoting rules (commas, quotes, newlines). SheetJS handles all cases. |
| HTML templating for exports | DOM manipulation or parsing libraries | Template literals | Static exports don't need reactivity. Template literals are simple and performant. |

**Key insight:** Export functionality is output-only (no parsing, no user input validation) so complexity is low. SheetJS handles the hard part (Excel binary format). Everything else is string formatting and browser file APIs.

## Common Pitfalls

### Pitfall 1: SheetJS Dependency Timing
**What goes wrong:** Import XLSX before CDN script loads, causing "XLSX is undefined" errors
**Why it happens:** ES6 modules load in parallel. CDN script tag must execute before modules that import XLSX.
**How to avoid:** Use environment.js abstraction which checks for window.XLSX and throws clear error if missing. Validate script load order in index.html.
**Warning signs:** "Cannot read property 'utils' of undefined" in browser console during export.

### Pitfall 2: Memory Leaks from Blob URLs
**What goes wrong:** Creating many Blob URLs without cleanup causes browser memory to grow
**Why it happens:** URL.createObjectURL() creates in-memory reference that persists until explicitly revoked or page unloads
**How to avoid:** Always call URL.revokeObjectURL(url) immediately after triggering download (after a.click())
**Warning signs:** Browser memory usage grows with repeated exports, especially noticeable with large HTML files.

### Pitfall 3: Excel Column Order Changes
**What goes wrong:** Automated tests fail because Excel export columns appear in different order than control files
**Why it happens:** JSON objects don't guarantee key order. XLSX.utils.json_to_sheet uses object key order from first item.
**How to avoid:** Use explicit column order mappings. Always map data objects with consistent key declaration order.
**Warning signs:** Test runner reports column order mismatches like "expected 'Part Number' at index 1, got 'Qty'".

### Pitfall 4: Filename Pattern Inconsistencies
**What goes wrong:** Export filenames don't match expected patterns (e.g., missing date, wrong separator)
**Why it happens:** Six different export handlers duplicate filename logic with slight variations
**How to avoid:** Centralize filename generation in shared.js. Write explicit tests for filename format.
**Warning signs:** Users report confusing filenames or difficulty finding recent exports.

### Pitfall 5: HTML Export CSS Drift
**What goes wrong:** HTML exports render differently than current behavior (fonts, spacing, colors)
**Why it happens:** Inline CSS in HTML exports is ~200 lines per function. Easy to miss updates when main CSS changes.
**How to avoid:** Extract HTML export CSS to a template constant. Document that HTML export styles are intentionally frozen (static reports shouldn't change appearance).
**Warning signs:** User reports "exported HTML looks different" or "fonts are wrong".

### Pitfall 6: Test Validation Breaking Changes
**What goes wrong:** Excel export refactor breaks automated tests even though output looks identical
**Why it happens:** Tests compare Excel files at cell level. Any format change (even whitespace) fails comparison.
**How to avoid:** Run tests after EVERY export function change. If tests fail, investigate before assuming code is correct.
**Warning signs:** Test runner reports mismatches in Description, Purchase Description, or other text fields.

## Code Examples

Verified patterns from current codebase:

### Excel Export Pattern (Current - flat-bom.js:261-298)
```javascript
// Prepare data for Excel with explicit column order
const excelData = state.flattenedBOM.map(item => ({
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

// Generate filename using uploaded filename
const today = new Date();
const dateStr = today.getFullYear() +
              String(today.getMonth() + 1).padStart(2, '0') +
              String(today.getDate()).padStart(2, '0');

const baseFilename = state.uploadedFilename
    ? state.uploadedFilename.replace(/\.(csv|xml)$/i, '')
    : `${getRootPartNumber()}-Rev${getRootRevision()}`;
const filename = `${baseFilename}-Flat BOM-${dateStr}.xlsx`;

// Download
XLSX.writeFile(wb, filename);
```

### HTML Export Pattern (Current - flat-bom.js:301-596)
```javascript
// HTML export creates complete standalone file with embedded CSS
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Flat BOM - ${getRootPartNumber()} Rev${getRootRevision()}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        /* ~200 lines of CSS embedded inline */
    </style>
</head>
<body>
    <div class="container">
        <!-- Assembly info, stats, and table -->
        ${state.flattenedBOM.map(item => `<tr>...</tr>`).join('')}
    </div>
</body>
</html>
`;

// Download using Blob API
const blob = new Blob([html], { type: 'text/html' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();
URL.revokeObjectURL(url);  // CRITICAL: free memory
```

### Comparison Excel Export with Header Rows (comparison.js:628-682)
```javascript
// Comparison exports have header rows before column names
const ws_data = [
    ['Old BOM:', state.oldBomFilename || 'N/A', `${state.oldBomInfo.partNumber} - ${state.oldBomInfo.description}`, `Rev ${state.oldBomInfo.revision}`, oldScopeText],
    ['New BOM:', state.newBomFilename || 'N/A', `${state.newBomInfo.partNumber} - ${state.newBomInfo.description}`, `Rev ${state.newBomInfo.revision}`, newScopeText],
    [],  // Empty row separator
    ['Change Type', 'Part Number', 'Component Type', 'Old Description', 'New Description', /* ... */]
];

// Add data rows
sorted.forEach(result => {
    ws_data.push([result.changeType, result.partNumber, /* ... */]);
});

const ws = XLSX.utils.aoa_to_sheet(ws_data);  // array-of-arrays, not json_to_sheet
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'BOM Comparison');
XLSX.writeFile(wb, filename);
```

### XLSX Import via Environment Module (environment.js:19-38)
```javascript
// SheetJS abstraction for browser + Node.js
export let XLSX;
if (isNode) {
    // Node.js: npm package with manual fs injection
    const xlsxModule = await import('xlsx');
    XLSX = xlsxModule.default || xlsxModule;
    const fs = await import('fs');
    const fsModule = fs.default || fs;
    if (XLSX.set_fs) {
        XLSX.set_fs(fsModule);
    }
} else {
    // Browser: use CDN global (loaded via <script> tag before modules)
    if (typeof window.XLSX === 'undefined') {
        throw new Error('SheetJS not loaded. Include <script> tag for XLSX CDN before module scripts.');
    }
    XLSX = window.XLSX;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileSaver.js library | Native Blob + URL.createObjectURL | ~2017 (Chrome 52+, Firefox 53+) | Eliminated external dependency, works in all modern browsers |
| Manual CSV escaping | XLSX.utils.sheet_to_csv() | SheetJS adoption | Handles edge cases (quotes, commas, newlines) correctly |
| DOM-based HTML export (clone, serialize) | Template literals | ES6 (2015) | Cleaner code, better performance, easier to maintain |
| File System Access API | Not yet adopted | Available 2020+ | Project stays with Blob for broader compatibility |

**Deprecated/outdated:**
- FileSaver.js: No longer needed with modern Blob API support
- msSaveBlob: IE11-specific API, project targets modern browsers only
- jQuery-based Excel plugins: SheetJS superseded earlier jQuery-dependent solutions

## Open Questions

1. **Should HTML export CSS be shared across all three tab types?**
   - What we know: All three HTML exports use identical CSS (~200 lines), duplicated in each function
   - What's unclear: Should CSS be extracted to a constant/template, or kept inline per function for independence?
   - Recommendation: Extract CSS to shared constant in html.js. Reduces duplication from 600 lines to 200, maintains single source of truth. If a tab needs custom styling, override specific rules in that function.

2. **Should export functions be sync or async?**
   - What we know: Current handlers are synchronous (XLSX.writeFile is sync, Blob creation is sync)
   - What's unclear: Future File System Access API adoption would require async
   - Recommendation: Keep sync for now. Tests and UI module patterns are synchronous. If File System Access is added later, create new async variants without breaking existing functions.

3. **How should comparison export filename pattern handle both BOMs?**
   - What we know: Current pattern is `${oldBase}-vs-${newBase}-Comparison-${dateStr}.xlsx`
   - What's unclear: Is this pattern documented/validated? Could it change in Phase 8?
   - Recommendation: Codify current pattern in shared.js with explicit function `createComparisonFilename(oldBase, newBase, dateStr, extension)`. This makes pattern visible and testable.

## Sources

### Primary (HIGH confidence)
- Current codebase: js/ui/flat-bom.js (lines 261-596), js/ui/comparison.js (lines 628-682), js/ui/hierarchy.js (lines 416-461) - export handlers
- Current codebase: js/core/environment.js (lines 19-38) - XLSX import abstraction
- Current codebase: test/run-tests.js - Excel export validation requirements
- [SheetJS Data Export Documentation](https://docs.sheetjs.com/docs/solutions/output/) - XLSX.write, XLSX.writeFile, and export patterns

### Secondary (MEDIUM confidence)
- [SheetJS Community Edition](https://docs.sheetjs.com/) - Current version documentation
- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - ES6 module patterns
- [Web.dev: How to save a file](https://web.dev/patterns/files/save-a-file/) - Blob download and File System Access API

### Tertiary (LOW confidence)
- [JavaScript Blob download patterns](https://sqlpey.com/javascript/javascript-forcing-file-downloads/) - General Blob/download patterns (verified with MDN)
- [TheLinuxCode: NPM SheetJS XLSX in 2026](https://thelinuxcode.com/npm-sheetjs-xlsx-in-2026-safe-installation-secure-parsing-and-real-world-nodejs-patterns/) - 2026 best practices (mentions @e965/xlsx maintained fork)
- [Module organization patterns](https://www.patterns.dev/vanilla/module-pattern/) - Separation of concerns (general principles)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SheetJS v0.18.5 confirmed in use via CDN, Blob API is browser standard
- Architecture: HIGH - Current codebase has 6 working export handlers to extract, patterns are established
- Pitfalls: HIGH - Memory leaks, column order, and test validation issues are directly observable in codebase constraints
- Code examples: HIGH - All examples extracted from current working code

**Research date:** 2026-02-09
**Valid until:** ~60 days (SheetJS stable, browser APIs stable, no fast-moving dependencies)
