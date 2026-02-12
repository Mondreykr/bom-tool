# Phase 12: JSON Artifact Format - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Export merged IFP BOMs as JSON files with integrity verification, and import prior artifacts for subsequent merges. Covers the data format (ARTF-01), hash computation (ARTF-02), import validation (ARTF-03, ARTF-04), filename generation (ARTF-05), and revision numbering (ARTF-06). UI for triggering export/import belongs to Phase 14.

</domain>

<decisions>
## Implementation Decisions

### Artifact metadata
- Include merge summary stats in JSON (passedThrough, grafted, placeholders counts)
- Include source filenames: both X(n) XML filename and B(n-1) JSON filename
- Include change annotations (`_changes` on graft-point nodes) — structured per-node data useful for artifact review
- Exclude merge warnings — transient process artifacts, already represented by summary stats
- Include `_source` tags on all nodes — needed for cross-tab display (Phase 15)

### Validation behavior
- Hash verification failure: Claude's Discretion on strictness (hard block vs warn+override)
- GA part number mismatch between X(n) and B(n-1): warn but allow override — user may have valid reasons
- Revision gap detection: warn about non-sequential revision numbers (e.g., REV2 to REV5), but allow
- Error messages: detailed — show expected vs actual values (e.g., "Hash mismatch: expected abc123, found def456")

### Revision numbering
- REV0: fixed at 0, no override — REV0 means REV0
- REV1+: auto-suggest from B(n-1) revision + 1, user can override
- Re-exporting same revision number: allowed freely — date in filename differentiates

### Job number and filename
- Filename pattern: `{JOB_NUMBER}-IFP REV{n} (MMM D, YYYY).json`
- Job number is NOT always the root PN — it's a company convention ("1J" + number), usually matches root PN (~90%) but differs for standard products
- Job number stored in artifact metadata so subsequent merges can pull it from B(n-1)
- REV0: auto-suggest "1J" + root PN, user can edit
- REV1+: pull job number from B(n-1), user can still edit
- Job number always starts with "1J" (company convention)

### Claude's Discretion
- Hash verification strictness (hard block vs warn+override)
- SHA-256 hash computation approach (what's included/excluded from hash input)
- JSON structure (nesting, field naming conventions)
- How import logic handles stale `_changes` from B(n-1)

</decisions>

<specifics>
## Specific Ideas

- Job numbers are job-centric: "1J258730" is the job, "258730" is typically the corresponding GA part number, but standard products (e.g., PN 101-65-30) get a different job number that doesn't match the PN
- The 1J prefix is a company-wide convention — all job numbers start with "1J"
- B(n) must be reimportable as B(n-1) for the next merge cycle — format needs to round-trip cleanly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-json-artifact-format*
*Context gathered: 2026-02-12*
