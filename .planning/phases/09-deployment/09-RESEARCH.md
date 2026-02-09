# Phase 9: Deployment - Research

**Researched:** 2026-02-09
**Domain:** GitHub Pages deployment with native ES6 modules
**Confidence:** HIGH

## Summary

Phase 9 deploys the refactored multi-file ES6 module structure to GitHub Pages for browser verification. The critical discovery is that **all 8 phases of refactoring have already been completed on the main branch** — there is no separate `refactor/multi-file` branch as originally planned. This changes the deployment strategy: instead of merging a feature branch, deployment verifies the current main branch works correctly in a browser environment.

GitHub Pages fully supports native ES6 modules when served over HTTPS. The project's structure (index.html at root, js/ and css/ folders, CDN-loaded SheetJS) is already deployment-ready. The key risk is that ES6 modules **require HTTP serving** (not file:// protocol), so browser verification has been deferred throughout the entire refactor. This phase is the first opportunity to test the application in a real browser environment.

**Primary recommendation:** Enable GitHub Pages to deploy directly from main branch root folder, verify all three tabs load and function correctly, and establish a git-based rollback plan using revert commits if issues are discovered.

## Standard Stack

### Core Deployment Platform
| Component | Configuration | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| GitHub Pages | Deploy from main branch root | Static hosting with HTTPS | Free, automatic HTTPS, native ES6 module support, integrated with git workflow |
| Native ES6 Modules | `<script type="module">` | Module loading in browser | 95.69% browser support (Chrome 61+, Safari 11+, Firefox 60+, Edge 79+), no build tools needed |
| CDN Dependencies | cdnjs.cloudflare.com | External library loading | SheetJS v0.18.5 loaded before modules execute, widely reliable |

### Verification Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Browser DevTools | Console errors, network requests, module loading | First verification step after deployment |
| Git revert | Rollback to previous working state | If deployment breaks functionality |
| Automated tests | Pre-deployment validation | Before every commit to main |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Pages | Netlify, Vercel, Cloudflare Pages | More features (redirects, custom headers, edge functions) but adds deployment complexity — unnecessary for static ES6 modules |
| Direct main branch | GitHub Actions workflow | More control over build steps but adds workflow complexity — unnecessary since no build process exists |
| Native modules | Webpack/Vite bundling | Browser compatibility for older browsers, but project requires zero build tools as constraint |

**Installation:**
No installation required — GitHub Pages is enabled through repository settings.

## Architecture Patterns

### Deployment Flow

**Pattern 1: Branch-Based Deployment (Recommended)**
```
1. Enable GitHub Pages in repository settings
2. Configure: Deploy from "main" branch, "/" (root) folder
3. Push commit to main → automatic deployment
4. Wait ~1-3 minutes for build/deploy
5. Visit https://mondreykr.github.io/bom-tool/
```

**When to use:** For zero-build static sites with ES6 modules — GitHub Pages serves files directly from repository without transformation.

**Why recommended for this project:**
- No build process to configure
- Automatic deployment on every commit to main
- Simple rollback via git revert
- Matches project constraint "no build tools"

### Pattern 2: Manual Verification Checklist

**What:** Systematic browser testing after deployment
**When to use:** First deployment and after any structural changes

**Verification sequence:**
```markdown
1. Page loads without console errors
2. All three tabs render (Flat BOM, Comparison, Hierarchy)
3. Tab switching works
4. File upload triggers correctly
5. BOM flattening produces results table
6. BOM comparison shows Added/Removed/Changed
7. Hierarchy view renders tree with expand/collapse
8. All six export buttons function (Excel + HTML for each tab)
9. DevTools Network tab shows all .js files load with 200 status
10. No MIME type errors in console
```

### Pattern 3: Git-Based Rollback

**What:** Revert commits to restore previous working state
**When to use:** If deployment reveals breaking bugs

**Rollback strategy:**
```bash
# Option A: Revert specific commit (preserves history, safe for shared branches)
git revert <commit-hash>
git push origin main

# Option B: Revert to previous tag/commit and redeploy
git checkout <previous-working-commit>
git checkout -b temp-rollback
git push origin temp-rollback
# Then: Change GitHub Pages source to temp-rollback branch temporarily

# Option C: For emergency immediate rollback if main is broken
# Create new commit that restores index.html from last known good commit
git show <commit-hash>:index.html > index.html
git commit -am "fix: emergency rollback to restore working state"
git push origin main
```

**Critical:** NEVER use `git reset --hard` on main branch — rewrites history, breaks for non-technical user.

### Anti-Patterns to Avoid

- **Don't push directly to gh-pages branch manually:** GitHub Pages with main branch source handles deployment automatically — manual gh-pages commits bypass the source configuration and cause confusion
- **Don't use relative paths with leading slash:** Paths like `/js/main.js` break if repo deploys to `username.github.io/repo-name/` subdirectory — use `./js/main.js` instead
- **Don't rely on file:// protocol testing:** ES6 modules fail with CORS errors over file:// — always verify via HTTPS deployment
- **Don't assume localhost behavior matches GitHub Pages:** Module resolution, CORS, MIME types differ between local servers and GitHub Pages

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Static site hosting | Custom AWS S3/CloudFront config | GitHub Pages branch deployment | Free, automatic HTTPS, integrated with git, zero configuration files needed |
| Deployment automation | Custom GitHub Actions workflow | Branch-based auto-deploy | GitHub Pages auto-deploys on push to source branch — no workflow file needed |
| Module bundling/transpilation | Webpack, Vite, Rollup config | Native ES6 modules via `<script type="module">` | 95.69% browser support, zero build step, matches project constraint |
| Rollback mechanism | Custom backup/restore scripts | Git revert commits | Built into git, preserves history, recoverable by non-technical user |
| MIME type configuration | .htaccess, _headers files | GitHub Pages defaults | GitHub Pages serves .js files with correct `text/javascript` MIME type automatically |

**Key insight:** GitHub Pages is designed for exactly this use case — static HTML/CSS/JS sites with no build process. Adding custom deployment tooling introduces complexity, failure modes, and maintenance burden with zero benefit for native ES6 modules.

## Common Pitfalls

### Pitfall 1: MIME Type Errors from 404s
**What goes wrong:** Browser console shows "Expected JavaScript module but received MIME type 'text/html'" errors, modules fail to load

**Why it happens:** When GitHub Pages can't find a requested .js file, it returns a 404 error page as HTML. The browser expects JavaScript but receives HTML (MIME type text/html), triggering strict MIME type checking failure.

**How to avoid:**
- Verify all module import paths are correct (case-sensitive)
- Check DevTools Network tab for 404 errors before diagnosing MIME issues
- Use relative paths (`./js/main.js`) not absolute (`/js/main.js`)
- Ensure file extensions are `.js` not `.mjs` (unless intentionally using .mjs)

**Warning signs:** Console errors mentioning "MIME type", Network tab showing HTML responses for .js file requests

### Pitfall 2: Underscore Directory Blocking
**What goes wrong:** Files in `_app/`, `_components/`, or other `_*` directories return 404 errors, fail to load

**Why it happens:** GitHub Pages blocks access to any filename or directory beginning with underscore — legacy Jekyll behavior prevents serving these files

**How to avoid:**
- Never create directories starting with underscore
- If using a framework that generates `_app/` folders (Vite, SvelteKit), add `.nojekyll` file to repository root

**Warning signs:** Specific directories consistently return 404, other files load correctly

**Not applicable to this project:** BOM Tool uses `js/`, `css/`, `test/` directories — no underscores

### Pitfall 3: Branch vs Folder Configuration Mismatch
**What goes wrong:** GitHub Pages shows "site not found" or serves old content despite recent commits

**Why it happens:** Repository settings specify wrong source branch or wrong folder (root vs /docs) — GitHub Pages deploys from configured source, ignoring commits to other locations

**How to avoid:**
- Verify Settings → Pages → Source shows correct branch (main) and folder (root)
- Check Actions tab for deployment status after pushing commits
- Clear browser cache or use incognito mode when testing changes

**Warning signs:** Recent commits don't appear on deployed site, deployment timestamp doesn't update

### Pitfall 4: Private Repository on Free Plan
**What goes wrong:** GitHub Pages deployment is disabled or fails silently

**Why it happens:** Free GitHub accounts cannot deploy private repositories to GitHub Pages — feature restricted to paid plans

**How to avoid:**
- Ensure repository visibility is set to Public (Settings → General → Danger Zone)
- Or upgrade to GitHub Pro/Team if private deployment is required

**Warning signs:** "Pages" settings section shows disabled or grayed-out options

**Current project status:** Repository at https://github.com/Mondreykr/bom-tool.git — verify visibility before enabling Pages

### Pitfall 5: CDN Loading Order Violation
**What goes wrong:** Application throws "XLSX is not defined" errors in browser console despite SheetJS loading correctly in automated tests

**Why it happens:** ES6 modules with `type="module"` are deferred by default and may execute before non-module scripts finish. If `js/main.js` imports modules that use `XLSX` global, they might execute before `<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>` finishes.

**How to avoid:**
- Ensure SheetJS CDN script appears before `<script type="module" src="js/main.js"></script>` in index.html
- Current project structure already correct: SheetJS line 7, main.js line 393

**Warning signs:** "XLSX is not defined" errors in browser console but not in Node tests, export functions fail

### Pitfall 6: Atomic Commit Discipline Breakdown
**What goes wrong:** A single commit changes multiple files, tests fail, rollback becomes risky because working state is unclear

**Why it happens:** Rushing to "just deploy" without maintaining the atomic commit discipline from Phases 1-8

**How to avoid:**
- Continue atomic commit pattern: one logical change per commit
- Run automated tests before EVERY commit: `cd test && node run-tests.js`
- Verify tests pass at current commit before pushing to trigger deployment

**Warning signs:** Commits with messages like "fix everything" or "deployment changes", multiple unrelated file changes in single commit

## Code Examples

Verified patterns from official sources:

### Enabling GitHub Pages (Branch-Based)
```
Repository Settings → Pages → Build and deployment
├─ Source: Deploy from a branch
├─ Branch: main
└─ Folder: / (root)

Save → Wait 1-3 minutes → Visit https://mondreykr.github.io/bom-tool/
```
**Source:** [GitHub Docs - Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Verification in Browser DevTools
```javascript
// Open https://mondreykr.github.io/bom-tool/ in browser
// Open DevTools (F12) → Console tab

// Check for errors (should be empty except normal app logs)
// Console output example if working correctly:
// (no errors)

// Check Network tab → Filter by JS
// All module files should show:
// main.js          200  application/javascript
// flat-bom.js      200  application/javascript
// comparison.js    200  application/javascript
// hierarchy.js     200  application/javascript
// tree.js          200  application/javascript
// parser.js        200  application/javascript
// etc.

// If you see:
// main.js          404  text/html
// ^ This is the "MIME type error from 404" pitfall — file path is wrong
```

### Safe Rollback via Git Revert
```bash
# List recent commits to find the problematic one
git log --oneline -10

# Revert the specific commit (creates new "undo" commit)
git revert <commit-hash>

# Push to trigger redeployment with reverted changes
git push origin main

# GitHub Pages will auto-deploy the reverted state in 1-3 minutes
```
**Source:** [Getting Legit with Git and GitHub: Rolling Back Changes with Revert and Reset](https://thenewstack.io/getting-legit-with-git-and-github-rolling-back-changes-with-revert-and-reset/)

### Browser Compatibility Check
```html
<!-- Current project already uses correct pattern -->
<script type="module" src="js/main.js"></script>

<!-- Supported by all modern browsers as of 2026:
     - Chrome 61+ (Sep 2017)
     - Safari 11+ (Sep 2017)
     - Firefox 60+ (May 2018)
     - Edge 79+ (Jan 2020)
     - 95.69% global browser coverage
-->

<!-- Optional fallback for ancient browsers (not needed for this project): -->
<script nomodule src="legacy-bundle.js"></script>
```
**Source:** [ECMAScript modules and browser compatibility](https://molily.de/ecmascript-modules/)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deploy from `gh-pages` branch | Deploy from any branch via Settings | ~2020 | Simplified workflow — no need for orphan branches, deploy from main directly |
| Manual Jekyll builds | Auto-build on push OR GitHub Actions | 2022-2024 | Automatic deployment, no manual build step required |
| Static site generators (Jekyll) required | Native HTML/CSS/JS support | Always supported | Zero build tools for simple sites, ES6 modules work natively |
| http-server, python -m http.server for local testing | GitHub Pages deployment for testing | N/A for this project | Corporate IT blocks localhost servers, deployment is only testing option |

**Deprecated/outdated:**
- **`gh-pages` npm package:** Still works but unnecessary — GitHub Pages deploys from configured branch automatically, no deployment script needed
- **Jekyll assumption:** GitHub Pages no longer requires Jekyll — serves static files directly if no `_config.yml` exists
- **Manual GitHub Actions workflow for static sites:** Branch-based deployment auto-triggers, custom workflow only needed for build processes (Vite, Next.js, etc.)

## Current Project Reality

### Critical Discovery: No Refactor Branch Exists

**ROADMAP says:** "All refactor work completed on refactor/multi-file branch" (DEPLOY-01)

**REALITY:** All 8 phases of refactoring completed directly on `main` branch:
```
git branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
```

**Implication:** There is no feature branch to merge. The `main` branch IS the refactored codebase. Deployment strategy must adapt to this reality.

### What This Means for Phase 9

**Original plan assumed:**
1. Refactoring happens on separate branch
2. Deployment = merge refactor branch → main
3. Rollback = revert merge commit

**Actual situation:**
1. Refactoring already on main (Phases 1-8 complete)
2. Deployment = enable GitHub Pages for main branch
3. Rollback = revert specific commit(s) if browser testing reveals issues

**Revised deployment goals:**
1. Enable GitHub Pages to deploy from main branch root
2. Verify multi-file structure works in browser environment (first browser test of entire refactor)
3. Document any issues discovered and create fixes as atomic commits
4. Establish rollback procedure if critical bugs are found

### Current File Structure (Deployment-Ready)
```
bom-tool/
├── index.html              # 394 lines, zero inline JS/CSS
├── css/
│   └── styles.css          # ~800 lines, extracted in Phase 2
├── js/
│   ├── main.js             # Entry point, extracted in Phase 8
│   ├── core/               # Business logic modules
│   │   ├── parser.js
│   │   ├── tree.js
│   │   ├── flatten.js
│   │   ├── compare.js
│   │   ├── utils.js
│   │   └── environment.js
│   ├── ui/                 # Tab UI modules
│   │   ├── state.js
│   │   ├── flat-bom.js
│   │   ├── comparison.js
│   │   └── hierarchy.js
│   └── export/             # Export modules
│       ├── shared.js
│       ├── excel.js
│       └── html.js
├── test/                   # Test infrastructure (not deployed)
│   └── run-tests.js
├── test-data/              # Validation baselines (not deployed)
├── package.json            # ES6 module config for Node tests
└── .gitignore              # node_modules excluded
```

**GitHub Pages will serve:**
- `index.html` at root → https://mondreykr.github.io/bom-tool/
- All files in `js/` and `css/` directories
- SheetJS loaded from CDN (https://cdnjs.cloudflare.com)

**GitHub Pages will NOT serve:**
- `node_modules/` (ignored by git via .gitignore)
- `test/` and `test-data/` (included in repo but not used by browser app)
- `.planning/` directory (documentation, not needed for app)

## Open Questions

1. **Is the repository currently public?**
   - What we know: Repository URL is https://github.com/Mondreykr/bom-tool.git
   - What's unclear: Current visibility setting (public vs private)
   - Recommendation: Verify repository is public before enabling GitHub Pages (free plan requirement)
   - Verification: Visit repository URL in incognito browser window OR check Settings → General → Danger Zone

2. **Has GitHub Pages been previously enabled?**
   - What we know: No `.github/workflows/` directory exists, no gh-pages branch exists
   - What's unclear: Whether Settings → Pages shows existing configuration
   - Recommendation: Check Settings → Pages before proceeding — if already configured, deployment may be live
   - Verification: Visit https://mondreykr.github.io/bom-tool/ and check if site exists

3. **What is the current automated test status?**
   - What we know: Tests baseline is 2/4 passing (established during Phase 1)
   - What's unclear: Does current main branch pass 2/4 tests right now, before deployment?
   - Recommendation: Run `cd test && node run-tests.js` before enabling GitHub Pages to establish pre-deployment baseline
   - Verification: Confirm 2/4 passing matches expected baseline

4. **Does the deployed site need a custom domain?**
   - What we know: Default GitHub Pages URL is `https://mondreykr.github.io/bom-tool/`
   - What's unclear: Whether user/operations team requires custom domain (e.g., bomtool.company.com)
   - Recommendation: Start with default GitHub Pages URL; custom domain can be added later if needed
   - Note: Custom domain requires DNS configuration and may require IT involvement

## Sources

### Primary (HIGH confidence)
- [GitHub Docs - Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) - Publishing methods, branch-based vs Actions
- [GitHub Docs - Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) - GitHub Actions workflow configuration
- [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - ES6 module syntax and browser support
- [ECMAScript modules and browser compatibility](https://molily.de/ecmascript-modules/) - Browser support timeline (Chrome 61, Safari 11, Firefox 60, Edge 79)
- [Can I Use ES6](https://caniuse.com/es6) - 95.69% global browser support

### Secondary (MEDIUM confidence)
- [GitHub Actions - deploy-pages action](https://github.com/actions/deploy-pages) - Official deployment action (not needed for this project but good reference)
- [jsDelivr CDN](https://www.jsdelivr.com/) - Free CDN for npm/GitHub packages, SheetJS hosting reliability
- [Deploying to GitHub Pages? Don't Forget to Fix Your Links](https://maximorlov.com/deploying-to-github-pages-dont-forget-to-fix-your-links/) - Path resolution for subdirectory deployments

### Tertiary (LOW confidence — community discussions, needs verification)
- [GitHub Community Discussion #112227 - Making Github Pages work with script type="module"](https://github.com/orgs/community/discussions/112227) - ES6 module support claims (contradictory information)
- [GitHub Community Discussion #47907 - GitHub Pages yields 404 on JS module request](https://github.com/orgs/community/discussions/47907) - MIME type troubleshooting (404 → text/html issue)
- [GitHub Community Discussion #157852 - Configure GitHub Pages CORS headers?](https://github.com/orgs/community/discussions/157852) - CORS limitations (no custom headers possible)
- [Getting Legit with Git and GitHub: Rolling Back Changes with Revert and Reset](https://thenewstack.io/getting-legit-with-git-and-github-rolling-back-changes-with-revert-and-reset/) - Git revert vs reset strategies

## Metadata

**Confidence breakdown:**
- Standard stack (GitHub Pages + native ES6): **HIGH** - Official GitHub docs, MDN, 95.69% browser support verified
- Architecture patterns (branch deployment, verification checklist): **HIGH** - Standard GitHub Pages workflow, proven approach
- Pitfalls (MIME type errors, underscore blocking, CDN order): **HIGH** - Verified via official docs and multiple community reports
- Rollback strategy (git revert): **MEDIUM-HIGH** - Git revert is standard practice, but first-time rollback for non-technical user adds risk
- Current project status (no refactor branch): **HIGH** - Verified via `git branch -a` command output

**Research date:** 2026-02-09
**Valid until:** ~30 days (2026-03-11) — GitHub Pages deployment workflow is stable, ES6 module support is stable, unlikely to change

**Critical risks for Phase 9:**
1. **First browser verification of entire refactor** — All 8 phases tested only via automated Node.js tests; this is first real browser environment test
2. **Corporate IT constraint still applies** — No localhost testing available, deployment to GitHub Pages is only verification option
3. **Non-technical user rollback** — If deployment reveals critical bugs, rollback procedure must be clear and safe for user with zero coding experience
4. **Test baseline is 2/4 passing** — 50% test passage rate throughout refactor; deployment may reveal issues not caught by passing tests

**Recommended Phase 9 approach:**
1. Pre-flight check: Run automated tests, verify 2/4 baseline
2. Enable GitHub Pages: Settings → Pages → Deploy from main branch root
3. Wait for deployment (1-3 minutes)
4. Systematic browser verification: Follow manual checklist (all 3 tabs, uploads, exports)
5. Document any issues discovered
6. Create atomic fix commits if needed (maintain Phase 1-8 discipline)
7. Establish clear rollback procedure for user
8. Confirm deployment success before proceeding to Phase 10 (Final Validation)
