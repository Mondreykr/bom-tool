# Project Research Summary

**Project:** BOM Tool Modular Refactoring
**Domain:** Monolithic-to-modular web application refactoring (production tool)
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

The BOM Tool is a mission-critical production application (4400-line single-file HTML/CSS/JS) that needs refactoring into ~15 modular files to improve maintainability and AI-assisted development. Research confirms that **native ES6 modules with zero build tools is the correct approach for 2026**. Modern browsers provide 97%+ support for ES6 modules, and GitHub Pages serves files over HTTP/2, eliminating the old performance penalty for multiple files.

The recommended approach follows a **leaf-to-root extraction pattern**: start with zero-dependency utilities, then core algorithms, then UI modules, and finally the initialization layer. The existing test harness (test/run-tests.js) already validates against Excel baselines and can be adapted to import modular code directly. This provides a continuous validation safety net throughout refactoring.

The primary risk is **initialization order and global state management**. The current code relies on ~20 global variables and sequential execution order. In a modular architecture, all state must be centralized in a single state.js module, and all DOM manipulation must occur after DOMContentLoaded. Feature toggles and automated testing will enable zero-downtime deployment for this mission-critical tool.

## Key Findings

### Recommended Stack

**Approach:** Native ES6 modules with `<script type="module">`, no build tools, no bundlers, no transpilation. This is production-ready in 2026 and optimally simple for a non-technical owner to maintain.

**Core technologies:**
- **ES6 modules (native):** Module system with import/export syntax — universal browser support, zero dependencies, automatic deferred loading
- **HTTP/2 (GitHub Pages):** Multi-file delivery — eliminates HTTP/1.1 multiple-request penalty via multiplexing, making 15 files as fast as 1
- **Vanilla JavaScript ES6+:** Core logic — already in use, no migration needed
- **Single CSS file initially:** Extracted styling — simple cut/paste from `<style>` block, split later only if needed

**Critical technical decisions:**
- **State management:** Single state.js module exporting shared object, imported by all modules that need state
- **No build tools:** Keep development and deployment workflow simple; use VS Code Live Server for local testing
- **Named exports only:** Enables refactoring safety and tree-shaking; avoid default exports
- **Explicit .js extensions:** Required for browser modules; always include in import statements
- **SheetJS via CDN:** Keep existing approach; load with defer attribute before module scripts

### Expected Features

Research reveals that successful monolithic-to-modular refactors prioritize **behavior preservation and safety** over feature additions. This is a refactoring project, not a feature project.

**Must have (table stakes):**
- **Zero behavior change validation** — refactoring by definition preserves functionality; any change equals bug
- **Regression test suite with baseline outputs** — existing Node.js test harness must adapt to validate modular structure
- **Incremental extraction approach** — extract 3-8 files per batch, test after each batch
- **Git branch workflow for safety** — separate branch allows abandonment if issues arise
- **Module dependency mapping** — understand what calls what to avoid breaking initialization order
- **External dependency preservation** — SheetJS and Google Fonts must load correctly after refactoring
- **HTML/Excel export maintenance** — mission-critical outputs must work identically
- **Side effect audit** — import-time side effects cause most refactoring bugs; must identify all global state, DOM manipulation, event binding at top level

**Should have (differentiators for future development):**
- **Module initialization documentation** — explicit load order, dependencies, side effects documentation
- **Function purity classification** — identify pure functions vs. side effects; easier to test and refactor
- **Performance baseline comparison** — ensure refactored code performs at least as well as original
- **Module boundary interface documentation** — clear contracts between modules (inputs, outputs, responsibilities)
- **Rollback checkpoints** — git commits after each successful extraction batch

**Defer (anti-features to explicitly avoid):**
- **Big-bang refactor** — attempting everything at once; use incremental extraction instead
- **Build tool introduction** — adds complexity for non-technical owner; native modules work fine
- **Changing coding style** — mixed style causes confusion; keep exact same code style, separate refactoring from style improvements
- **Framework adoption** — two simultaneous changes multiply risk; refactor in vanilla JS, consider frameworks later
- **Premature abstraction** — extract code as-is first; identify abstraction opportunities after stable

### Architecture Approach

The recommended architecture follows **topological ordering** where leaf modules (utilities) are extracted first, followed by core algorithms (parsing, tree building, flattening, comparison), then UI modules (tab-specific), then export modules, and finally the initialization entry point.

**Major components:**

1. **Core logic modules (js/core/)** — Pure business logic with no DOM manipulation or state mutation. Includes:
   - utils.js: Pure utility functions (parseLength, getParentLevel, getCompositeKey, decimalToFractional)
   - parser.js: CSV/XML file parsing (~300 lines)
   - tree.js: BOMNode class, buildTree, tree traversal (~200 lines)
   - flatten.js: BOM flattening algorithm with aggregation (~150 lines)
   - compare.js: BOM comparison and diff logic (~200 lines)

2. **UI modules (js/ui/)** — Handle user interaction, DOM manipulation, coordinate core modules. Includes:
   - state.js: Centralized global state container (~100 lines)
   - tabs.js: Tab switching logic (~50 lines)
   - flat-bom.js: Flat BOM tab UI and handlers (~400 lines)
   - comparison.js: Comparison tab with scoped selection UI (~600 lines)
   - hierarchy.js: Hierarchy View tab with tree rendering (~500 lines)

3. **Export modules (js/export/)** — Convert in-memory data to downloadable formats. Includes:
   - excel.js: Excel export using SheetJS for all tabs (~200 lines)
   - html.js: Static HTML export for all tabs (~300 lines)

4. **Entry point (main.js)** — Initialize application, wire up all event handlers, coordinate module imports (~200 lines)

**Dependency flow:** Unidirectional (User action → Core processing → State update → UI render). UI modules never directly call other UI modules; communication happens through state changes. Core modules return data, never call UI functions.

### Critical Pitfalls

Research identified 13 pitfalls; these are the top 5 that can cause production breakage:

1. **Script load order dependency violations** — Functions called before they're defined. With modules, browser loads in parallel and dependency order matters. **Prevention:** Map all function call dependencies before splitting files; use explicit ES6 import statements to declare dependencies; test on slow network (DevTools throttling) to expose race conditions.

2. **Global state fragmentation** — ~20 global variables (csvData, flattenedBOM, oldBomData, etc.) become inaccessible when split across modules. Module scope isolates variables by default. **Prevention:** Create single state.js module exporting all global variables; all modules import from single source; document state ownership (which module reads vs. writes).

3. **CDN dependency timing violations** — SheetJS loaded from CDN must be available before any Excel export code runs. Module scripts defer by default but may execute before CDN script completes. **Prevention:** Use defer attribute on SheetJS script tag to match module execution timing; add error handling if XLSX global is undefined.

4. **DOM reference timing** — Code like `document.getElementById('uploadZone').addEventListener(...)` executes before DOM element exists. Module scripts may execute before DOMContentLoaded. **Prevention:** Wrap DOM initialization in functions called after DOMContentLoaded; never execute DOM queries at module top-level; check document.readyState before attaching listeners.

5. **Circular dependencies** — Module A imports B, B imports A. JavaScript can't resolve which loads first. Looks fine logically but breaks module loading. **Prevention:** Extract shared utilities to third module; design rule: "leaf modules" import nothing, "branch modules" import leaves only; use madge or ESLint import/no-cycle to detect before committing.

**Additional high-priority pitfalls:**
- **Test harness breakage:** Current tests extract functions from HTML via regex; must refactor test harness to import modules directly before or in parallel with code refactor
- **Module scope closure breakage:** Functions that relied on closure over outer scope variables break when moved to different module; shared state must be in single module imported as reference

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order and risk mitigation:

### Phase 0: Test Infrastructure Adaptation
**Rationale:** Must validate refactor correctness at every step. Existing test harness extracts functions from single HTML file; must adapt to import from multiple files before splitting code.
**Delivers:** Updated test/run-tests.js that imports from modular structure and validates against Excel baselines
**Addresses:** Test harness breakage pitfall (Critical Pitfall 6 from PITFALLS.md)
**Avoids:** Refactoring without safety net (would be forced to test manually, insufficient for 4400 lines)

### Phase 1: Foundation Planning
**Rationale:** Strategic planning prevents critical pitfalls. Must map dependencies, identify circular refs, audit side effects before touching code.
**Delivers:** Dependency graph, file structure design, state module design, side effect audit documentation
**Addresses:** Zero behavior change validation, module dependency mapping, function extraction checklist (table stakes from FEATURES.md)
**Avoids:** Load order violations, circular dependencies, global state fragmentation (Critical Pitfalls 1, 2, 5)

### Phase 2: CSS Extraction (Low Risk)
**Rationale:** Simplest extraction with zero dependencies. Immediate file size reduction. Tests visual appearance, not logic.
**Delivers:** css/styles.css (~840 lines) extracted from `<style>` block in index.html
**Uses:** Single external CSS file approach (STACK.md recommendation)
**Implements:** File organization pattern from ARCHITECTURE.md

### Phase 3: Pure Utilities Extraction (Low Risk)
**Rationale:** Zero-dependency utility functions are leaf nodes in dependency graph. Widely used, easy to test in isolation.
**Delivers:** js/core/utils.js with parseLength, getParentLevel, getCompositeKey, decimalToFractional
**Addresses:** Incremental extraction approach (table stakes)
**Avoids:** Circular dependencies (utilities are leaves, import nothing)

### Phase 4: Core Logic Extraction (Medium Risk)
**Rationale:** Business logic with minimal DOM coupling. Extract in dependency order: tree.js (depends on utils), parser.js (depends on utils), flatten.js (depends on tree), compare.js (depends on tree).
**Delivers:** js/core/tree.js, js/core/parser.js, js/core/flatten.js, js/core/compare.js (~850 lines total)
**Uses:** Named exports only, explicit .js extensions (STACK.md standards)
**Implements:** Core modules component from ARCHITECTURE.md
**Avoids:** Breaking function dependencies (test after each module extraction)

### Phase 5: State Management (High Risk)
**Rationale:** All global state must centralize before UI modules split. Touches every part of codebase. Done carefully one tab at a time.
**Delivers:** js/ui/state.js with centralized state object and getter/setter functions
**Addresses:** Global state management from FEATURES.md
**Avoids:** Global state fragmentation, closure breakage (Critical Pitfalls 2, 8)

### Phase 6: UI Module Extraction (High Risk)
**Rationale:** Tab-specific UI code depends on core logic being stable. More DOM coupling, more side effects. Extract and test each tab individually.
**Delivers:** js/ui/tabs.js, js/ui/flat-bom.js, js/ui/hierarchy.js, js/ui/comparison.js (~1550 lines total)
**Addresses:** Module boundary documentation, event binding architecture
**Implements:** UI modules component from ARCHITECTURE.md
**Avoids:** DOM reference timing (wrap init in DOMContentLoaded handlers), CSS selector decoupling (Critical Pitfall 4, 7)

### Phase 7: Export Module Extraction (Medium Risk)
**Rationale:** Export functions depend on core logic. Verify both Excel and HTML exports work identically after extraction.
**Delivers:** js/export/excel.js, js/export/html.js (~500 lines total)
**Addresses:** HTML/Excel export maintenance (table stakes)
**Avoids:** CDN dependency timing (SheetJS must load before export modules execute)

### Phase 8: Entry Point Consolidation (Low Risk)
**Rationale:** Final wiring layer imports and initializes all modules. Straightforward once modules are stable.
**Delivers:** js/main.js (~200 lines) and cleaned index.html (~100 lines HTML structure only)
**Uses:** Module script loading with type="module" (STACK.md recommendation)
**Implements:** Entry point architecture from ARCHITECTURE.md

### Phase 9: Validation and Deployment (Critical)
**Rationale:** Full testing before production deployment. Zero tolerance for breakage on mission-critical tool.
**Delivers:** All 4 validation tests passing, browser testing complete, GitHub Pages deployment verified
**Addresses:** Regression test suite, browser compatibility validation, performance baseline comparison
**Avoids:** Production breakage through comprehensive validation

### Phase Ordering Rationale

- **Test infrastructure first:** Cannot validate without working tests; test harness is safety net for all subsequent work
- **Foundation planning before coding:** Prevents critical pitfalls (load order, circular deps, state fragmentation) that are hard to fix later
- **Leaf-to-root extraction:** Dependencies flow downward; utilities extracted before code that uses them
- **State before UI:** UI modules need centralized state; extracting UI first would force dual refactoring
- **One tab at a time:** High-risk UI extraction done incrementally; can rollback individual tabs if issues arise
- **Full validation last:** Only deploy after all tests pass and browser validation complete

### Research Flags

**Phases with standard patterns (skip deep research):**
- **Phase 2 (CSS):** Simple file extraction; well-documented, no unknowns
- **Phase 3 (Utils):** Pure functions; standard JavaScript patterns
- **Phase 8 (Entry point):** ES6 module initialization; documented in MDN

**Phases needing attention during planning (not deep research, but careful implementation):**
- **Phase 0 (Test harness):** Needs analysis of current extraction mechanism; adapt to Node.js ES6 module imports
- **Phase 1 (Foundation):** Needs detailed code audit for side effects, closures, DOM queries; create dependency graph
- **Phase 4 (Core logic):** buildTree() currently sets globals; must refactor to return metadata instead
- **Phase 5 (State):** High-risk phase; needs clear migration strategy (which modules first, how to test incrementally)
- **Phase 6 (UI modules):** Must establish DOMContentLoaded pattern; identify all event listeners; map CSS class dependencies

**No phases need `/gsd:research-phase`** — domain is well-understood, patterns are established, pitfalls are documented. Execution requires careful implementation following research guidance, not additional research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MDN official docs, 97% browser support verified, HTTP/2 on GitHub Pages confirmed |
| Features | HIGH | Established refactoring best practices, multiple authoritative sources align on table stakes vs. anti-features |
| Architecture | HIGH | Topological ordering is proven pattern, module boundaries match existing code structure, test harness validates approach |
| Pitfalls | HIGH | Cross-referenced multiple 2026 sources, all critical pitfalls have specific prevention strategies applicable to BOM Tool |

**Overall confidence:** HIGH

Research is comprehensive and actionable. Stack decisions are verified against official documentation. Feature prioritization aligns with industry refactoring best practices. Architecture follows proven patterns for modular JavaScript. Pitfalls are well-documented with concrete prevention strategies.

### Gaps to Address

**During Phase 0 (Test Infrastructure):**
- Verify Node.js version supports ES6 module imports (requires Node 14+; check actual version in test environment)
- Confirm test harness can import from relative paths (may need "type": "module" in test/package.json)

**During Phase 1 (Foundation Planning):**
- Map every global variable and its mutation points (comprehensive audit needed)
- Identify all DOM queries at script top-level (manual code review required)
- Document current event listener attachment timing (when does each listener bind?)

**During Phase 5 (State Management):**
- Decide on primitive state handling: getter/setter functions vs. object wrapper (both patterns documented in research; choose based on readability preference)
- Determine if Proxy-based reactive state would benefit UI updates (research shows simple shared object sufficient for this use case)

**During Phase 9 (Validation):**
- Establish performance baseline before refactor (measure processing time for large BOMs; target: no degradation)
- Define acceptance criteria for Operations team validation (what specific scenarios must they test?)

**Deferred to post-refactor:**
- Feature toggle mechanism for owner (allows instant rollback; implement if owner wants experimental mode during transition)
- Blue-green deployment strategy (keep both versions live during transition; may be overkill given test coverage)

## Sources

### Primary (HIGH confidence)

**From STACK.md:**
- [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) — ES6 module system
- [MDN - script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script) — defer/async/module attributes
- [Node.js ES modules](https://nodejs.org/api/esm.html) — test harness adaptation
- [Can I Use - ES6 Modules](https://caniuse.com/es6-module) — browser compatibility

**From FEATURES.md:**
- [Characterization test - Wikipedia](https://en.wikipedia.org/wiki/Characterization_test) — golden master testing
- [Regression Testing: An In-Depth Guide for 2026](https://www.leapwork.com/blog/regression-testing) — validation strategy

**From ARCHITECTURE.md:**
- [JavaScript modules - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) — module patterns
- [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html) — dependency management

**From PITFALLS.md:**
- [DOMContentLoaded Event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event) — timing issues
- [JavaScript Scope and Closures](https://medium.com/samsung-internet-dev/javascript-scope-and-closures-3666c4fdf2c2) — closure breakage

### Secondary (MEDIUM confidence)

**From STACK.md:**
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) — state patterns
- [Should you combine CSS and JavaScript files in 2025?](https://teamupdraft.com/blog/combine-css-javascript-files/) — HTTP/2 performance
- [Managing CSS & JS in an HTTP/2 World](https://www.viget.com/articles/managing-css-js-http-2) — multi-file serving

**From FEATURES.md:**
- [How to Refactor Complex Codebases – A Practical Guide for Devs](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases/) — refactoring strategy
- [From Monolith to Modules: Refactoring a JavaScript Quiz Application](https://dev.to/blamsa0mine/from-monolith-to-modules-refactoring-a-javascript-quiz-application-5cm0) — similar domain

**From ARCHITECTURE.md:**
- [How I Built a Modular Frontend Architecture Using JavaScript](https://jdavidsmith.medium.com/how-i-built-a-modular-frontend-architecture-using-javascript-from-spaghetti-to-scalable-885c3946e524) — practical patterns
- [Best Practices for JavaScript Modularization](https://dev.to/omriluz1/best-practices-for-javascript-modularization-22b6) — module boundaries

**From PITFALLS.md:**
- [How to Fix Circular Dependencies in JavaScript](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de) — cycle resolution
- [JavaScript Modules Best Practices](https://dmitripavlutin.com/javascript-modules-best-practices/) — common mistakes

---
*Research completed: 2026-02-07*
*Ready for roadmap: yes*
