# V1 Data import architecture

Current reference for account-owned spreadsheet uploads, originally introduced by [#2643](https://github.com/ORNL-AMO/VERIFI/issues/2643). UI/session state lives in [`v1/account/imports`](../src/app/v1/account/imports/); neutral detection, parsers, mapping, and commit contracts live in [`data/import`](../src/app/data/import/). Both UI versions consume shared parsers directly. Legacy public import URLs and supported file formats remain operational; JSON backup coordination belongs to Settings > Backup.

## Routes and session ownership

Upload is an enabled account destination at `/v1/workspace/account/:accountGuid/imports/upload`; file steps use `imports/file/:fileId/:step`. Contextual Data entry carries the origin facility and validated return destination separately from inventory scope. Only inventory/workbench origins are valid contextual returns; other origins use the existing Data fallback. A missing memory-only session returns to upload with an explanation. Durable import drafts would be a new storage contract.

The root-lived [session service](../src/app/v1/account/imports/import-session.service.ts) owns file drafts, origin context, pending state, and per-file completion summaries. Read multiple files independently with browser File APIs/SheetJS and report failures per file. Queue removal discards only that file's draft/summary, never imported records; reading/importing/recovery states block unsafe removal. Restore focus to the next/previous entry or Browse files and announce removal.

The named stepper allows the current and completed steps only. Included invalid records block progress; invalid readings require explicit exclusion and acknowledgement rather than silent dropping. Dirty state protects route/account changes and browser unload; pending commits block navigation. A committed standalone Energy Uses import retains its recovery receipt and guarded review destination until workspace publication succeeds.

## Formats and workflows

The [format registry](../src/app/data/import/spreadsheet-import-format.registry.ts) owns kinds and the [workflow configuration](../src/app/v1/account/imports/import-workflow.config.ts) owns steps. Accept `.xlsx`, `.xls`, and `.xlsm`; preserve shipped workbook assets and signatures.

| Format | Compatibility and workflow |
| --- | --- |
| VERIFI V1 | Ordered legacy sheet names; Facilities → Meters → Meter readings → Predictors → Predictor readings → Review. |
| VERIFI V2 | Accept both Help/Fix Me and Getting Started/Troubleshooting sheet sequences; same template steps. |
| VERIFI V3 | Detect the V3 sheet; preserve template defaults, group/calendarization values, overwrite/keep decisions, and reading differences. |
| Energy Treasure Hunt | Detect ETH VERIFI Upload; preserve existing parser behavior through template steps. |
| General workbook | Unknown signatures use Worksheet → Identify columns → Map meters → Review meters → Meter readings → Map predictors → Review predictors → Predictor readings → Review. |
| Footprint Tool | Energy Consumption, Energy Uses, and Relevant Variables identify Select facility → Map equipment → Review. Known signatures retain priority. |
| Standalone Energy Uses | Match the standalone template signature, not merely an Energy Uses sheet. Use one fiscal-year review page. |

General workbooks preserve date/unit/identifier/numeric coercion and record matching. Hide hidden sheets by default and show a preview. One chosen facility defaults both meter/predictor columns; Multiple facilities enables separate mapping. Changing facility selection remaps both roles without losing worksheet/classification. Identify columns uses Not imported, Date, Meters, and Predictors lanes with keyboard Move to alternatives and bulk assignment. Suggest only a unique date alias; require one date column with usable data and at least one meter/predictor column. Mixed usable/unusable nonblank dates warn with representative skipped worksheet rows.

Facility mapping boards preserve worksheet order and require every active role column to be mapped. Start with unmapped cards selected; support Move to/Move here keyboard actions. Exclusion belongs to Identify columns. Add new facility remains draft-only until included records use it.

Footprint Tool defaults a valid sole facility and otherwise requires explicit choice. Match group/equipment names case-insensitively while preserving saved GUIDs, local keys, creation dates, annual assumptions, and history on repeated imports. Facility changes restore parsed identities before rematching. Mapping can edit category or source-compatible group/member meter links through reviewed slideouts without changing parsed source amounts/history; changing facility clears old assignments.

Standalone Energy Uses shows fiscal year, new-group/equipment/update/error/skipped totals, and Facility/Group/Equipment/Status/conditional Errors/Skip columns. Unchanged records stay out of the changes list. Update details show Field/Current/Imported values in a shell slideout with focus return. Valid year changes rebuild preview in place; invalid years, unresolved included errors, stale review, and pending writes block import. Match existing facilities, create needed groups, preserve untouched history and explicit zero overrides, and accept old capacity codes/current display labels. [Energy Uses architecture](v1-energy-uses-architecture.md#files-and-compatibility) owns its export and annual-value contract.

The file route owns its wizard facade and draft-store adapter, while focused meter/predictor review services own row editing, matching, overwrite/exclusion choices, and dependent-step invalidation. All are draft-only until commit. `SpreadsheetImportDraftService` preserves source identities and rebuilds child reading relationships when replacing draft mappings. New spreadsheet predictors are Standard; mapping to an existing Weather predictor preserves its station membership and imports amounts as manual overrides.

## Commit, recovery, and completion

One file commits as one account-level command through `WorkspaceCommandBoundary`. Revalidate account, GUID uniqueness, resource ownership, child relationships, explicit skip/overwrite decisions, and acknowledged reading exclusions. The spreadsheet command's native multi-store transaction covers facilities, meter groups/meters/readings, predictors/readings, and energy-use groups/equipment. Invalid input or any failed participant aborts the whole transaction; publish one coherent workspace update after commit. Preserve modified dates and new-meter visibility. No format, schema, backup, Worker, or IPC change is incidental to UI editing.

Rejected writes retain retryable drafts. Standalone Energy Uses distinguishes rejected durable review from committed-but-unpublished writes: stale reviews retain workbook/year/skips and require Review saved data again before edits/import resume; failed refresh remains retryable. The standalone transaction compares complete reviewed account-owned durable collections before any write, catching cross-window changes as well as local revision changes. A retained committed receipt permits refresh only and never repeats the import. Queue changes, route/account switching, and new writes remain blocked during committed recovery.

Completion summarizes affected owners, add/update totals, dates/readings, exclusions/skips, and equipment. Offer View imported data and Import another file, plus continuing to the next ready queue entry. Preserve allowlisted contextual returns; fallback targets follow the committed import's resources: Energy Uses for footprint/equipment uploads, Meters or Predictors for sole-facility spreadsheets, and account Data for mixed/multi-facility imports. Completion is a workspace publication, not proof of a disk save.

## Acceptance still requiring confirmation

The retired implementation plan's acceptance checklist was unchecked; this rewrite does not retroactively claim it passed. Retain these checks for the owning issue's acceptance:

- Every supported signature, legacy parser URL, general date/mapping requirement, and representative V3 round trip remains compatible.
- Group/equipment identity and meter links survive repeated footprint imports; includes skip/overwrite and invalid-reading acknowledgement.
- Invalid/dirty/pending states, file-specific errors, multi-file queue behavior, session-loss recovery, and completion destinations work across scopes.
- Native forced-write failure rolls back all participating stores; successful commit publishes once with one completion notification; rejected and committed recovery retain intent without replay.
- JSON backups remain under their coordinators. Review keyboard/focus, dense tables, narrow layouts, browser File APIs, and native persistence/reopen behavior.

Use [testing policy](testing.md) and the [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md). Historical blanket Electron-build instructions are not an additional gate; desktop file/runtime changes select desktop validation through the current policy.
