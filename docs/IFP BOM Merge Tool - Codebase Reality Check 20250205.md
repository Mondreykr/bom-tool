# IFP BOM Merge Tool — Codebase Reality Check

## Document Purpose

This document is a **companion to the IFP BOM Merge Tool PRD**. It validates each PRD section against the actual BOM Tool codebase (`index.html`, ~4400 lines), confirming what's accurate, correcting assumptions, and documenting implementation gaps.

**Read this document alongside the PRD**, not as a replacement. The PRD contains excellent domain logic and edge case analysis that should be preserved.

---

## How to Read This Document

For each PRD section, this document provides:
- **✓ CONFIRMED** — PRD assumption is accurate, codebase supports it
- **⚠️ CLARIFICATION** — PRD is correct but needs context about how codebase implements it
- **✗ GAP** — PRD assumes capability that doesn't exist; implementation required
- **Code Reference** — Specific line numbers in `index.html` where relevant code exists

---

# PRD Section 1: Problem Statement

**Status: ✓ CONFIRMED — No codebase implications**

The problem statement describes business/process issues, not tool capabilities. It accurately describes:
- Extended BOM exports from SOLIDWORKS PDM
- Suppression causing items to vanish from XML
- Comparison tool reporting false "Removed" signals

The current BOM Tool does exactly what the PRD describes: compares two XML snapshots and classifies items as Added/Removed/Changed/Unchanged with no awareness of engineering intent.

---

# PRD Section 2: Notation and Naming Conventions

**Status: ✓ CONFIRMED — Notation is sound**

## 2.1 Files (X(n) and B(n))
The notation is clear and useful. No codebase implications.

## 2.2 Assembly Content Versions (A1^R0, etc.)
Clear notation for discussion. No codebase implications.

## 2.3-2.4 Assembly States

**✓ CONFIRMED: State field exists and is populated**

```javascript
// index.html line 1425 — XML parsing extracts State
const row = {
    ...
    'State': attributes['State'] || '',
    ...
};

// index.html line 1473 — BOMNode stores state
this.state = rowData.State;
```

**✓ CONFIRMED: Actual State values in test XML files**
- `"Issued for Use"` — appears throughout test data
- `"Issued for Purchasing"` — standard PDM state
- Other states (In Design, Under Revision) — not in test data but would be captured

**⚠️ CLARIFICATION: State whitelist approach is implementable**

The PRD's whitelist approach (check for IFP/IFU, treat everything else as WIP) is correct and easy to implement:
```javascript
function isReleased(node) {
    return node.state === 'Issued for Purchasing' ||
           node.state === 'Issued for Use';
}
```

---

# PRD Section 3: Architecture Overview

## 3.1 Current Workflow

**✓ CONFIRMED: Accurately describes current tool**

The tool currently:
1. Loads two XML/CSV files
2. Parses both into tree structures
3. Flattens both trees
4. Compares flat BOMs
5. Reports Added/Removed/Changed

## 3.2 New Workflow

**⚠️ CLARIFICATION: Dual-file architecture exists**

The BOM Comparison tab already supports loading two files:

```javascript
// index.html lines 2210-2227 — Global state for two BOMs
let oldBomData = null;
let newBomData = null;
let oldBomTree = null;      // Full tree structure
let newBomTree = null;      // Full tree structure
let oldBomFilename = null;
let newBomFilename = null;
```

The UI has two upload zones ("Old BOM" and "New BOM"). This architecture can be repurposed:
- "Old BOM" zone → Load B(n-1)
- "New BOM" zone → Load X(n)

**✗ GAP: No "merge mode" exists**

Currently the tool only compares; it doesn't produce a merged output. A new workflow/mode would need to be added.

## 3.3 Downstream Usage of B(n)

**✓ CONFIRMED: Existing capabilities cover most downstream needs**

| Downstream Operation | Current Capability |
|---------------------|-------------------|
| Flat BOM generation | ✓ `flattenBOM()` exists — line 1584 |
| Hierarchical view | ✓ Hierarchy tab exists — line 3687+ |
| B(n) vs B(n-1) comparison | ✓ `compareBOMs()` exists — line 2696 |
| Scoped comparisons | ✓ Enhancement 1 implemented — line 2434 |

## 3.4 Key Process Change (No Suppression of WIP)

**Status: No codebase implications** — This is an SOP/process change, not a tool change.

---

# PRD Section 4: The Algorithm

## 4.1 Core Principle (Assemblies only)

**✓ CONFIRMED: Assembly vs Component detection exists**

```javascript
// Used throughout codebase, e.g., line 1594
if (node.componentType !== 'Assembly') {
    // This is a purchasable component
}
```

The `componentType` field reliably distinguishes:
- `"Assembly"` — containers, have children
- `"Manufactured"`, `"Purchased"`, `"Raw Stock"` — leaf components

## 4.2 Core Logic (Top-Down Walk)

**✓ CONFIRMED: Algorithm is implementable**

The pseudocode in the PRD is sound. Equivalent codebase patterns exist:

**Tree traversal pattern (from flattenBOM):**
```javascript
// index.html line 1586-1610
function traverse(node, multiplier) {
    const effectiveQty = node.qty * multiplier;
    // ... process node ...
    node.children.forEach(child => {
        traverse(child, effectiveQty);
    });
}
traverse(root, unitQty);
```

**Subtree cloning (from extractSubtree):**
```javascript
// index.html lines 2434-2454
function extractSubtree(node) {
    function cloneNode(n, isRoot = false) {
        const clone = new BOMNode({...});
        clone.children = n.children.map(child => cloneNode(child, false));
        return clone;
    }
    return cloneNode(node, true);
}
```

**✗ GAP: findByPartNumber() does not exist**

The PRD assumes `priorBOM.findByPN(sourceNode.PN)`. This function must be created:

```javascript
// NEEDS TO BE IMPLEMENTED (~15 lines)
function findNodeByPartNumber(tree, partNumber) {
    function search(node) {
        if (node.partNumber === partNumber) return node;
        for (const child of node.children) {
            const found = search(child);
            if (found) return found;
        }
        return null;
    }
    return search(tree);
}
```

**⚠️ EDGE CASE: Same PN at multiple locations**

PRD Section 6.5 addresses this. The search function should return the first match, and the algorithm handles each instance independently during the walk. This is correct.

## 4.3-4.5 Algorithm Behavior

**✓ CONFIRMED: All described behaviors are implementable**

- Top-down, first-WIP-stops: Standard recursive pattern
- Multi-branch independence: Each child processed independently
- Deep WIP detection: Recursion naturally handles any depth

---

# PRD Section 5: Process Flow with Examples

**Status: ✓ CONFIRMED — Examples are accurate**

The worked examples (5.1 through 5.7) correctly demonstrate:
- REV0 baseline creation
- WIP grafting from prior revision
- Restored assemblies after revision completes
- Deep WIP at L2
- Multi-revision carry-forward
- True deletion vs. WIP suppression
- New WIP assembly with no prior release

These examples serve as test cases for implementation validation.

---

# PRD Section 6: Edge Cases and Validation

## 6.1 Common Component Across Branches

**✓ CONFIRMED: Quantity roll-up handles this correctly**

The existing `flattenBOM()` aggregates by composite key. If A1's branch is grafted (preserving C1 qty 3), the flat BOM will include both:
- C1 from A1→A5 (grafted)
- C1 from A2→A6 (current)

Total quantity preserved.

## 6.2 PN-Length Composite Key Preservation

**✓ CONFIRMED: Composite key system exists and works**

```javascript
// index.html line 1590
function getCompositeKey(partNumber, length) {
    return length ? `${partNumber}|${length}` : `${partNumber}|`;
}
```

The entire flattening and comparison system uses composite keys. Grafted branches will preserve PN-Length distinctions because they're stored in the BOMNode structure.

## 6.3 New WIP Assembly — Empty Placeholder

**⚠️ IMPLEMENTATION NOTE**

When `findNodeByPartNumber()` returns null for a WIP assembly, the tool should:
1. Create a BOMNode with the assembly's metadata
2. Set `children = []` (empty)
3. Emit console warning

This is straightforward but must be explicitly coded.

## 6.4 Quantity Change on Parent-Child Relationship

**✓ CONFIRMED: BOMNode structure supports this**

Each BOMNode stores its own `qty` (quantity in parent). When grafting:
- Parent's qty comes from X(n) — the released parent declares how many
- Grafted subtree's internal qtys come from B(n-1)

The `extractSubtree()` function already demonstrates this pattern (resets root qty to 1).

## 6.5 Same Assembly at Multiple Points

**✓ CONFIRMED: Independent traversal handles this**

The recursive walk processes each child independently. If A5 appears twice (under A1 and under GA), each instance is evaluated and grafted separately.

---

# PRD Section 7: File Format Considerations

## 7.1 The Format Decision

**This is the most critical section for codebase reality.**

### Option A — B(n) as XML

**✗ GAP: Tool cannot write XML**

The tool only reads XML. There is no XML serialization capability. Creating one would require:
- Understanding the PDM XML schema fully
- Building nested document/configuration/attribute structure
- ~200-300 lines of code
- Extensive testing against PDM import requirements

### Option B — B(n) as tool-native format

**✓ FEASIBLE: Excel with Level column**

The tool CAN export hierarchical data to Excel:

```javascript
// index.html lines 3918-3961 — Hierarchy Excel export
function hierarchyExportExcel() {
    const exportData = [];
    function traverse(node, level) {
        exportData.push({
            'Level': level,
            'Part Number': node.partNumber,
            'Component Type': node.componentType,
            // ... all fields ...
        });
        node.children.forEach((child, idx) => {
            traverse(child, `${level}.${idx + 1}`);
        });
    }
    // ...
}
```

**✓ FEASIBLE: Tool can re-import Excel (as CSV)**

The tool parses CSV with Level column via `parseCSV()`. This creates a closed loop:
1. Export B(n) as Excel with Level column
2. Save Excel as CSV
3. Load CSV as B(n-1) for next revision

### Option C — Hybrid

**⚠️ RECOMMENDED APPROACH**

Given codebase reality:
1. **Internal format**: In-memory BOMNode tree (already exists)
2. **Storage format**: Excel with Level column (already implemented)
3. **XML export**: Future enhancement if PDM integration required

## 7.2 What B(n) Must Contain

**✓ CONFIRMED: All required fields exist in BOMNode**

| Required Field | BOMNode Property | Status |
|---------------|------------------|--------|
| Part Number | `partNumber` | ✓ Exists |
| Composite Key | Computed from `partNumber` + `length` | ✓ Computable |
| Item Type | `componentType` | ✓ Exists |
| Quantity | `qty` | ✓ Exists |
| Level | `level` | ✓ Exists |
| Description | `description` | ✓ Exists |
| State | `state` | ✓ Exists |

**⚠️ NEW FIELD NEEDED: Source indicator**

The PRD recommends tracking "From X(n)" vs "Grafted from B(n-1)". This would require:
- Adding a `source` field to BOMNode
- Setting it during merge processing
- Including it in exports

```javascript
// Example addition to BOMNode
this.source = null;  // 'current' or 'grafted'
```

---

# PRD Section 8: Implementation Requirements Summary

## 8.1 Tool Capabilities

| Capability | PRD Priority | Codebase Status |
|------------|--------------|-----------------|
| XML Parsing with State Metadata | Required | ✓ **EXISTS** — line 1425 |
| Top-Down Branch Walk | Required | ✓ **PATTERN EXISTS** — adaptable from flattenBOM |
| Branch Grafting | Required | ✗ **NEEDS IMPLEMENTATION** — ~100 lines |
| B(n) Output (JSON + hash) | Required | ✗ **NEEDS IMPLEMENTATION** — ~80 lines |
| B(n-1) Import with verification | Required | ✗ **NEEDS IMPLEMENTATION** — ~70 lines |
| Empty Placeholder Handling | Required | ✗ **NEEDS IMPLEMENTATION** — ~20 lines |
| Flat BOM Generation | Required | ✓ **EXISTS** — line 1584 |
| B(n) vs B(n-1) Comparison | Required | ✓ **EXISTS** — line 2696 |
| Source/Graft Annotation | Recommended | ✗ **NEEDS IMPLEMENTATION** — ~30 lines |

### Implementation Effort Estimate

| Component | Lines of Code | Complexity |
|-----------|---------------|------------|
| `findNodeByPartNumber()` | ~15 | Low |
| `isReleased()` state check | ~5 | Trivial |
| `buildIFPBOM()` merge algorithm | ~80 | Medium |
| Empty placeholder handling | ~20 | Low |
| Source annotation | ~30 | Low |
| JSON export with integrity hash | ~80 | Low |
| JSON import with verification | ~70 | Low |
| UI for IFP Merge mode | ~100 | Medium |
| **Total new code** | **~400 lines** | **Medium** |

## 8.2 SOP / Process Changes

**Status: No codebase implications** — These are organizational/process changes.

## 8.3 Artifact Storage

**Status: No codebase implications** — File organization is user responsibility.

---

# PRD Section 9: Functional Equivalence

**Status: ✓ CONFIRMED — Analysis is accurate**

The PRD correctly identifies that the merge tool approach is functionally equivalent to a reference chain database. The chain of B(n) files serves as the database.

---

# PRD Section 10: Summary

**Status: ✓ CONFIRMED — Summary is accurate**

The five-point summary correctly describes the approach.

---

# Summary: Codebase Reality

## What Already Exists (No Work Needed)

| Capability | Code Location |
|------------|---------------|
| XML parsing with State metadata | `parseXML()` — line 1367 |
| CSV parsing with Level column | `parseCSV()` — line 1285 |
| BOMNode class with all fields | Line 1463 |
| Tree building from rows | `buildTree()` — line 1502 |
| Subtree cloning | `extractSubtree()` — line 2434 |
| Assembly vs Component detection | `componentType` field |
| Flat BOM generation | `flattenBOM()` — line 1584 |
| BOM comparison | `compareBOMs()` — line 2696 |
| Dual-file loading | Comparison tab architecture |
| Excel export with hierarchy | `hierarchyExportExcel()` — line 3918 |
| Scoped extraction | Enhancement 1 |

## What Must Be Built

| Capability | Estimated Effort |
|------------|------------------|
| `findNodeByPartNumber()` | 15 lines, trivial |
| `isReleased()` state check | 5 lines, trivial |
| `buildIFPBOM()` merge algorithm | 80 lines, medium |
| Empty placeholder handling | 20 lines, low |
| Source annotation field | 30 lines, low |
| JSON export with tree structure | 50 lines, low |
| SHA-256 integrity hash (export) | 30 lines, low |
| Integrity verification (import) | 30 lines, low |
| JSON import/parsing for B(n-1) | 40 lines, low |
| UI for IFP Merge workflow | 100 lines, medium |
| **Total new code** | **~400 lines** | **Medium** |

## What Will Not Be Done (By Design)

| Capability | Reason | Decision |
|------------|--------|----------|
| XML output for B(n) | No XML serializer exists; significant work | Use JSON with integrity hash instead |
| PDM-compatible XML export | Would require ~200-300 lines, extensive testing | Defer to future phase if ever needed |

## Architecture Decision: RESOLVED

**B(n) Output Format**: The PRD leaves this open (Section 7.1).

**Decision: JSON with SHA-256 integrity hash**

See "Design Decisions" section below for full specification. This format:
- Is machine-readable and reimportable
- Detects any modification via integrity verification
- Is harder to accidentally edit than Excel
- Uses built-in browser crypto APIs

**XML export** deferred to future phase if PDM direct import is ever required.

---

# Design Decisions (Confirmed)

The following decisions have been confirmed through discussion and should guide implementation.

## B(n) Output Format: JSON with Integrity Hash

**Decision:** B(n) artifacts will be exported as JSON files with SHA-256 integrity verification.

**Rationale:**
- JSON is machine-readable and can be reimported as B(n-1)
- Integrity hash detects any modification (accidental or intentional)
- JavaScript has built-in crypto APIs (`crypto.subtle.digest`)
- More robust than Excel (which is easily edited)

**File Structure:**
```json
{
  "metadata": {
    "format_version": "1.0",
    "created": "2026-02-05T14:30:00Z",
    "tool_version": "2.2",
    "ga_part_number": "12345",
    "ga_description": "General Assembly Description",
    "ifp_revision": 1,
    "source_file": "12345_EXPORT_2026-02-05.xml",
    "prior_ifp_file": "12345_IFP_REV0.json",
    "integrity_hash": "sha256:a1b2c3d4e5f6..."
  },
  "bom": {
    "partNumber": "12345",
    "componentType": "Assembly",
    "description": "...",
    "qty": 1,
    "state": "Issued for Purchasing",
    "source": "current",
    "children": [...]
  }
}
```

**Integrity Verification on Load:**
1. Parse JSON
2. Extract `bom` object
3. Compute SHA-256 hash of `JSON.stringify(bom)`
4. Compare to stored `integrity_hash`
5. If mismatch → **Reject file** with error: "File has been modified since creation. Cannot use as B(n-1)."

**Implementation:** ~50 lines using Web Crypto API.

## File Protection: Read-Only Limitation

**Browser Constraint:** When JavaScript exports a file (via Blob download), it cannot set file system attributes. The browser's security sandbox prevents this.

**Workarounds:**
1. **Integrity hash** (primary protection) — Catches any modification on reimport
2. **Manual read-only** — Document SOP: after download, right-click → Properties → check "Read-only"
3. **Naming convention** — Use `_OFFICIAL` suffix to signal "do not edit"

**Recommended filename format:**
```
{GA_PN}_IFP_REV{n}_OFFICIAL.json
Example: 12345_IFP_REV1_OFFICIAL.json
```

---

# Future Refactoring: Multi-File Codebase

## Current State

The BOM Tool is a single 4400-line HTML file with embedded CSS and JavaScript. This was intentional for portability (email a single file, open in browser).

## Recommended Refactor

Now that the tool is hosted on GitHub Pages, the single-file constraint no longer applies. The codebase should be split into multiple files, **optimized for Claude Code assistance**.

**Priority:** Structure for Claude's benefit — smaller, focused files reduce context needed for edits.

### Proposed Structure

```
bom-tool/
├── index.html              # HTML structure only (~400 lines)
├── css/
│   └── styles.css          # All styling (~800 lines)
├── js/
│   ├── core/
│   │   ├── parser.js       # parseCSV(), parseXML() (~300 lines)
│   │   ├── tree.js         # BOMNode, buildTree(), getParentLevel() (~200 lines)
│   │   ├── flatten.js      # flattenBOM(), getCompositeKey() (~150 lines)
│   │   └── compare.js      # compareBOMs(), createDiff() (~200 lines)
│   ├── tabs/
│   │   ├── flat-bom.js     # Flat BOM tab UI and logic (~400 lines)
│   │   ├── comparison.js   # Comparison tab UI and logic (~600 lines)
│   │   └── hierarchy.js    # Hierarchy tab UI and logic (~500 lines)
│   ├── export/
│   │   ├── excel.js        # Excel export functions (~200 lines)
│   │   └── html.js         # HTML export functions (~300 lines)
│   ├── ifp-merge/          # NEW: IFP Merge feature
│   │   ├── merge.js        # buildIFPBOM(), findNodeByPartNumber() (~150 lines)
│   │   ├── integrity.js    # Hash generation/verification (~50 lines)
│   │   └── ui.js           # IFP Merge tab UI (~200 lines)
│   └── main.js             # Initialization, event binding (~200 lines)
```

### Benefits for Claude

| Benefit | Impact |
|---------|--------|
| **Smaller files** | Read one 300-line file instead of searching 4400 lines |
| **Clear boundaries** | "Edit `js/core/flatten.js`" vs "Edit lines 1584-1642 of index.html" |
| **Focused context** | Changes to export don't require loading comparison logic |
| **Easier navigation** | File names indicate purpose |
| **Reduced risk** | Editing one module can't accidentally break unrelated code |

### Implementation Notes

- No build tools required initially — just `<script>` tags loading files in order
- Global functions remain global (no module bundling complexity)
- Can migrate to ES modules later if needed
- GitHub Pages serves multiple files without configuration

### Refactor as Separate Project

This refactoring should be treated as a **separate milestone** from IFP Merge implementation:
1. Creates risk if done mid-feature
2. Benefits all future development
3. Should be done when codebase is stable

**Recommendation:** Complete IFP Merge feature first (in single file), then refactor as next milestone.

---

# Appendix: Key Code References

| Function/Section | Line Numbers | Purpose |
|-----------------|--------------|---------|
| `parseXML()` | 1367-1460 | XML to row array |
| `parseCSV()` | 1285-1364 | CSV to row array |
| `BOMNode` class | 1463-1478 | Tree node structure |
| `buildTree()` | 1502-1573 | Rows to tree |
| `flattenBOM()` | 1584-1642 | Tree to flat list |
| `extractSubtree()` | 2434-2454 | Clone subtree |
| `compareBOMs()` | 2696-2791 | Compare two flat BOMs |
| Comparison tab globals | 2210-2227 | Dual-file state |
| Hierarchy export | 3918-3961 | Excel with Level |

---

*Document Version: 1.1*
*Companion to: IFP BOM Merge Tool PRD v2.0*
*Based on: BOM Tool codebase (index.html, ~4400 lines)*
*Created: 2026-02-05*

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-05 | Initial codebase validation |
| 1.1 | 2026-02-05 | Added Design Decisions (JSON+hash format, read-only notes) and Future Refactoring section (multi-file codebase optimized for Claude) |
