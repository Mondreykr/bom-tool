# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Accurate BOM processing that Operations can trust
**Current focus:** Phase 13 - Validation System

## Current Position

Phase: 13 of 15 (Validation System)
Plan: 1 of 2 (In Progress)
Status: In Progress
Last activity: 2026-02-12 — Pre-merge validation system implemented with nsItemType-based assembly identification (plan 13-01 complete)

Progress: [████████░░░░░░░░░░░░] 86% (13 of 15 phases, 1 of 2 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: 9 min
- Total execution time: 3.5 hours

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
| 13 | 1 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 2, 3, 2, 3, 5 min
- Trend: Consistent fast execution for TDD algorithm work

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
- **State whitelist (IFP/IFU = Released)**: Only two approved states; everything else is WIP by exclusion; future-proof
- **WIP assembly node tagged as 'grafted'**: At graft points, the WIP assembly node itself is tagged grafted (not current), because its metadata comes from B(n-1)
- **Empty placeholders for never-released WIP**: WIP assemblies with no prior release become empty nodes with zero children, preserving tree structure and making gaps visible
- **Qty at graft point comes from X(n)**: At graft boundaries, qty is sourced from X(n) (parent's approved declaration), while all other fields and children come from B(n-1)
- **Change annotations are informational**: Field differences between X(n) and B(n-1) at graft points are stored but do not block merge
- **State field excluded from change comparison**: State is inherently different (WIP vs Released), so it's excluded from change annotations to reduce noise
- **Missing assemblies generate warnings only**: Assemblies in B(n-1) but absent from X(n) generate warnings but are NOT carried forward
- [Phase 13]: Assembly identification uses NS Item Type field (not Component Type) as authoritative source

### Pending Todos

None yet.

### Blockers/Concerns

**IT constraint:**
- Corporate IT blocks localhost web servers
- Browser testing requires GitHub Pages deployment

## Session Continuity

Last session: 2026-02-12 (plan 13-01 execution)
Stopped at: Completed 13-01-PLAN.md (Validation System and Assembly Identification) — Pre-merge validation with nsItemType-based assembly detection, Rule 0/1/2 validation, full error collection
Resume file: None

Next action: Proceed to Phase 13 Plan 02 — UI integration for validation feedback

---
*Last updated: 2026-02-12 after plan 13-01 completion*
