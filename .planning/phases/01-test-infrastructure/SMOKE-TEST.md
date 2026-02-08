# Browser Smoke Test Checklist

Run this checklist after each refactoring phase to verify visual correctness.
Automated tests (`npm test` in the test/ directory) handle all data accuracy.
This checklist is only for "does the UI look and feel right."

## Prerequisites

- Open `index.html` in your browser (Chrome, Edge, or Firefox)
- Have these test files ready from the `test-data/` folder

## Checklist

### Tab 1: Flat BOM
- [ ] Load `test-data/258730-Rev2-20260105.XML`
- [ ] Results table appears with data (rows visible, columns aligned)
- [ ] Filename displays prominently above the table
- [ ] Part Number and Description shown below filename
- [ ] Statistics bar shows item count

### Tab 2: BOM Comparison
- [ ] Switch to "BOM Comparison" tab
- [ ] Load `test-data/258754-Rev0-20251220.XML` as Old BOM
- [ ] Load `test-data/258754-Rev1-20260112.XML` as New BOM
- [ ] Comparison results table appears with colored rows (green/red/yellow)
- [ ] Filter buttons work (All, Added, Removed, Changed)
- [ ] Statistics bar shows change counts

### Tab 3: Hierarchy View
- [ ] Switch to "Hierarchy View" tab
- [ ] Load `test-data/258730-Rev2-20260105.XML`
- [ ] Tree structure appears with expand/collapse toggles
- [ ] Clicking +/- toggles expand/collapse children
- [ ] "Expand All" and "Collapse All" buttons work
- [ ] Tree connector lines display correctly (vertical and horizontal lines)

### General
- [ ] Tab switching works (click each tab, content changes)
- [ ] Fonts load correctly (JetBrains Mono for data, Work Sans for UI)
- [ ] No console errors (open DevTools with F12 and check Console tab)

## When This Fails

If visual issues appear after a phase:
1. Note which checklist item failed
2. Report to Claude with the specific item and what looks wrong
3. Automated tests should still pass (data is correct even if display is off)
