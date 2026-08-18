# HeaderFix

HeaderFix is a small Adobe InDesign ExtendScript utility for auditing and correcting the four recurring section headers used in the manuscript:

- `TLDR/`
- `MAINBODY/`
- `MORE/`
- `REFERENCES/`

The canonical result is paragraph style `Heading 1` with no local/manual formatting overrides.

## v1.3 scope

HeaderFix v1.3 audits every exact section-header occurrence in the active InDesign document and supports two guarded remediation classes:

- `H1-002` ERROR: the section marker uses the wrong paragraph style. HeaderFix can apply `Heading 1` and clear local text attributes.
- `H1-003` WARNING: `Heading 1` is already applied, but a verified local formatting override remains. HeaderFix can clear the override by reapplying the canonical style with override clearing.

The script also reports `H1-001` when one of the four required marker strings is absent from the document.

## Safety behavior

HeaderFix does not change content during scanning. Every remediation action requires explicit user confirmation.

Before changing a row, HeaderFix verifies that:

1. the paragraph object is still valid;
2. the paragraph still contains the same exact section marker;
3. the current style and override state still match the selected remediation class.

Stale or already-corrected rows are skipped. After remediation, HeaderFix verifies the resulting style/override state and immediately rescans the document.

### Error remediation

- **Fix Selected Error** acts only on the selected `H1-002` row.
- **Fix All Errors** acts only on current `H1-002` rows.

### Override remediation

- **Clear Selected Override** acts only on a verified `H1-003` row whose style is `Heading 1` and whose override state is `Yes`.
- **Clear All Overrides** acts only on current verified `H1-003` override rows.
- `H1-003` rows whose override state cannot be verified remain locate-only.

## Override detection

Primary detection uses:

```javascript
paragraph.textHasOverrides(StyleType.PARAGRAPH_STYLE_TYPE, false)
```

`styleOverridden` is retained as a read-only fallback for DOM variations.

## Reporting

CSV fields:

- Severity
- Code
- Section
- Page
- Applied Style
- Has Overrides
- Override Detection
- Story ID
- Frame ID
- Paragraph Index
- Location
- Finding
- Available Action

## Compatibility

HeaderFix is written for Adobe InDesign ExtendScript and preserves ECMAScript 3 compatibility.
