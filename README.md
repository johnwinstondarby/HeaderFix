# HeaderFix

HeaderFix is a small Adobe InDesign ExtendScript audit and remediation utility for the recurring section headers:

- `TLDR/`
- `MAINBODY/`
- `MORE/`
- `REFERENCES/`

The canonical result is paragraph style `Heading 1` with no local/manual formatting overrides.

## v1.2 correction

Earlier HeaderFix versions used `H1` as though it were the literal InDesign paragraph style name. `H1` was shorthand. The production paragraph style is `Heading 1`.

HeaderFix v1.2 uses the exact style name `Heading 1` for detection, reporting, verification, and remediation. The finding-code prefix remains `H1-` for continuity.

## Finding codes

| Code | Severity | Meaning |
|---|---|---|
| `H1-001` | WARNING | One of the four required section-header strings was not found anywhere in the active document. |
| `H1-002` | ERROR | A section heading was found but uses a paragraph style other than `Heading 1`. |
| `H1-003` | WARNING | `Heading 1` is applied but local formatting overrides exist, or the override state could not be verified. |

Correctly formatted headings appear as PASS.

## v1.2 remediation

`Fix Selected Error` and `Fix All Errors` operate only on current `ERROR` / `H1-002` rows. Before changing a paragraph, HeaderFix verifies that the paragraph still contains the same section-header text and still uses a style other than `Heading 1`.

For each eligible paragraph, HeaderFix uses:

```javascript
paragraph.applyParagraphStyle(canonicalStyle, true)
```

HeaderFix then verifies that the paragraph reports `Heading 1` with no local paragraph-style overrides and rescans the document.

PASS and WARNING rows are not changed by v1.2 remediation. `H1-003` warnings remain locate-only.

## Production scan interpretation

The first production CSV contained 88 section-header occurrences. Reinterpreted using the correct literal style name `Heading 1`:

- 70 are `Heading 1` with no reported override and should scan as PASS;
- 10 are `Heading 1` with reported overrides and should scan as `H1-003` WARNING;
- 6 use `Heading 2` and should scan as `H1-002` ERROR;
- 2 use `Normal` and should scan as `H1-002` ERROR.

The eight wrong-style rows are the only rows eligible for v1.2 remediation.

## Running HeaderFix

1. Open the production `.indd` document in Adobe InDesign.
2. Run `HeaderFix.jsx` from the InDesign Scripts panel.
3. Review the summary and inventory.
4. Select a row and click **Locate**, or double-click the row.
5. For an `H1-002` error, use **Fix Selected Error** or **Fix All Errors** and confirm the change.
6. Review the automatic rescan.
7. Click **Save CSV** to export the current audit.

## Current boundary

`H1-001` remains document-wide in v1.2. HeaderFix does not yet infer chapter boundaries. Chapter-by-chapter missing-header detection should be added only after a reliable chapter boundary rule is established from the production document.
