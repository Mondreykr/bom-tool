# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Accurate BOM processing that Operations can trust
**Current focus:** Phase 14 complete — Phase 15 next

## Current Position

Phase: 14.2 of 15 (Test Suite Issue Fixes)
Plan: 1 of 2 (14.2-01 complete)
Status: In progress
Last activity: 2026-02-15 - Completed Plan 14.2-01: Core logic fixes (source labels, validation messages, job number, revision, 258758 fix)

Progress: [███████████████████░] 96% (14.1 of 15 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 26
- Average duration: 9 min
- Total execution time: 3.8 hours

**By Phase (v1.0 complete):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | 23 min | 12 min |
| 2 | 1 | 5 min | 5 min |
| 3 | 1 | 4 min | 4 min |
| 4 | 1 | 5 min | 5 min |
| 5 | 2 | 12 min | 6 min |
| 6 | 3 | 38 min | 13 min |
| 7 | 2 | 18 min | 9 min |
| 8 | 1 | 8 min | 8 min |
| 9 | 2 | 62 min | 31 min |
| 10 | 2 | 17 min | 9 min |
| 11 | 2 | 5 min | 3 min |
| 12 | 2 | 5 min | 3 min |
| 13 | 2 | 6 min | 3 min |
| 14 | 2 | 9 min | 5 min |
| 14.1 | 1 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 5, 1, 4, 5, 4 min
- Trend: Fast execution continues for validation and testing

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Feature branch for v2.2+**: Protects production (main) during development; merge when milestone is complete
- **B(n) format: JSON with SHA-256 hash**: Machine-readable, reimportable, tamper-detectable; browser has native crypto APIs
- **Canonical JSON with sorted keys**: Ensures deterministic hashing across JS engines regardless of property insertion order
- **formatVersion field in artifacts**: Enables future format evolution without breaking imports
- **4th tab for IFP Merge**: Distinct workflow from existing 3 tabs; Engineering uses it, Operations ignores it
- **State whitelist (IFP/IFU/Released)**: Three approved states; everything else is WIP by exclusion; "Released" added for hardware parts
- **WIP assembly node tagged as 'grafted'**: At graft points, the WIP assembly node itself is tagged grafted (not current), because its metadata comes from B(n-1)
- **Empty placeholders for never-released WIP**: WIP assemblies with no prior release become empty nodes with zero children, preserving tree structure and making gaps visible
- **Qty at graft point comes from X(n)**: At graft boundaries, qty is sourced from X(n) (parent's approved declaration), while all other fields and children come from B(n-1)
- **Change annotations are informational**: Field differences between X(n) and B(n-1) at graft points are stored but do not block merge
- **State field excluded from change comparison**: State is inherently different (WIP vs Released), so it's excluded from change annotations to reduce noise
- **Missing assemblies generate warnings only**: Assemblies in B(n-1) but absent from X(n) generate warnings but are NOT carried forward
- [Phase 13]: Assembly identification uses NS Item Type field (not Component Type) as authoritative source
- [Phase 14]: State pills on ALL nodes (assemblies and parts) for pure visual pattern recognition
- [Phase 14]: Tree defaults to first level expanded to show immediate state landscape
- [Phase 14]: "Released" PDM state added to whitelist for hardware parts
- [Phase 14.1]: Metadata validation runs on EVERY node before merge-level validation (Rules 0-2)
- [Phase 14.1]: rawLength field preserves raw string for cross-field validation (Rule 9)
- [Phase 14.1]: All metadata rules (3-9) are hard blocks with traceable rule IDs

### Roadmap Evolution

- Phase 14.1 inserted after Phase 14: Metadata Validation Rules 3–9 — dedicated validation module with rule ID traceability (URGENT)
- Phase 14.2 inserted after Phase 14: Test Suite Issue Fixes — UI/UX bugs from test-suite-1-20260215.md (URGENT)

### Pending Todos

User has notes from visual testing to share — may generate items for Phase 15 or gap closure.

### Blockers/Concerns

**IT constraint:**
- Corporate IT blocks localhost web servers
- Browser testing requires GitHub Pages deployment

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Suspend Rule 5 (revision validation) - comment out, keep code, update docs | 2026-02-15 | c7ec966 | [1-suspend-rule-5-revision-validation-comme](./quick/1-suspend-rule-5-revision-validation-comme/) |
| 2 | Standardize validation error format to breadcrumb paths | 2026-02-15 | 9ce60d5 | [2-standardize-validation-error-format](./quick/2-standardize-validation-error-format/) |

## Session Continuity

Last session: 2026-02-15 (Phase 14.2 execution)
Stopped at: Plan 14.2-01 complete, Plan 14.2-02 next
Resume file: .planning/phases/14.2-test-suite-issue-fixes/14.2-01-SUMMARY.md

Next action: Execute Plan 14.2-02 (UI/layout fixes)

---
*Last updated: 2026-02-15 after Phase 14.2 context gathered*
