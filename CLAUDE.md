# CLAUDE.md

## User Context

- **User has zero coding experience** — provide clear explanations, be patient with git/development concepts
- **Prefers learning by doing** — keep explanations concise and practical, avoid lengthy theory
- **New to git** — always provide explicit git commands and explain what they do

## Project

**BOM Tool 2.1** — A web application for flattening, comparing, and visualizing hierarchical Bills of Materials (BOMs) from SOLIDWORKS PDM exports. Production-ready, validated against legacy Excel tools, used by Operations for procurement and work orders.

- **Stack:** HTML5, CSS3, vanilla JavaScript ES6+, SheetJS (xlsx.js) v0.18.5 via CDN
- **No build process** — native ES6 modules, no bundler, no framework
- **Currently being refactored** from single-file to multi-file architecture

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

Always commit before and after changes (safety net for non-technical user).

```bash
git status                          # Check current state
git add <files>                     # Stage specific files
git commit -m "description"         # Commit with clear message
git log --oneline -10               # See recent history
```

## Working Principles

1. **Explain what you're changing and why** — helps user learn the code structure
2. **Preserve existing patterns** — code is consistent; maintain that consistency
3. **Test after every change** — run automated tests, recommend browser verification
4. **Read before editing** — understand existing code before suggesting modifications

## Environment Constraint

Corporate IT blocks localhost web servers. ES6 modules require HTTP serving (not `file://`). Browser verification is deferred to GitHub Pages deployment.
