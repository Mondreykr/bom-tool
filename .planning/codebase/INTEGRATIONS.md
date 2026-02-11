# External Integrations

**Analysis Date:** 2026-02-10

## APIs & External Services

**None.**

BOM Tool is a fully client-side application with zero external API dependencies. All processing occurs in the browser on user-uploaded files.

## Data Storage

**Databases:**
- Not applicable - No persistent server-side storage
- All data processing in-memory only; state in `js/ui/state.js`

**File Storage:**
- Input: Client-side via browser file upload
  - Formats: CSV (UTF-16 from SOLIDWORKS PDM), XML hierarchical exports
  - Stored: In-memory as parsed objects (`csvData`, trees, etc.)

- Output: Client-side Blob download
  - Formats: Excel (.xlsx), HTML (.html)
  - Mechanism: Blob API + `URL.createObjectURL()` in `js/export/shared.js`
  - No server upload required

**Caching:**
- None - No caching layer or service worker

## Authentication & Identity

**Auth Provider:**
- Not applicable - No user accounts or authentication system
- Application is public/unauthenticated

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service (Sentry, DataDog, etc.)
- Errors logged to browser console only

**Logs:**
- Console logging only
- No centralized logging or analytics

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (static)
- Repository: `mondreykr/bom-tool`
- Branch: `main` (auto-deployed)

**CI Pipeline:**
- Not detected - No automated pipeline (.github/workflows not found)
- Manual deployment via git push to main branch

**Test Validation:**
- Local validation only: `npm test` (Node.js test runner)
- Four automated baseline comparison tests in `test/run-tests.js`:
  1. XML to Flat BOM
  2. CSV to Flat BOM
  3. XML Comparison
  4. CSV Comparison
- Tests validate against baseline Excel outputs in `test-data/` (all must pass)

## Environment Configuration

**Required env vars:**
- None - Application requires no environment variables

**Configuration:**
- Build-time: No configuration files (no build process)
- Runtime: No runtime configuration needed
- Deployment: Static file serving only

## Client-Side State

**In-Memory State:**
- Location: `js/ui/state.js`
- Properties:
  - `csvData`, `flattenedBOM`, `treeRoot` - Flat BOM tab data
  - `oldBomData`, `newBomData`, `oldBomTree`, `newBomTree` - Comparison data
  - `hierarchyData`, `hierarchyTree` - Hierarchy View data
  - `comparisonResults`, `currentFilter` - Filtered comparison results
- Lifecycle: Created on file upload, cleared on reset

**No Persistence:**
- localStorage not used
- sessionStorage not used
- IndexedDB not used
- Data lost on page refresh

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Content Delivery

**Static Assets:**
```
index.html              → GitHub Pages CDN
css/styles.css          → GitHub Pages CDN
js/**/*.js              → GitHub Pages CDN (ES6 modules)
test/**/*.js            → Local Node.js only
```

**External Resources:**
- Google Fonts (CSS @import)
  - `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap`
- XLSX CDN (via `<script>` tag in `index.html`)
  - `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

## Third-Party Libraries

**Browser Runtime:**
- SheetJS v0.18.5 (XLSX library)
  - Source: CDN
  - Used by: `js/export/excel.js`
  - Capabilities: Excel workbook generation, sheet manipulation

**Node.js Testing:**
- `xlsx` v0.18.5 (npm package)
- `xmldom` v0.6.0 (npm package)
- No other test dependencies (no Mocha, Jest, etc.)

## Data Processing

**Input Formats:**
- CSV (UTF-16 from SOLIDWORKS PDM exports)
  - Parsing: `js/core/parser.js` → `parseCSV()`
  - Uses SheetJS to read binary format

- XML (Hierarchical BOM structure from SOLIDWORKS)
  - Parsing: `js/core/parser.js` → `parseXML()`
  - Uses DOMParser (browser native or xmldom in Node)
  - Expected structure: `<transaction><document>` with nested `<configuration>` elements

**Processing Pipeline:**
1. Parse file (CSV or XML) → Array of row objects
2. Build tree: `js/core/tree.js` → `buildTree()` → BOMNode hierarchy
3. Flatten tree: `js/core/flatten.js` → `flattenBOM()` → Flat parts list
4. Compare: `js/core/compare.js` → `compareBOMs()` → Diff results
5. Export: `js/export/excel.js` or `js/export/html.js` → File download

**No Network Processing:**
- All file I/O is local to the browser/Node process
- No multipart/form-data uploads to server
- No streaming or chunked processing

---

*Integration audit: 2026-02-10*
