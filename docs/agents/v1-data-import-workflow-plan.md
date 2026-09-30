# V1 Data Import Workflow Plan

This plan implements [issue #2643](https://github.com/ORNL-AMO/VERIFI/issues/2643). It is the durable reference for migrating spreadsheet import into the production v1 workspace while keeping v0 routes and file compatibility operational.

## Outcome

Users import one or more Excel workbooks through an account-scoped, guided workflow at:

- `/v1/workspace/account/:accountGuid/imports/upload`
- `/v1/workspace/account/:accountGuid/imports/file/:fileId/:step`

The workflow detects each file, follows the appropriate branch, requires actionable review of invalid or conflicting records, and commits a file atomically. JSON backup behavior remains in Account or Facility Settings > Backup.

## Current-state contract

The v0 workflow starts under `src/app/v0/data-management/data-management-import/`. Its queue is memory-only, parsing is performed with SheetJS, and each format has a distinct review sequence. Its public URLs remain operational during v1 rollout.

The version-neutral implementation lives under `src/app/data/import/`. Both UI versions import parser files there directly; v1 does not import v0 presentation code. The v1 session remains memory-only, so a refresh returns the user to upload with an explanation.

Known legacy weaknesses are not compatibility requirements:

- Forward navigation was permissive.
- Invalid readings could be omitted without an explicit decision.
- A refresh lost the in-memory session without guidance.
- Import writes could partially succeed across stores.

## Compatibility matrix

| Input | Detection contract | Guided branch | Compatibility decision |
| --- | --- | --- | --- |
| VERIFI V1 | Ordered legacy V1 sheet names | Facilities through Review | Preserve parser and stored shapes |
| VERIFI V2 | Both legacy `Help`/`Fix Me` and current `Getting Started`/`Troubleshooting` sheet sequences | Facilities through Review | Preserve both signatures |
| VERIFI V3 | Workbook contains the `V3` sheet | Facilities through Review | Preserve current template behavior |
| Energy Treasure Hunt | Workbook contains `ETH VERIFI Upload` | Facilities through Review | Preserve existing parser behavior |
| General workbook | No known template signature | Worksheet and column mapping through Review | Preserve date, unit, identifier, and numeric coercion rules |
| Footprint tool | Contains `Energy Consumption`, `Energy Uses`, and `Relevant Variables` | Facility, Equipment, Review | Preserve name matching, operating conditions, and meter-group links |
| JSON backup | JSON selected outside spreadsheet import | Settings > Backup | Keep existing backup coordinators and file behavior |

Accepted workbook extensions are `.xlsx`, `.xls`, and `.xlsm`. The shipped Excel template asset and spreadsheet schemas do not change under this issue.

## Workflow decisions

- Imports & Backup is an enabled account-level rail destination. Facility Data entry points retain the origin facility while opening the account import route.
- The queue shows each file independently as ready, invalid, importing, or complete.
- The stepper permits the current step and completed prior steps only. Included invalid records block forward progress.
- Invalid meter readings may be explicitly excluded only after acknowledgement; they are never silently dropped.
- Unsaved import state protects route changes, account changes, refresh, and window close. A pending commit blocks navigation entirely.
- One file is one `WorkspaceCommandBoundary` account-level bulk command and one native IndexedDB transaction covering facilities, meter groups, meters, meter readings, predictors, predictor readings, energy-use groups, and equipment.
- Validation or persistence failure aborts the transaction. Workspace state publishes once, after commit.
- The issue does not change the IndexedDB schema/version, stores, indexes, backup shape, Worker contracts, or Electron IPC.

## Implementation steps

### 1. Characterize compatibility

- Cover every template signature, general workbook classification, footprint classification, hidden sheets, helper defaults, existing-record decisions, and summaries.
- Keep representative V3 export/import round-trip coverage.
- Treat the compatibility suite as a gate for parser changes.

### 2. Share the import core

- Keep workbook contracts, detection, versioned parsers, general mapping, pure meter defaults, and validation findings under `src/app/data/import/`.
- Use `ImportFileKind`, `ImportFileDraft`, `ImportValidationFinding`, `ImportCommitRequest`, and `ImportCommitSummary` as the v1-facing contract.
- Point v0 consumers directly at shared files. Do not leave duplicate or forwarding parser files under v0.

### 3. Commit atomically

- Validate the active account, GUID uniqueness, facility/resource ownership, and child relationships before writing.
- Apply explicit skip/overwrite and invalid-reading exclusion decisions.
- Preserve modified dates and new-meter visibility.
- Use one native transaction and one committed workspace reload/notification.

### 4. Establish routes and session state

- Add account upload and file-step routes.
- Retain origin facility and return destination from contextual Data actions.
- Keep drafts, completed steps, queue state, commit state, and success summary in a feature-local signal service.
- Redirect a missing session to upload with explanatory status.

### 5. Build upload and wizard shell

- Read multiple files independently with the browser File API and SheetJS.
- Show file-specific detection or parse failures.
- Keep shared workflow state and controls in the file-route shell, with each named step implemented as a routed child component.
- Provide an accessible named stepper, Back/Continue controls, concise contextual help, error alerts, and a live non-dismissible commit state.
- Protect dirty and pending sessions from accidental navigation.

### 6. Implement the VERIFI-template branch

Sequence: Facilities → Meters → Meter readings → Predictors → Predictor readings → Review.

- Review new versus existing facilities, meters, and predictors.
- Permit editing and explicit skipping of included meter and predictor records.
- Preserve meter groups, calendarization-related parser values, overwrite/keep decisions, and reading-difference semantics.
- Require explicit exclusion and acknowledgement for invalid readings.

### 7. Implement the general-workbook branch

Sequence: Worksheet → Identify columns → Map meters → Review meters → Meter readings → Map predictors → Review predictors → Predictor readings → Review.

- Hide hidden worksheets by default and show a data preview.
- Identify columns through a four-lane drag/drop board for Not imported, Date, Meters, and Predictors, with equivalent Move to controls and bulk assignment.
- Conservatively suggest a unique date-like alias, require one selected date column with at least one usable value, and require at least one meter or predictor column.
- Warn and continue when the selected date column mixes usable and unusable nonblank values; name representative worksheet rows that will not create readings.
- Assign each included data column to a facility or return it to excluded worksheet columns.
- Preserve existing record matching and established parsing/coercion rules.

### 8. Implement the footprint branch

Sequence: Select facility → Map equipment → Review.

- Default a valid single-facility account and require an explicit portfolio choice.
- Preserve case-insensitive energy-use group and equipment matching.
- Preserve annual operating conditions and source-compatible meter-group links.

### 9. Review, completion, and rollout

- Summarize affected facilities, add/update counts, date/readings totals, exclusions, skip choices, and footprint entities.
- Continue with the next ready queued file after a successful commit.
- Route footprint results to Facility Data > Energy Uses; route single-facility spreadsheet results to Meters or Predictors; route mixed/multi-facility results to Account Data Portfolio.
- Keep “View imported data” and “Import another file” actions.
- Update architecture and migration decision notes; retain every v0 public URL.

## Acceptance checklist

- [ ] Every supported template signature parses without a new file contract.
- [ ] General workbooks require a usable date and at least one mapped data column.
- [ ] Footprint records retain group/equipment identity and compatible meter-group links.
- [ ] Forward navigation is blocked until the current step is valid.
- [ ] Invalid included records cannot be committed; excluded readings require acknowledgement.
- [ ] Multi-file queue state and per-file errors are visible.
- [ ] Refresh/session loss returns to upload with an explanation.
- [ ] Dirty navigation prompts and pending commit navigation is blocked.
- [ ] A forced IndexedDB write failure leaves all participating stores unchanged.
- [ ] A success causes one workspace publication and one notification.
- [ ] Success destinations match footprint, single-facility, and mixed imports.
- [ ] v0 URLs and direct imports of the shared parsers remain operational.
- [ ] JSON backup behavior remains owned by Settings > Backup.
- [ ] Focused tests, browser transaction tests, the validation planner, production web build, and Electron build pass.

## Validation sequence

1. Fast parser, mapping, session, component, route, and command tests.
2. Browser File API and native IndexedDB commit/rollback tests.
3. Representative older/current import followed by V3 export comparison.
4. `npm run validate:agent -- --mode plan` and the selected checks.
5. `npm run test:all:ci`, `npm run build-prod`, and `npm run build-prod-electron` before pull request handoff.
6. Manual responsive, dense-table, keyboard/focus, browser-only, and typical Electron-window checks.

## Assumptions

- Guided modernization improves navigation and error visibility without removing branch-specific decisions.
- Workbook drafts stay memory-only because durable drafts would introduce a new storage contract.
- Existing exclusions remain possible only as explicit user choices.
- v0 and v1 coexist until a separate issue authorizes retirement.
