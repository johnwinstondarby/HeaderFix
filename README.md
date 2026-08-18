# HeaderFix

HeaderFix is a small Adobe InDesign ExtendScript audit utility for the four recurring section headers used in the manuscript:

- `TLDR/`
- `MAINBODY/`
- `MORE/`
- `REFERENCES/`

The canonical result is paragraph style `H1` with no local/manual formatting overrides.

## v1.0 scope

HeaderFix v1.0 is read-only. It:

1. scans every paragraph in every story in the active InDesign document;
2. matches the four header strings only after trimming surrounding whitespace and the paragraph return;
3. records the page, story ID, frame ID, and paragraph index where available;
4. records the applied paragraph style;
5. checks for local paragraph-style overrides;
6. reports PASS, WARNING, or ERROR;
7. locates a selected occurrence in InDesign;
8. exports the complete audit inventory to CSV.

No formatting corrections are performed in v1.0.

## Finding codes

| Code | Severity | Meaning |
|---|---|---|
| `H1-001` | WARNING | One of the four required section-header strings was not found anywhere in the active document. |
| `H1-002` | ERROR | A section heading was found but uses a paragraph style other than `H1`. |
| `H1-003` | WARNING | `H1` is applied but local formatting overrides exist, or the override state could not be verified. |

Correctly formatted headings appear in the inventory as PASS and do not receive a finding code.

## Override detection

The primary test is InDesign DOM method:

```javascript
paragraph.textHasOverrides(StyleType.PARAGRAPH_STYLE_TYPE, false)
```

The second argument is `false` so an applied character style is not automatically classified as a paragraph-style override. If that method is unavailable in the running ExtendScript DOM, HeaderFix falls back to the read-only `styleOverridden` property and identifies the fallback in the UI and CSV.

HeaderFix does not infer an override from a style name such as `H1+`. The applied paragraph style and override state are tested independently.

## Running HeaderFix

1. Open the production `.indd` document in Adobe InDesign.
2. Run `HeaderFix.jsx` from the InDesign Scripts panel.
3. Review the summary and inventory.
4. Select a row and click **Locate**, or double-click the row.
5. Click **Save CSV** to export the audit.

## v1.0 validation target

The first production run should verify these cases in the real manuscript:

- clean `H1` header reports PASS;
- `H1` plus a manual paragraph or text formatting change reports `H1-003`;
- a header using another paragraph style reports `H1-002`;
- Locate jumps to the expected header;
- CSV location fields match the InDesign document;
- no document content or formatting changes during scanning.

## Current boundary

`H1-001` is document-wide in v1.0. HeaderFix can identify that a required section type is absent from the document, but it does not yet infer chapter boundaries. Chapter-by-chapter missing-header detection should be added only after a reliable chapter boundary rule is established from the production document.
