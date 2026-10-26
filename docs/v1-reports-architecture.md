# V1 report architecture

The existing account/facility Reports workbench owns inventory, lifecycle, routes, common editing, navigation protection, and stage presentation. Individual report migrations supply their settings, applicable checks, and in-app content. Better Plants is the first implemented account report; see [#2804](https://github.com/ORNL-AMO/VERIFI/issues/2804).

## Ownership and extension pattern

- Keep each report in its owning feature folder. The existing routed Setup, Data Checks, and Report components compose report-specific components; unmigrated types keep their explicit placeholders.
- Reuse `ReportAutosaveController` for scheduling and protection. A feature editor owns a typed draft and translates only explicitly edited fields into a setup command. Handlers merge with the latest durable record and publish the full affected-record patch after commit.
- Keep input preparation and deterministic checks/calculations under `domain/reports`; platform owns Worker messages, teardown, and SHA-256 hashing. `AnalysisReportCalculationService` supplies the existing two-minute Worker timeout and the synchronous fallback.
- A route-scoped coordinator owns demand, current results, errors, and retry. Shared report state vocabulary and form-surface CSS live under v1 shared reports. Components render prepared values rather than starting Workers or querying repositories.
- Separate pure presentation projections from rendering. Better Plants consumes the existing `BetterPlantsSummary` contract and builds form rows without rounding calculated values. Future print/file adapters can consume those results separately from the DOM.

This is an extension pattern, not a dynamic report-authoring framework. Add common capabilities only when an implemented report needs them.

## Data flow and calculation lifetime

One committed account workspace snapshot supplies the selected account analysis, owned facilities and facility analyses, transitive banking dependencies, meter readings, and relevant predictor inputs. Single-facility reports preserve their saved hidden account-analysis GUID while resolving the underlying facility analysis as the review owner. Reading a report never creates or repairs pairs; use the existing explicit link-selection/refresh command.

Setup computes review freshness without starting a checks or report Worker. Data Checks requests model validation at each included reporting year. Report generation starts only after matching reviews exist for every requested year and current workspace/report validation permits calculation. All-year output runs newest first, excludes the baseline itself, and is bounded by the loaded meter history.

Setup's analysis inspection buttons reuse the account and facility dashboard detail slideouts and their demand-driven outcome coordinator. Only the inspected analysis requests outcome results, and closing the slideout cancels that demand. Inspection does not change the report link; **Select for report** updates the existing typed draft and uses normal autosave. Account and facility active-reporting selections remain independent.

The shared detail status box contains validation findings and suppresses stale findings while checks are pending or unavailable. Account inspection reuses the Select Facility Items candidate projection for status, group methods, and Data Through, alongside saved modification dates and the summary card's valid/total selection count. Tables adapt to narrow slideouts without horizontal scrolling. Shared linked-item rows identify report types with icons and preserve analysis and banking dependency identities. These views read the workspace without requesting additional result Workers or changing selections.

**Go To Analysis** saves pending report edits and opens the inspected analysis without selecting it. A GUID-based report origin supplies **Return to Report** in both analysis workbench headers. The route-scoped [return service](../src/app/v1/shared/reports/report-analysis-return.service.ts) revalidates the owning account and available report, retains the origin across analysis stages, and carries it through account-to-facility drill-ins. Returns save pending analysis edits and use canonical report Setup routes and the existing navigation guards. Missing or unavailable reports suppress the return action. Report-origin facility entry validates the target owner and skips automatic hidden-pair repair, including for an inspected analysis that is not selected for the report.

Analysis selection filters narrow the cards by category and baseline year without changing the selected analysis or saving report edits. The type filter appears only when the account contains both energy and water categories. Filters reset when switching reports, and a selected analysis hidden by the filters remains linked and is identified above the cards.

The coordinator retains only its current checks and report results. Changes to account/report identity, readiness, operation, or checked content cancel obsolete work. A synchronous state projection hides old results before Observable scheduling can publish another result. Changes to names or report notes reproject presentation without regenerating calculations. Hashing participates in Angular pending-task tracking; Worker unsubscription, error, timeout, and completion terminate the Worker.

## Explicit shared analysis review

Visiting Data Checks does not acknowledge review. Users explicitly confirm that they have reviewed the analysis and its issues. Critical model issues and existing blocking report/analysis findings prevent confirmation; displayed warnings can be acknowledged. An unconfirmed or stale report route shows a Data Checks action instead of report values.

Account and facility analyses have an optional `dataCheckReviews` array. Each receipt records the checks version, report year, SHA-256 input fingerprint, and confirmation timestamp. One receipt is retained per checks version/year. The receipt belongs to the account analysis for portfolios, or the underlying facility analysis for single-facility workspaces. Matching reports share it, independently of their names, notes, or content visibility options. All-year reports need receipts for every displayed period.

The fingerprint includes the review owner, reporting year, baseline, effective calculation settings, selected facility/group analyses and models, banking dependencies, relevant meters/readings, and predictor inputs. It excludes receipt metadata, local numeric IDs, names, contact details, and display metadata. GUID collections are canonicalized; coefficient and predictor ordering is preserved. Unused regression candidates and meters outside the included/banking groups do not invalidate review.

Acknowledgment computes and validates the displayed checks before opening an IndexedDB transaction. The transaction rereads the complete dependency set, synchronously compares its canonical content with the displayed content, merges receipts into the latest analysis, and commits atomically. Asynchronous hashing never occurs inside a native IndexedDB transaction. A changed dependency or failed write prevents confirmation and publication.

Absent receipts mean unreviewed. This optional addition needs neither a record backfill nor an IndexedDB schema/data-version increment. Backups can carry the optional metadata; import clears it after GUID remapping. Analysis copies clear receipts. Copying a report can reuse review of its unchanged analysis. Legacy `isAnalysisVisited` and `dataCheckedDate` remain separate and are not advanced by report navigation or acknowledgment.

## Better Plants presentation and compatibility

Energy and water reports preserve the current program calculations, selected data, source/site conversions, units, fiscal-year treatment, precision, optional sections, notes, and saved report configuration. The official banner, footer, and form relationships remain, with v1 theme tokens, accessible tables, wrapped notes, and horizontal table overflow at narrow widths.

Two existing presentation/calculation quirks are deliberately characterized rather than corrected in this migration: facility-performance bands use strict inequalities, excluding exact band endpoints; the legacy water participation table places report-year counts in its first numeric column and baseline-year counts in the second. Any correction needs a separate reviewed behavior change and output parity work.

Per maintainer direction, this migration covers setup, checks/review, and in-app display. Printing and file output remain separate work under [#2791](https://github.com/ORNL-AMO/VERIFI/issues/2791) and subsequent output tasks. Existing v0 calculations and writers remain functional; production v1 does not import v0 UI.

## Verification

Protect deterministic input selection, review freshness, model checks, form projection, and autosave with fast tests. Use Chromium for Worker messages, transaction rollback/stale-review rejection, reopen/backup behavior, and the complete review/display/invalidation journey. Inspect the form at practical desktop and narrow browser widths in light, dark, and high-contrast themes. Follow the [repository validation policy](testing.md) and validation planner for parent checks.
