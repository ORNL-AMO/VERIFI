# V1 Report Export Foundation

Implementation roadmap for [#2791](https://github.com/ORNL-AMO/VERIFI/issues/2791). Work through and review each phase independently. Source and [V1 report architecture](v1-reports-architecture.md) describe the implemented contracts; this document records the agreed scope and checkpoints.

## Agreed scope

| Report | Outputs |
| --- | --- |
| Facility Analysis | PDF and a new PowerPoint presentation |
| Account Better Plants | Direct PDF and existing Excel output; no PowerPoint |
| Facility Data Quality | PDF using ready report results and session histogram preferences |
| Future reports | Feature-owned adapters registered through the same runtime capability |

Better Plants PDF retains the official energy/water form appearance. Its two bundled Excel templates remain byte-for-byte unchanged, with the existing workbook formulas and mappings preserved. Other layouts adapt to v1. Browser printing and presentation mode are deferred. Analysis and Better Plants replaced the issue's original Data Overview pilot; Data Quality uses the same export foundation.

## Architectural decisions

- Feature adapters prepare detached content snapshots from existing ready results and pure presentation projections. Export does not read preview DOM, start another calculation, or acknowledge Data Checks.
- Version-neutral contracts and helpers live under `src/app/shared/report-output/`; stateless writers and delivery live under `src/app/platform/reports/`. V1 chart preparation remains in the v1 chart layer.
- PDF pages and PowerPoint slides retain separate document models. Share values, formatting, table/series projections, and assets rather than introducing a generic authoring framework.
- Writers return artifacts before delivery. Preserve v0 entrypoints through wrappers/re-exports and explicit legacy defaults.
- Each runtime advertises supported formats and owns readiness, progress, cancellation, duplicate prevention, and failures. The workbench has no report-type export branches.
- Flush edits, recheck readiness, detach one coherent snapshot, then build. Cancel on stage/identity changes or changes to exported content. Ignore unrelated workspace revisions. Recheck immediately before delivery, including when serialization cannot be interrupted.
- A dedicated ECharts renderer uses fixed dimensions, a white document palette, resolved semantic colors, disabled animation, completion events, a timeout, and cleanup. Default logical size is 1200 × 675 at pixel ratio 2. Capture sequentially without relying on viewport initialization.

## Phase 1 — Extract existing writers

- [x] Characterize existing PDF/PPT behavior and representative v0 exports.
- [x] Extract models, layout helpers, and stateless Blob writers.
- [x] Preserve asynchronous PDF chart providers and support asynchronous PowerPoint images.
- [x] Preserve v0 public APIs and geometry; fail v1 exports when required assets fail.

**Checkpoint:** neutral writers generate files without initiating downloads; existing v0 callers remain functional.

## Phase 2 — Shared lifecycle

- [x] Add the optional runtime output capability and session export controller.
- [x] Replace placeholder controls with supported format actions and cancel; use shared toasts for progress, download success, and errors/retry messaging.
- [x] Centralize safe filenames, MIME types, download initiation, and object-URL cleanup.
- [x] Protect failed saves, stale inputs, duplicate clicks, teardown, and late completion.

**Checkpoint:** fake adapters exercise the complete workflow without report-specific shell logic. Success means **Download started**, not confirmation of a saved file.

## Phase 3 — ECharts assets

- [x] Share pure metric-chart option construction between preview and export.
- [x] Reuse annual/monthly, model-comparison, and contribution projections.
- [x] Render independent temporary charts with explicit dimensions and readable document colors.
- [x] Handle completion, timeout, abort, and cleanup on every path.

**Checkpoint:** every requested chart exports before scrolling the preview; application theme does not change document colors.

## Phase 4 — Facility Analysis PDF

- [x] Share section, period, and contribution projection with the preview.
- [x] Preserve configured sections, columns, predictors, groups, markers, and model validation.
- [x] Generate landscape A4 with wrapped text, repeated table headers, page numbers, bookmarks, and continuations.
- [x] Split wide tables into ordered column bands with identifying columns repeated; preserve image aspect ratios.

**Checkpoint:** every enabled section matches current v1 meaning, including baseline-only output and banking transitions.

## Phase 5 — Facility Analysis PowerPoint

- [x] Compose an explicit widescreen presentation with editable text and tables.
- [x] Repeat titles, grouped headers, identifying columns, and notes on continuation slides.
- [x] Split wide tables; use a minimum 12-point table font for v1.
- [x] Use native clustered bars for annual consumption, native lines for annual/total improvement, and native stacked bars for monthly savings/losses when all projected values are finite.
- [x] Use ECharts images for missing/transition-masked data, monthly comparison shading, regression/model-period figures, and contribution heatmaps. Never turn a gap into zero.

**Checkpoint:** slides preserve report meaning and retain editable content alongside complex chart images.

## Phase 6 — Better Plants PDF and Excel

- [x] Share company information and prepared pages between preview and adapters.
- [x] Compose portrait US Letter official-form PDF using banner/footer artwork and continuation pages for notes/performance overflow.
- [x] Preserve fiscal labels, selected-year notes, optional performance/names, and newest-first all-year output.
- [x] Extract an asynchronous workbook builder accepting template bytes and explicit category/baseline-year inputs.
- [x] Preserve binary templates, formulas, mappings, percentage conventions, merges, styles, sheet order/visibility, print settings, and blank master sheets.
- [x] Deep-copy each yearly worksheet model independently; use the linked analysis baseline/category for v1 and preserve the legacy wrapper's input behavior.

**Checkpoint:** Better Plants provides working PDF and Excel actions without PowerPoint or browser printing.

## Validation and completion

Test content projections, lifecycle errors/cancellation, real browser chart capture without mounted preview, and actual file generation. Include energy/water, fiscal years, zero/negative/missing values, baseline-only, multi-year, banking, selected columns, dense tables, long names/notes, and many groups. Inspect actual PDF pages and PowerPoint slides; inspect PPTX XML for native charts/tables and reload generated workbooks with ExcelJS to compare formulas and structure.

Run focused tests first, then the agent validation planner, selected fast/browser suites, app type-check, and production web build. This explicit desktop file workflow also requires an Electron build and a focused native download check. Run the full suite at the pre-PR gate. Record failed/unavailable checks rather than treating them as passing.

Update the architecture guide, migration notes, and matching report skill. The future-report cookbook must require only a detached snapshot/readiness adapter, advertised formats, format composers/chart providers, runtime registration, content/lifecycle tests, and representative artifact checks. New reports must not require workbench branches or a global chart registry.

Calculations, units, rounding, persistence, GUID relationships, and template formulas remain unchanged. Known strict performance-band boundaries, water participation ordering, and existing Excel note mappings remain characterized compatibility behavior.

## Implementation verification

| Check | Result |
| --- | --- |
| Full fast suite (`npm run test:ci`) | 489 files / 2,993 tests passed |
| Scoped report/chart Chromium suite | 14 files / 68 tests passed, including real PDF/PPTX/XLSX generation |
| Footer/toast follow-up | 18 focused unit tests and 2 Chromium geometry/cleanup tests passed; toast clearance adapts to wrapped/resized/removed footers |
| Full pre-PR suite (`npm run test:all:ci`) | 2,993 fast tests and 307 Chromium tests passed |
| PDF bookmark regression | First rendered-page targets verified for moved charts/tables, multi-page content, and explicit page breaks |
| App TypeScript check | Passed |
| Production web and Electron builds | Passed; existing browser-support, style-budget, and CommonJS warnings remain |
| Native desktop file workflow | Isolated Electron renderer loaded actual bundled assets through file URLs and downloaded PDF, PowerPoint, and both workbooks byte-for-byte |
| Layout review | Rendered energy/water forms with long notes, facility PDF pages, and PowerPoint slides inspected; sparse table stretching corrected |
| Compatibility | Workbook roundtrips and source-template checksums passed; public v0 entrypoints retained |
| Documentation | Local links and diff whitespace checks passed |

Download progress, success, cancellation, and errors use shared toasts. The footer retains output buttons and cancellation controls. Printing/presentation mode remain deferred; cross-report release verification belongs to the remaining report migrations and the explicit pre-PR/release gate.
