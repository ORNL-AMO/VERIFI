---
name: change-data-import-export
description: Change VERIFI spreadsheet templates, SheetJS parsers, ExcelJS writers, structured imports or exports, JSON backups, or file compatibility. Use when sheet names, headers, types, formulas, mapping, validation, version detection, download contents, or backup shapes may change.
---

# Change data import or export

1. Read [Imports, exports, and backups](../../../ARCHITECTURE.md#imports-exports-and-backups) plus the [Implementer](../../../docs/agents/personas.md#implementer) and [Reviewer](../../../docs/agents/personas.md#reviewer) modes.
2. Identify the format and direction before editing: current VERIFI template, older template version, general workbook mapping, supported external workbook, report export, or JSON backup.
3. Trace the complete flow from file selection and parsing through validation, domain-model construction, persistence, state refresh, and export/download. Find the format detector or version router as well as the selected parser/writer.
4. Define compatibility explicitly. Preserve supported old formats, sheet names, headers, column types, dates, units, formulas, ordering, GUID relationships, and missing-field defaults unless the issue approves a break.
5. Keep parsing and mapping logic testable without UI state where practical. Validate before committing records and surface row, sheet, and field errors in the established workflow.
6. Treat files under `src/assets/csv_templates/` as binary source contracts. Change them only when required, review the workbook visually, and update the paired parser and writer in the same change.
7. For persisted-model changes, also use `change-indexeddb-persistence` and verify older backups.

## Validate

- Add tests for valid, missing, malformed, duplicate, and boundary values at the parser or writer level.
- Verify representative old-format inputs still import.
- Perform an import-persist-export round trip and compare key identities, dates, units, counts, and totals.
- Inspect generated workbook sheets, headers, types, formulas, and ordering when spreadsheets change.
- Run `npm run test:ci`; add browser tests for File APIs or IndexedDB integration when needed.
- Run `npm run build-prod` and `npm run build-prod-electron` for shared file flows.

## Guardrails

- Do not consolidate versioned parsers without proving compatibility for every supported format.
- Do not silently coerce ambiguous dates, units, identifiers, or numeric text.
- Do not regenerate or replace binary templates without inspecting the actual workbook.
- Stop for maintainer direction when compatibility policy, invalid-row behavior, or overwrite semantics are unspecified.

Complete with the format contract, compatibility decision, validation/error behavior, round-trip evidence, and affected assets.
