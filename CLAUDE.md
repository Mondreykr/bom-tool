# CLAUDE.md

## User Context

- **User has zero coding experience** — provide clear explanations, be patient with git/development concepts
- **Prefers learning by doing** — keep explanations concise and practical, avoid lengthy theory
- **New to git** — always provide explicit git commands and explain what they do

## Project

**BOM Tool** — A web application for flattening, comparing, and visualizing hierarchical Bills of Materials (BOMs) from SOLIDWORKS PDM exports. Production-ready, validated against legacy Excel tools, used by Operations for procurement and work orders.

- **Stack:** HTML5, CSS3, vanilla JavaScript ES6+, SheetJS (xlsx.js) v0.18.5 via CDN
- **No build process** — native ES6 modules, no bundler, no framework
- **Deployed:** https://mondreykr.github.io/bom-tool/ (GitHub Pages, serves from main branch)
- **Development branch:** `v2.2-ifp-merge` — all new work happens here, merge to main only when ready to deploy

## File Structure

```
index.html              — Page layout (HTML only, no inline JS)
css/styles.css          — All styling
js/main.js              — Entry point (starts app on page load)
js/core/parser.js       — CSV and XML file parsing
js/core/tree.js         — BOMNode class, buildTree, sortChildren
js/core/flatten.js      — flattenBOM (tree → flat parts list)
js/core/compare.js      — compareBOMs (diff two BOMs)
js/core/utils.js        — Small helpers (parseLength, decimalToFractional, etc.)
js/ui/state.js          — All shared state (what's loaded, selected, etc.)
js/ui/flat-bom.js       — Flat BOM tab logic
js/ui/comparison.js     — BOM Comparison tab logic
js/ui/hierarchy.js      — Hierarchy View tab logic
js/export/excel.js      — Excel export for all three tabs
js/export/html.js       — HTML report export for all three tabs
js/export/shared.js     — Export utilities (date formatting, file download)
test/run-tests.js       — Automated test runner
package.json            — Node.js dependencies (for tests only)
```

## Project State

**Read `.planning/STATE.md` first** for current position, recent decisions, and what to do next.

Key planning files:
- `.planning/STATE.md` — Current position, accumulated decisions, blockers, session continuity
- `.planning/PROJECT.md` — What we're building, requirements, constraints
- `.planning/ROADMAP.md` — Phase breakdown and progress
- `BOM Tool Handoff 20251209.md` — Original complete documentation (business logic, validation results)
- `archive/` — IFP Merge planning docs, historical context

## Testing

```bash
cd test && node run-tests.js        # Run all 4 automated validation tests
```

Tests validate BOM flattening (XML + CSV) and comparison (XML + CSV) against baseline Excel outputs. All 4 must pass after every change — zero tolerance for output differences.

## Git Workflow

**Branch strategy:** Develop on `v2.2-ifp-merge`, keep main stable for production. Only merge to main when a milestone is complete and tested.

Always commit before and after changes (safety net for non-technical user).

```bash
git status                          # Check current state
git branch                          # Confirm you're on v2.2-ifp-merge (not main)
git add <files>                     # Stage specific files
git commit -m "description"         # Commit with clear message
git log --oneline -10               # See recent history
```

**Never commit directly to main.** If you find yourself on main, switch back:
```bash
git checkout v2.2-ifp-merge
```

## Working Principles

1. **Explain what you're changing and why** — helps user learn the code structure
2. **Preserve existing patterns** — code is consistent; maintain that consistency
3. **Test after every change** — run automated tests, recommend browser verification
4. **Read before editing** — understand existing code before suggesting modifications

## Environment Constraint

Corporate IT blocks localhost web servers. ES6 modules require HTTP serving (not `file://`). Use GitHub Pages deployment for browser testing.
