# Technology Stack

**Analysis Date:** 2026-02-10

## Languages

**Primary:**
- JavaScript (ES6+) - Core application logic, file processing, UI interactions

**Markup & Styling:**
- HTML5 - Page structure and layout
- CSS3 - All application styling

## Runtime

**Browser:**
- Target: Modern browsers (ES6 module support required)
- No transpilation or polyfills used

**Node.js:**
- Version: Not specified (tested with current LTS)
- Used for: Automated tests only (`test/run-tests.js`)

## Package Manager

**NPM:**
- Root `package.json`: v2.1.0 project dependencies
- Test `package.json`: v1.0.0 test-specific dependencies
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Vanilla JavaScript ES6+ - No framework; native DOM APIs only

**Build/Dev:**
- No build process - Direct ES6 modules served over HTTP
- SheetJS (xlsx) v0.18.5 - Excel file generation (CDN for browser, npm for tests)

**Testing:**
- Node.js `fs` module + `assert`-like manual comparisons - No test framework (custom test runner)

## Key Dependencies

**Critical:**
- `xlsx` v0.18.5 - Excel export/import
  - Browser: Loaded via CDN (`https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`)
  - Node: NPM package for test automation
  - Why: Required for Excel workbook generation and file parsing in tests

- `xmldom` v0.6.0 - XML parsing (Node.js environment only)
  - Used in: Tests via `run-tests.js`
  - Why: Native DOMParser unavailable in Node; provides W3C-compatible DOM API

**Infrastructure:**
- None - Application is fully client-side with zero backend dependencies

## Module System

**Type:** ES6 Modules
- All source files use `import`/`export`
- Root `package.json` includes `"type": "module"`
- Test files use same ES6 module syntax

**Module Boundaries:**
- `js/core/` - Business logic (parser, tree, flatten, compare, utils)
- `js/ui/` - User interface controllers (state, flat-bom, comparison, hierarchy)
- `js/export/` - Report generation (excel, html, shared utilities)
- `js/main.js` - Entry point, tab switching initialization

## Configuration

**Environment Detection:**
- Runtime detection: `js/core/environment.js`
  - Detects browser vs. Node.js environments
  - Loads appropriate DOMParser implementation:
    - Browser: `window.DOMParser`
    - Node: `xmldom.DOMParser`
  - Loads appropriate XLSX implementation:
    - Browser: `window.XLSX` (from CDN)
    - Node: npm package with `set_fs()` for file operations

**Browser Requirements:**
- HTTP serving (not `file://` protocol)
  - Reason: ES6 modules require HTTP/HTTPS or localhost with server
  - Corporate IT blocks localhost servers; use GitHub Pages for testing
- XLSX CDN must load before `js/main.js`
  - Verified in `index.html`: `<script>` tag for CDN precedes `<script type="module">`

## Build & Deployment

**Development:**
- No build process
- Files served directly as-is
- Testing: `cd test && node run-tests.js` (validates against baseline Excel outputs)

**Production:**
- GitHub Pages (main branch)
- URL: https://mondreykr.github.io/bom-tool/
- Static hosting only; no server-side processing

## Platform Requirements

**Development:**
- Node.js (for test suite only)
- Text editor or IDE (VS Code recommended for ES6 module debugging)
- Git for version control
- No build tools required

**Production:**
- Web server (GitHub Pages or equivalent static hosting)
- Modern browser with ES6 module support and Blob API

## File I/O

**Browser:**
- Input: File upload via `<input type="file">` (CSV, XML)
- Output: Client-side file download via Blob API + `URL.createObjectURL()`
- No server communication required

**Node.js (Testing):**
- Input: Direct filesystem access via `fs` module
- Output: Excel files written to filesystem via XLSX

## External Resources

**CDN:**
- XLSX: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
- Fonts: Google Fonts (JetBrains Mono, Work Sans)

**No External APIs:**
- Zero network calls to backend services
- No authentication/authorization layer
- No remote data sources

---

*Stack analysis: 2026-02-10*
