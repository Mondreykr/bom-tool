# Feature Landscape: Monolithic-to-Modular Web App Refactoring

**Domain:** Single-file web application refactoring (4400-line HTML to ~15 files)
**Researched:** 2026-02-07

## Table Stakes

Features users expect. Missing = refactor is unsafe, incomplete, or blocks future work.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Zero behavior change validation | Refactoring by definition preserves functionality; any change = bug | Medium | Requires comprehensive test coverage before and after |
| Regression test suite with baseline outputs | Industry standard for validating behavior preservation in refactors | Medium | Existing Node.js test harness validates against Excel baselines; must adapt to new structure |
| Incremental extraction approach | Attempting to refactor everything at once usually ends badly; small batches reduce risk | Low | Extract 3-8 files per batch, test after each batch |
| Git branch workflow for safety | Protects working production code during risky structural changes | Low | Separate branch allows abandonment if issues arise |
| Module dependency mapping | Must understand what calls what to avoid breaking initialization order | Medium | Document dependencies before extraction; detect circular references |
| Function extraction checklist | Systematic approach prevents missing steps (params, return values, side effects) | Low | Standardized procedure for each extraction reduces errors |
| External dependency preservation | CDN libraries (SheetJS, Google Fonts) must load correctly after refactoring | Low | Script tag order critical; test in browser after each change |
| HTML export functionality maintenance | Tool generates standalone HTML files; must still work after modular refactoring | Medium | HTML export embeds CSS/JS inline; refactored code must support this |
| Excel export functionality maintenance | Mission-critical output format via SheetJS; must work identically | Medium | Ensure SheetJS remains accessible to export modules |
| Test harness adaptation | Existing tests extract functions from single HTML file; must work with multi-file structure | High | Update extraction mechanism before splitting code; tests are the safety net |
| Side effect audit | Import-time side effects and initialization order cause most refactoring bugs | High | Identify all global state, DOM manipulation, event binding at top level |
| Consistent file organization pattern | Clear boundaries between modules improves maintainability (purpose of refactor) | Low | Core logic vs UI vs export; naming conventions |

## Differentiators

Features that make future development significantly easier. Not required for safe refactor, but high value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Golden Master / Characterization tests | Captures exact current behavior automatically; safety net for complex legacy code | Medium | Generate output snapshots for all test cases; compare byte-for-byte after changes |
| Refactoring-aware test strategy | Distinguish behavior-preserving changes from functional changes; skip tests for pure refactors | Medium | Research shows 30-40% test reduction during refactoring with proper classification |
| Module initialization documentation | Explicit documentation of load order, dependencies, and side effects | Low | Creates roadmap for future developers; prevents re-introduction of issues |
| Function purity classification | Identify pure functions vs those with side effects; easier to test and refactor | Low | Tag functions as pure/impure in comments; informs testing strategy |
| Dependency injection patterns | Decouple modules for easier testing; inject dependencies rather than hard-coding | High | Significant value but requires architectural changes; consider for phase 2 |
| Browser compatibility validation matrix | Document tested browser versions and validate after refactoring | Low | Currently works in Chrome, Edge, Firefox, Safari; formalize validation |
| Performance baseline comparison | Ensure refactored code performs at least as well as original | Low | Measure processing time for large BOMs before and after |
| Module boundary interface documentation | Clear contracts between modules (inputs, outputs, responsibilities) | Low | Enables parallel development; reduces coupling |
| Automated code extraction tooling | IDE refactoring tools or scripts to extract functions systematically | Medium | Reduces manual error; tools like WebStorm have JS refactoring support |
| Test coverage metrics | Quantify what's tested vs not tested; identify gaps before refactoring | Medium | Coverage tools show untested code paths; focus test expansion efforts |
| Rollback checkpoints | Git commits after each successful extraction batch | Low | Fine-grained history enables surgical rollbacks if issues discovered |

## Anti-Features

Features to explicitly NOT build. Common mistakes in refactoring domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Big-bang refactor (all at once) | Highest risk pattern; trying to refactor everything simultaneously causes prolonged delays, dual maintenance, and usually fails | Incremental extraction: 3-8 files per batch, test after each, merge when stable |
| Build tool / bundler introduction | Adds complexity, deployment overhead, build failures, and learning curve for non-technical owner | Use `<script>` tags in correct order; simple, works on GitHub Pages, no build step |
| Changing coding style during refactor | Mixed style causes confusion; reviewers can't distinguish refactor from rewrites | Keep exact same code style; separate refactoring from style improvements |
| Framework adoption during refactor | Two simultaneous changes (structure + framework) multiplies risk and makes rollback impossible | Refactor in vanilla JS; consider frameworks later as separate project |
| ES module conversion (import/export) | Adds browser compatibility concerns and bundler pressure; unnecessary complexity | Use global functions initially; ES modules can be added later incrementally |
| Premature abstraction | Creating abstractions that don't exist in current code changes behavior and adds complexity | Extract code as-is first; identify abstraction opportunities after stable |
| Test rewriting | Changing tests during refactoring removes safety net; can't distinguish test bugs from code bugs | Keep tests unchanged; adapt test harness to call refactored code the same way |
| Concurrent feature development | Adding features while refactoring requires changes in two places; delays and conflicts | Feature freeze during refactoring; merge refactor first, then resume features |
| Inconsistent module boundaries | Ad-hoc file splitting creates tangled dependencies and defeats modularity purpose | Plan module structure upfront; follow consistently; don't mix concerns |
| Manual file operations without version control | Refactoring without git commits makes mistakes unrecoverable | Commit after every successful extraction batch; branch for safety |
| Refactoring without existing tests | "You can't refactor without tests" - no way to guarantee code paths still work | Expand test coverage BEFORE refactoring; characterization tests for untested areas |
| Vendoring CDN dependencies mid-refactor | Changing dependency loading mechanism and file structure simultaneously multiplies risk | Keep CDN dependencies as-is; consider vendoring as separate project later |
| Performance optimization during refactor | Optimizing while restructuring conflates goals; can't isolate performance impact | Measure performance before/after; optimize separately if needed after stable |
| UI/UX changes during refactor | Mixing visual changes with structural changes makes regression testing impossible | Zero UI change rule; exact same look and behavior |

## Feature Dependencies

```
MUST HAPPEN FIRST (Foundation):
1. Test harness adaptation
   - Adapt test/run-tests.js to load from multiple files instead of extracting from HTML
   - Validate tests still pass against original single-file version
   - Tests become safety net for all subsequent extraction

2. Side effect audit + initialization order documentation
   - Map all global variables and when they're initialized
   - Identify all DOM manipulation at script load time
   - Document current load order dependencies
   - Prevents initialization order bugs (biggest refactoring risk)

3. Module boundary planning
   - Define which functions belong in which files
   - Identify cross-module dependencies
   - Check for circular dependencies
   - Creates extraction roadmap

CORE REFACTORING (Sequential batches):
4. Extract core logic first (parser, tree, flatten, compare)
   - Leaf modules with fewest dependencies
   - Pure business logic, minimal DOM coupling
   - Test after each module extraction

5. Extract UI/tab logic (flat-bom, comparison, hierarchy)
   - Depends on core logic being stable
   - More DOM coupling, more side effects
   - Test after each module extraction

6. Extract export logic (excel, html)
   - Depends on core logic
   - Verify both Excel and HTML exports work identically
   - Test after extraction

7. Extract CSS to styles.css
   - Independent extraction, low risk
   - Verify styling identical in all browsers

8. Update index.html to load modules
   - Final step: wire everything together
   - Critical: correct script tag order
   - Full end-to-end testing

VALIDATION (Post-refactor):
9. Full regression test suite
   - All 4 validation tests must pass
   - Excel outputs match baseline byte-for-byte
   - Browser testing across Chrome, Edge, Firefox, Safari

10. Deploy to GitHub Pages
    - Verify multi-file structure works in production
    - Test with real SOLIDWORKS PDM exports
    - Operations team validation with actual BOMs
```

## MVP Recommendation

For a safe, successful refactor, prioritize:

### Phase 1: Preparation (Before any code splitting)
1. **Test harness adaptation** - Adapt Node.js test runner to load functions from multiple files
2. **Side effect audit** - Document all global variables, initialization order, DOM manipulation timing
3. **Module boundary definition** - Create detailed extraction plan with dependency map
4. **Baseline validation** - Run all 4 tests, capture outputs as golden masters
5. **Git branch creation** - Create `refactor/multi-file` branch

### Phase 2: Core Logic Extraction (First batch)
1. **Extract parser.js** - parseCSV(), parseXML() (minimal dependencies)
2. **Extract tree.js** - BOMNode class, buildTree(), getParentLevel()
3. **Test checkpoint** - Run all 4 tests, verify outputs match baseline exactly
4. **Git commit** - "Extract parser and tree modules"

### Phase 3: Processing Logic Extraction (Second batch)
1. **Extract flatten.js** - flattenBOM(), getCompositeKey(), decimalToFractional()
2. **Extract compare.js** - compareBOMs(), createDiff()
3. **Test checkpoint** - Run all 4 tests, verify outputs match baseline exactly
4. **Git commit** - "Extract flatten and compare modules"

### Phase 4: UI Logic Extraction (Third batch)
1. **Extract tabs/flat-bom.js** - All Flat BOM tab UI and event handlers
2. **Extract tabs/comparison.js** - All Comparison tab UI and event handlers
3. **Test checkpoint** - Run all 4 tests, verify outputs match baseline exactly
4. **Git commit** - "Extract Flat BOM and Comparison tab modules"

### Phase 5: Final Modules (Fourth batch)
1. **Extract tabs/hierarchy.js** - Hierarchy tab UI and tree rendering
2. **Extract export/excel.js** - Excel export for all tabs
3. **Extract export/html.js** - HTML export for all tabs
4. **Test checkpoint** - Run all 4 tests, verify outputs match baseline exactly
5. **Git commit** - "Extract hierarchy and export modules"

### Phase 6: Structure and Wiring (Final batch)
1. **Extract css/styles.css** - Move all CSS to separate file
2. **Extract js/main.js** - Initialization and cross-module wiring
3. **Update index.html** - Clean HTML structure, correct script load order
4. **Test checkpoint** - Run all 4 tests, verify outputs match baseline exactly
5. **Browser validation** - Test in Chrome, Edge, Firefox, Safari
6. **Git commit** - "Complete multi-file refactor structure"

### Phase 7: Deployment and Validation
1. **Deploy to GitHub Pages** - Push refactored code to production
2. **Real-world validation** - Operations team tests with actual SOLIDWORKS exports
3. **Performance comparison** - Verify processing time for large BOMs unchanged
4. **Merge to main** - Merge `refactor/multi-file` branch after full validation

## Defer to Post-MVP

Save these for after the refactor is stable and merged:

### Future Considerations (Separate projects)
- **ES module migration** - Convert from global functions to import/export (low priority; current approach works)
- **Dependency injection patterns** - Refactor for better testability (wait until IFP Merge feature scope known)
- **CDN vendoring** - Download SheetJS and Google Fonts locally (separate security/reliability project)
- **TypeScript conversion** - Add type safety (large effort; wait for team capacity)
- **Build tooling** - Only if ES modules or other features require it (avoid if possible)
- **Performance optimization** - Only if performance degrades after refactor (measure first)
- **Code style normalization** - Prettier, ESLint setup (cosmetic; separate from refactor)
- **Additional test coverage** - Expand beyond 4 core tests (valuable but not blocking)

## Key Risks by Phase

| Phase | Primary Risk | Mitigation |
|-------|--------------|------------|
| Preparation | Incomplete side effect audit | Thorough code review; document every global var, every DOM access |
| Core extraction | Breaking function dependencies | Test after every file extraction; rollback on test failure |
| UI extraction | Initialization order bugs | Document call order; test in browser after each extraction |
| Export extraction | HTML export embeds refactored code incorrectly | Verify standalone HTML exports work; test with real data |
| Wiring | Script tag load order wrong | Careful ordering; browser testing; check browser console for errors |
| Deployment | GitHub Pages serves files incorrectly | Test locally first with file:// protocol; then test on Pages |

## Success Metrics

Refactor is successful when:

1. **All 4 automated tests pass** - Outputs match baseline Excel files byte-for-byte
2. **Browser validation complete** - Works identically in Chrome, Edge, Firefox, Safari
3. **Operations team approval** - Real-world SOLIDWORKS PDM exports process correctly
4. **Zero behavior changes** - UI looks identical, all features work identically
5. **Performance maintained** - Large BOM processing time unchanged or faster
6. **Deployment successful** - Multi-file structure works on GitHub Pages
7. **Future development easier** - Team confirms modular structure improves development experience

## Sources

Research based on current web development best practices for refactoring monolithic JavaScript applications:

**Refactoring Strategy:**
- [Refactoring a monolith to microservices](https://microservices.io/refactoring/)
- [Refactoring Old Monolith Architecture: A Comprehensive Guide](https://medium.com/insiderengineering/refactoring-old-monolith-architecture-a-comprehensive-guide-7c192d7612e8)
- [How to Refactor Complex Codebases – A Practical Guide for Devs](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases/)
- [From Monolith to Modules: Refactoring a JavaScript Quiz Application](https://dev.to/blamsa0mine/from-monolith-to-modules-refactoring-a-javascript-quiz-application-5cm0)

**Testing and Validation:**
- [JavaScript modules - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Characterization test - Wikipedia](https://en.wikipedia.org/wiki/Characterization_test)
- [Golden Master Testing - patterndb-yaml](https://patterndb-yaml.readthedocs.io/en/latest/use-cases/testing/golden-master/)
- [Regression Testing: An In-Depth Guide for 2026](https://www.leapwork.com/blog/regression-testing)
- [Improving regression test efficiency with refactoring awareness](https://www.sciencedirect.com/science/article/abs/pii/S095058491830137X)

**Module Refactoring:**
- [JavaScript Modules in 2026: Practical Patterns](https://thelinuxcode.com/javascript-modules-in-2026-practical-patterns-with-commonjs-and-es-modules/)
- [Refactoring Module Dependencies](https://martinfowler.com/articles/refactoring-dependencies.html)
- [Automated refactoring of legacy JavaScript code to ES6 modules](https://www.sciencedirect.com/science/article/abs/pii/S0164121221001461)

**Common Pitfalls:**
- [7 Pitfalls to Avoid in Application Refactoring Projects](https://vfunction.com/blog/7-pitfalls-to-avoid-in-application-refactoring-projects/)
- [The High-Risk Refactoring](https://webup.org/blog/the-high-risk-refactoring/)
- [Good Refactoring vs Bad Refactoring](https://www.builder.io/blog/good-vs-bad-refactoring)
- [10 refactoring best practices: When and how to refactor code](https://www.techtarget.com/searchsoftwarequality/tip/When-and-how-to-refactor-code)

**Dependency Management:**
- [SheetJS - Standalone Browser Scripts](https://docs.sheetjs.com/docs/getting-started/installation/standalone/)
- [Web dependencies are broken. Can we fix them?](https://lea.verou.me/blog/2026/web-deps/)

**Confidence Level:** HIGH - Based on established industry practices, authoritative documentation sources, and alignment with proven refactoring patterns validated across multiple domains.
