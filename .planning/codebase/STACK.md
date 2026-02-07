# Technology Stack

**Analysis Date:** 2026-02-07

## Languages

**Primary:**
- HTML5 - Markup structure for web application interface
- CSS3 - Styling and layout (840 lines embedded in `index.html`)
- JavaScript ES6+ - Core application logic (3200+ lines embedded in `index.html`)

**Secondary:**
- Node.js - Test harness execution only (no runtime dependency for production)

## Runtime

**Environment:**
- Web Browser (Chrome, Edge, Firefox, Safari)
- Minimum: ES6+ support required
- No Node.js required for production (client-side only)

**Package Manager:**
- npm - For test dependencies only
- No package manager required for application distribution (single HTML file)

## Frameworks

**Core:**
- Vanilla JavaScript (no framework) - All application logic is pure JavaScript without framework dependencies

**UI:**
- HTML5 + CSS3 - Custom card-based design system with no UI framework

**Testing:**
- Node.js test harness (`test/run-tests.js`) - Extracts and executes BOM functions for validation

## Key Dependencies

**Critical - Production:**
- SheetJS (xlsx.js) v0.18.5 - Excel file parsing and generation
  - Loaded via CDN: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
  - Provides: XLSX.read() for parsing Excel/CSV files, XLSX.utils for table generation, XLSX.writeFile() for Excel export
  - Required: Yes (no workaround for Excel support)

**Critical - Development/Testing:**
- xlsx v0.18.5 - NPM package for Node.js test harness
  - Location: `test/node_modules/xlsx/`
  - Package: `test/package.json` → dependencies
  - Used by: `test/run-tests.js` for parsing test data files

- xmldom v0.6.0 - XML DOM parser for Node.js
  - Location: `test/node_modules/xmldom/`
  - Package: `test/package.json` → dependencies
  - Used by: `test/run-tests.js` for parsing XML BOM exports from SOLIDWORKS PDM

**Development Support (transitive dependencies via xlsx):**
- adler-32, cfb, codepage, crc-32, frac, ssf, wmf, word - SheetJS ecosystem packages

## Configuration

**Environment:**
- No environment variables required
- No configuration files (`.env`, `.config.*`) needed
- Application is fully self-contained in single HTML file

**Build:**
- No build process required
- Distribute single `index.html` file
- All CSS and JavaScript embedded inline
- All external resources loaded from CDN at runtime

**Runtime Requirements:**
- Internet connection (for CDN resources and Google Fonts)
- Modern browser with ES6+ support
- No backend server required (fully client-side processing)

## External Resources (CDN)

**JavaScript Libraries:**
- SheetJS: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
  - Purpose: Excel file parsing and generation
  - Fallback: None (critical dependency)

**Fonts:**
- Google Fonts API: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap`
  - Fonts: JetBrains Mono (monospace, weights 400/600/700), Work Sans (sans-serif, weights 400/600/700)
  - Fallback: System fonts (Work Sans → system sans-serif, JetBrains Mono → system monospace)
  - Font preconnect optimization: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`

## Platform Requirements

**Development:**
- Git for version control
- Text editor or IDE (not required by code, just for editing)
- Node.js v14+ (for running test harness only, not required for application)
- npm (for test dependencies only)

**Production:**
- Static web hosting (GitHub Pages, any web server)
- HTTPS recommended (for Fonts CDN access)
- No application server required
- No database required

**Browser Compatibility:**
- Chrome (all modern versions)
- Edge (all modern versions)
- Firefox (all modern versions)
- Safari (all modern versions)
- Requirement: Full ES6+ support including:
  - Template literals
  - Arrow functions
  - Classes
  - Map and Set objects
  - Promise support
  - Fetch API (for potential future features)

## File Processing Capabilities

**Formats Supported:**
- CSV (UTF-16LE or UTF-8)
- XML (SOLIDWORKS PDM format)
- XLSX (Excel format)

**Parsing Approach:**
- CSV: Handled by SheetJS `XLSX.read()`
- XML: Native DOMParser for production, xmldom library for Node.js tests
- XLSX: SheetJS `XLSX.read()`

**Export Capabilities:**
- XLSX: SheetJS `XLSX.writeFile()` to generate Excel files
- HTML: Native HTML string generation and download
- CSV: Not currently exported

---

*Stack analysis: 2026-02-07*
