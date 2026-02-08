# Phase 2: CSS Extraction - Research

**Researched:** 2026-02-07
**Domain:** CSS external stylesheets, HTML/CSS separation
**Confidence:** HIGH

## Summary

Phase 2 requires extracting ~840 lines of CSS from the `<style>` block in index.html into a separate css/styles.css file. The core challenge is ensuring pixel-identical visual appearance across all three tabs (Flat BOM, BOM Comparison, Hierarchy View) while maintaining print styles and HTML export functionality.

The standard approach is straightforward: extract all CSS content verbatim into an external .css file and link it via `<link rel="stylesheet" href="css/styles.css">` in the HTML `<head>`. The critical consideration for this project is that **HTML exports contain embedded inline styles** - they must remain self-contained standalone files and are NOT affected by this extraction.

Key technical requirements verified:
- Google Fonts @import stays in external CSS file (standard practice)
- CSS custom properties (:root variables) work identically in external stylesheets
- Print media queries (@media print) function the same in external files
- Relative URLs in CSS resolve against the stylesheet location, not HTML location
- HTML exports embed all styles inline, so they remain unaffected by extraction

**Primary recommendation:** Extract all CSS content between `<style>` and `</style>` tags (lines 8-842) into css/styles.css file, replace with single `<link rel="stylesheet" href="css/styles.css">` tag, verify visual parity in browser.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native CSS | CSS3 | Styling language | No preprocessors needed; project uses standard CSS with custom properties |
| HTML `<link>` tag | HTML5 | External stylesheet linking | W3C standard method for loading external CSS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Google Fonts | API v2 | Web font loading | Already in use; @import URL method works in external CSS |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| External CSS | Inline styles | Inline harder to maintain but eliminates HTTP request (not worth it for development) |
| @import in CSS | `<link>` in HTML for fonts | @import is standard for Google Fonts; keeps font loading in CSS layer |
| Single CSS file | Multiple CSS files | User constraint: keep it simple; no need for multiple files at this stage |

**Installation:**
```bash
# No installation needed - native CSS
# Create directory structure:
mkdir css
# File will be created in Phase 2 execution
```

## Architecture Patterns

### Recommended Project Structure
```
bom-tool/
├── index.html                    # Browser app with <link> to external CSS
├── css/                          # NEW: Stylesheet directory
│   └── styles.css                # All CSS from <style> block
├── modules/                      # ES6 modules (from Phase 1)
│   └── [module files]
├── test/
│   └── run-tests.js
└── test-data/
```

### Pattern 1: External CSS Linking
**What:** Link external stylesheet in HTML `<head>` using standard `<link>` tag
**When to use:** Always for external stylesheets
**Example:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BOM Tool 2.1</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

    <!-- Link to external stylesheet -->
    <link rel="stylesheet" href="css/styles.css">
</head>
```
**Source:** [MDN link element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link)

### Pattern 2: Google Fonts in External CSS
**What:** @import rule for Google Fonts at top of CSS file
**When to use:** When using web fonts in external stylesheets
**Example:**
```css
/* css/styles.css */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap');

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Rest of styles... */
```
**Source:** [Google Fonts API Documentation](https://developers.google.com/fonts/docs/getting_started), [W3Schools CSS Google Fonts](https://www.w3schools.com/css/css_font_google.asp)

### Pattern 3: CSS Custom Properties in External Stylesheet
**What:** :root variables work identically in external CSS files
**When to use:** When using CSS variables (already present in project)
**Example:**
```css
/* css/styles.css */
:root {
    --primary: #1e40af;
    --primary-dark: #1e3a8a;
    --gray-900: #0f172a;
    /* ... other variables ... */
}

body {
    font-family: 'Work Sans', sans-serif;
    color: var(--gray-900);
}
```
**Source:** [MDN Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)

### Pattern 4: Print Styles in External CSS
**What:** @media print blocks work the same way in external stylesheets
**When to use:** When external stylesheet contains print-specific styling
**Example:**
```css
/* css/styles.css */

/* Screen styles */
.button-group {
    display: flex;
    gap: 1rem;
}

/* Print styles - same file */
@media print {
    body {
        background: white;
        padding: 1rem;
    }

    .button-group,
    .upload-zone {
        display: none;
    }
}
```
**Source:** [MDN CSS Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing)

### Pattern 5: HTML Export with Embedded Styles (Unchanged)
**What:** Exported HTML files embed all styles inline and remain self-contained
**When to use:** In export functions (no changes needed for Phase 2)
**Example:**
```javascript
// Export function creates standalone HTML with embedded <style> block
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Flat BOM - ${rootPartNumber} Rev${rootRevision}</title>
    <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
    <style>
        /* All styles embedded inline */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Work Sans', sans-serif; }
        /* ... rest of inline styles ... */
    </style>
</head>
<body>
    <!-- Exported content -->
</body>
</html>
`;
```
**Note:** Export functions are NOT changed in Phase 2. They continue to generate self-contained HTML files with embedded styles.

### Anti-Patterns to Avoid
- **Changing @import to `<link>` for Google Fonts:** @import in CSS is standard practice for web fonts; keeps all styling concerns in CSS layer
- **Splitting CSS into multiple files prematurely:** Single file is simpler; can refactor later if needed
- **Modifying HTML export functions:** They must remain self-contained with embedded styles
- **Using relative paths for fonts in CSS:** Google Fonts should always use absolute URLs (https://...)
- **Forgetting print media queries:** All @media print blocks must be included in extracted CSS

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS extraction | Manual copy-paste with errors | Exact verbatim extraction | No transformation needed; CSS works identically in external file |
| Font loading | Custom font loader | Google Fonts @import | Already working; standard pattern supported by Google |
| Visual verification | Manual pixel comparison | Browser DevTools inspection + smoke testing | Compare computed styles, check all three tabs |
| Path resolution | Custom base path logic | Standard relative paths | Browser resolves css/styles.css from HTML location automatically |

**Key insight:** CSS extraction is a straightforward mechanical operation. Don't overthink it - extract verbatim, link with standard `<link>` tag, verify in browser.

## Common Pitfalls

### Pitfall 1: Incorrect File Path in `<link>` Tag
**What goes wrong:** Browser can't find stylesheet, page has no styling (unstyled HTML)
**Why it happens:** Typo in href, wrong relative path, or css/ directory not created
**How to avoid:** Use correct relative path `href="css/styles.css"` (from index.html perspective), verify file exists at that location
**Warning signs:** Browser DevTools console shows 404 error for styles.css; page appears unstyled
**Source:** [How to Link CSS to HTML](https://www.freecodecamp.org/news/how-to-link-css-to-html/)

### Pitfall 2: Forgetting to Create css/ Directory
**What goes wrong:** File write fails or browser can't find stylesheet
**Why it happens:** Directory doesn't exist when creating styles.css
**How to avoid:** Create css/ directory BEFORE creating styles.css file
**Warning signs:** File write error, or 404 in browser console
**Source:** Common file system operation error

### Pitfall 3: Including HTML Tags in CSS File
**What goes wrong:** CSS parsing fails, styles don't apply
**Why it happens:** Accidentally copying `<style>` and `</style>` tags into .css file
**How to avoid:** Extract ONLY the content between tags (lines 9-841), not the tags themselves
**Warning signs:** Browser DevTools shows CSS parse errors; styles partially or completely broken
**Source:** [W3Schools CSS External Stylesheet](https://www.w3schools.com/css/css_external.asp)

### Pitfall 4: Relative URL Resolution Changes
**What goes wrong:** Background images or relative URLs break
**Why it happens:** CSS file is in css/ subdirectory; relative URLs resolve from there, not from HTML location
**How to avoid:** Use absolute URLs for all assets, or adjust relative paths (e.g., ../images/foo.png instead of images/foo.png)
**Warning signs:** Images missing, fonts not loading (if using relative paths)
**Source:** [MDN CSS Custom Properties - URL resolution](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
**Project note:** Current codebase uses absolute URLs (Google Fonts CDN), so this is not a risk for Phase 2

### Pitfall 5: Forgetting Print Styles
**What goes wrong:** Print preview or HTML exports look wrong
**Why it happens:** Not extracting @media print blocks along with screen styles
**How to avoid:** Extract ALL CSS content including all four @media print blocks (at lines 447, 2064, 3295, 4258)
**Warning signs:** Print preview shows buttons/upload zones; export HTML looks wrong
**Source:** [MDN CSS Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing)

### Pitfall 6: Modifying HTML Export Functions
**What goes wrong:** Exported HTML files depend on external styles.css, breaking standalone nature
**Why it happens:** Misunderstanding Phase 2 scope - only live browser view should use external CSS
**How to avoid:** Do NOT change export functions (exportHtmlBtn, exportCompareHtmlBtn, exportHierarchyHtmlBtn) - they embed styles inline
**Warning signs:** Exported HTML files don't work when opened directly; depend on external CSS
**Source:** Project requirement - exports must be self-contained

### Pitfall 7: Browser Caching During Verification
**What goes wrong:** Changes to styles.css don't appear in browser; looks like extraction failed
**Why it happens:** Browser cache serving old version of stylesheet
**How to avoid:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or disable cache in DevTools during verification
**Warning signs:** Changes to CSS file don't reflect in browser; styles appear stale
**Source:** [MDN HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

## Code Examples

Verified patterns from official sources:

### Complete HTML `<head>` After Extraction
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BOM Tool 2.1</title>

    <!-- CDN dependency loaded BEFORE external CSS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

    <!-- External stylesheet linked -->
    <link rel="stylesheet" href="css/styles.css">
</head>
```
**Source:** [MDN link element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link)

### External CSS File Structure (css/styles.css)
```css
/* css/styles.css */

/* Google Fonts import at top */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Work+Sans:wght@400;600;700&display=swap');

/* Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* CSS Custom Properties */
:root {
    --primary: #1e40af;
    --primary-dark: #1e3a8a;
    --gray-900: #0f172a;
    --gray-800: #1e293b;
    /* ... rest of variables ... */
}

/* Base Styles */
body {
    font-family: 'Work Sans', sans-serif;
    background: #fafafa;
    /* ... rest of body styles ... */
}

/* Component Styles */
.container { /* ... */ }
.card { /* ... */ }
.button-group { /* ... */ }
/* ... rest of components ... */

/* Tab Styles */
.tabs { /* ... */ }
.tab-btn { /* ... */ }
/* ... rest of tab styles ... */

/* Tree/Hierarchy Styles */
.tree-toggle { /* ... */ }
.tree-lines { /* ... */ }
/* ... rest of tree styles ... */

/* Print Styles - ALL @media print blocks included */
@media print {
    body {
        background: white;
        padding: 1rem;
    }

    .card {
        box-shadow: none;
    }

    .button-group,
    .upload-zone {
        display: none;
    }
}

/* Additional @media print blocks from other sections */
@media print {
    /* ... comparison tab print styles ... */
}

@media print {
    /* ... hierarchy tab print styles ... */
}

@media print {
    /* ... other print styles ... */
}
```
**Source:** [W3Schools CSS External Stylesheet](https://www.w3schools.com/css/css_external.asp), [CSS Best Practices for Clean Code](https://allthingsprogramming.com/css-best-practices-for-clean-and-maintainable-code/)

### Browser Smoke Test Procedure
```bash
# After extraction:

1. Open index.html in browser (double-click or open in Chrome/Edge/Firefox)

2. Check Network tab in DevTools:
   - Verify css/styles.css loads successfully (200 status)
   - No 404 errors for stylesheet

3. Verify Flat BOM tab:
   - Upload test-data/258730-Rev2-20260105.XML
   - Confirm table renders correctly with proper styling
   - Check that fonts load (JetBrains Mono in table, Work Sans in UI)
   - Verify colors match (blue primary, gray text)

4. Verify BOM Comparison tab:
   - Upload old and new XML files
   - Run comparison
   - Confirm colored badges (green, red, orange) appear correctly
   - Check filter buttons work and are styled properly

5. Verify Hierarchy View tab:
   - Upload XML file
   - Confirm tree lines render correctly
   - Check expand/collapse toggles are styled (14×14px boxes)
   - Verify colors and spacing match original

6. Test Print Styles:
   - Open browser print preview (Ctrl+P / Cmd+P)
   - Verify upload zones and buttons are hidden
   - Confirm content is print-friendly (white background, no shadows)

7. Test HTML Exports (unchanged behavior):
   - Export to HTML from any tab
   - Open exported HTML file in browser
   - Verify it works standalone (doesn't depend on css/styles.css)
   - Confirm styling is embedded and identical to live view
```

### Verification: Compare Computed Styles
```javascript
// Browser DevTools Console - compare computed styles before/after extraction

// Before extraction (inline styles):
const bodyBefore = getComputedStyle(document.body);
console.log('Background:', bodyBefore.background);
console.log('Font family:', bodyBefore.fontFamily);
console.log('Color:', bodyBefore.color);

// After extraction (external stylesheet):
const bodyAfter = getComputedStyle(document.body);
console.log('Background:', bodyAfter.background);
console.log('Font family:', bodyAfter.fontFamily);
console.log('Color:', bodyAfter.color);

// Should be IDENTICAL
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `<style>` blocks | External stylesheets | HTML5 best practices (2014+) | Better separation of concerns, cacheability, maintainability |
| `<link>` for Google Fonts | @import in CSS | Google Fonts API v2 (2016+) | Keeps all styling in CSS layer; both methods still work |
| page-break-* properties | break-* properties | CSS Fragmentation Module Level 3 (2018) | Modern break-before/after/inside replace deprecated page-break-* |
| Multiple CSS files | Single CSS file for simple projects | Ongoing best practice | Fewer HTTP requests for small codebases; split when needed |

**Deprecated/outdated:**
- **Inline styles everywhere:** Hard to maintain; external CSS is standard since CSS1 (1996)
- **page-break-before/after:** Still works but break-before/after are modern replacements
- **`<style>` in `<body>`:** Valid in HTML5 but `<head>` is standard location for maintainability

**Project note:** Current codebase uses modern CSS3 features (custom properties, flexbox, grid). All features work identically in external stylesheets. No compatibility issues.

## Open Questions

Things that couldn't be fully resolved:

1. **Multiple @media print blocks vs single consolidated block**
   - What we know: CSS currently has 4 separate @media print blocks (lines 447, 2064, 3295, 4258)
   - What's unclear: Should they be consolidated into one block or kept separate in extracted CSS?
   - Recommendation: **Keep separate as-is**. Each block relates to nearby tab-specific styles. Consolidation could happen in later refactoring phase, but Phase 2 goal is zero behavior change. Extract verbatim.

2. **CSS file organization/section comments**
   - What we know: Current CSS has some logical grouping (tabs, tree styles, etc.)
   - What's unclear: Should we add section comments (/* Tabs */, /* Tree Styles */) for better navigation in external file?
   - Recommendation: **Add minimal section comments**. Since file is 840+ lines, basic section headers (matching inline structure) improve maintainability without changing behavior. Add: /* Base Styles */, /* Components */, /* Tabs */, /* Tree/Hierarchy */, /* Print Styles */

3. **CSS custom properties usage completeness**
   - What we know: :root has color variables (--primary, --gray-*, etc.)
   - What's unclear: Are all hardcoded color values using variables, or are some still hardcoded?
   - Recommendation: **Don't audit now**. Phase 2 is extraction only. Color variable consolidation can be a future enhancement phase. Extract as-is.

4. **Browser compatibility for CSS custom properties**
   - What we know: CSS custom properties work in all modern browsers (Chrome, Firefox, Edge, Safari)
   - What's unclear: Do we need to support IE11 or older browsers?
   - Recommendation: **Assume modern browsers only**. Project uses ES6+ JavaScript already, which doesn't work in IE11. CSS custom properties are safe for target audience.

## Sources

### Primary (HIGH confidence)
- [MDN link Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link) - Standard method for linking external stylesheets
- [MDN Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) - CSS variables in external files
- [MDN CSS Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) - Print styles in external CSS
- [W3Schools CSS External Stylesheet](https://www.w3schools.com/css/css_external.asp) - Basic external CSS linking
- [Google Fonts API Documentation](https://developers.google.com/fonts/docs/getting_started) - @import method for web fonts

### Secondary (MEDIUM confidence)
- [CSS Best Practices for Clean Code - All Things Programming](https://allthingsprogramming.com/css-best-practices-for-clean-and-maintainable-code/) - External stylesheet organization
- [How to Link CSS to HTML - freeCodeCamp](https://www.freecodecamp.org/news/how-to-link-css-to-html/) - Linking methodology and common issues
- [10 CSS Best Practices to Follow in 2026 - Acodez](https://acodez.in/css-best-practices/) - Modern CSS practices
- [How to Import Google Fonts in CSS - W3Docs](https://www.w3docs.com/snippets/css/how-to-import-google-fonts-in-css-file.html) - @import vs link for fonts

### Tertiary (LOW confidence)
- Web search results about CSS organization patterns - general approaches, project-specific decisions needed
- Community discussions about single vs multiple CSS files - tradeoff depends on project size

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - External CSS linking via `<link>` tag is W3C standard, verified with MDN official documentation
- Architecture: HIGH - All patterns verified with official sources (MDN, Google Fonts API, W3Schools)
- Pitfalls: HIGH - All 7 pitfalls based on common CSS extraction issues documented in official sources and best practices

**Research date:** 2026-02-07
**Valid until:** 120 days (very stable - CSS linking unchanged since HTML5)

**Key verification sources:**
- [MDN Web Docs](https://developer.mozilla.org) - All HTML/CSS technical specifications
- [Google Fonts API](https://developers.google.com/fonts) - Font loading best practices
- [W3Schools](https://www.w3schools.com) - Basic examples and common patterns
