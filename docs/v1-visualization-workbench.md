# V1 Visualization Dashboard and Workbench

Accepted implementation specification for [Vis3 / #2904](https://github.com/ORNL-AMO/VERIFI/issues/2904), following the [foundation](v1-visualization-foundation.md) and [persistence](v1-visualization-persistence.md). This is framework-first delivery within the [Visualizations and Home plan](v1-visualizations-and-home-plan.md).

## Dashboard and creation

Use the Reports/Analysis card dashboard, shared inventory detail levels, paging, sticky filters, and session browse restoration. Show ownership, all selected source families, concrete chart/period summaries, modified date, and setup/reference status without calculating Dashboard items. Search names, owners and saved source labels; filter scope, family and setup/attention status; sort modified (default), name or attention. No folders, tags, favorites, thumbnails, bulk actions or Recents.

Add visualization collects ownership, concrete chart type, one or more source families, then name in stepped selection cards. Reuse Meter/Predictor editable selection chips and step-specific focus: single choices advance immediately, while the multiple-family step requires Continue. Returning to a completed step retains other choices. A named facility entry keeps its current preselected/locked ownership; single-facility accounts skip ownership selection. The section remains Visualizations; the sidebar destination and return actions say Dashboard. Existing `/library` routes and internal branch names remain unchanged.

Offer Line, Bar, Area, Combination, Scatter, Correlation, Heatmap, Breakdown bar, Donut, Treemap and Sankey. Source families are Utility, Predictor, Weather, Energy Use, Analysis Result and Analysis Model. Require at least one family and create one setup source per selected family. Actual resource selection, repeated sources within one family, chart switching and source add/remove remain Vis4–Vis8. Mixed-family intent is supported, but selecting families alone does not prove rendering compatibility. Cards show the concrete chart and every family; a family filter matches any included family.

Commit an incomplete definition through Vis2 before opening the saved workbench. Preserve one proposal GUID and the complete selected chart/source intent across failure/retry; recover committed publication rather than replaying a committed create. Rename remains a simple name form. Single-facility accounts create only facility-scoped items with no scope picker. Existing portfolio items remain visible and unchanged. Scope-changing copies obey the same destination restriction.

Chart defaults are native/unstacked time series, disabled Scatter fit, raw signed correlation, month-year linear heatmap, absolute composition values, unassigned treemap hierarchy and energy-balance Sankey. Scatter X/Y bindings may be absent until actual series are selected; supplied malformed bindings remain invalid. Setup creates no invented series or resource identities. Only Energy Use alone defaults to the latest saved fiscal year; all other combinations start with all saved history and await adapter period review.

The definition remains version 1 with additive support for incomplete Scatter intent. Existing definitions are accepted unchanged; no database, record-envelope or backup-envelope migration is required. Older releases may not recognize new incomplete Scatter intent and may treat its payload as unavailable; the existing preservation/portability rules apply rather than a guarantee that older releases can edit it.

Canonical account routes are `visualization/library` and `visualization/workbench/:visualizationGuid`. Facility entry opens the Dashboard's facility filter. Browsing another scope never retargets a saved definition. Session return context restores originating filters, paging, detail, scroll and focus even if the created/copied item is outside them. Scope switches resolve edits then open the target Dashboard; account switches resolve edits before selecting/publishing the new account. Single-facility visualization entry must not initialize hidden analysis pairs.

## Workbench and save lifecycle

Connected Sources and Appearance sections sit beside persistent preview; narrow screens stack controls first. Edit name, display title and legend initially. Source/period/chart summaries show every selected family and the concrete chart, preserving saved intent; source pickers and capability-specific settings arrive in Vis4–Vis8 through registration points. Concrete production providers and presenters are absent in Vis3 and clearly unavailable; no fabricated chart data is shipped.

Use typed reactive forms, 650 ms serialized autosave, submitted-revision acknowledgements, and retained newer input. Normalize for comparison while retaining equivalent raw text during reconciliation. Merge name, title and legend independently; conservatively group interconnected sources/series/chart/period/comparison. Invalid input stays local; coherent incomplete/unavailable intent can save. Linked consumers see committed intent only.

Distinguish rejected persistence, conflicting authoritative snapshots, and committed-but-unpublished state. Recover the latter by publication/read, never mutation replay. One async navigation preflight owns portal review for both route guards and shell account/scope changes, without changing existing editor policies. Valid pending edits flush; invalid/failed/conflicting edits offer Stay, applicable Retry/Review, and explicit Discard. Running writes block destructive transitions. Protect unresolved session drafts with the shared conditional unload listener; no durable draft journal is added.

## Recovery and preview

Same-scope duplication uses Vis2's duplicate command. Cross-scope duplication uses a reviewed create proposal with independent identity, explicit destination, retained settings and listed cleared dependencies; never map by name. Reset a missing/blocked readable source only after explicit review, clearing the whole affected source selection and dependent series/chart references, retaining coherent reusable chart/appearance/date intent. Scatter repair clears only axis bindings whose series were removed; an unassigned axis stays setup-required and does not erase the selected Scatter chart. Readable transfer locks require acknowledgement and removal of unverified relationships. Unknown/unreadable formats stay read-only and backup-preserved, with diagnostics and confirmed deletion; no rename/copy/reset.

An externally deleted editor remains mounted with its draft. Save as new reviews local intent and allocates a fresh stable proposal. A deleted original facility requires explicit valid destination/scope review rather than automatic retargeting.

Preview is independent of save status. Only active previews request providers. Use one shared date context, exact chart support and domain compatibility checks. Abort and reject obsolete account/workspace/definition/edit/request responses. Providers/presenters and optional source editors are registrations; test adapters exercise ready, empty, loading/waiting, missing source, incompatible and calculation-error states. Production adapters and real-data chart acceptance remain downstream in Vis4–Vis8.

Use shared inventory/chart layers, portal-based `ConfirmationDialogComponent`, focus restoration, meaningful labels, accessible values alternatives, light/dark/high-contrast tokens, narrow windows and printing. No schema, backup version, calculation, v0, report, weather retrieval or IPC changes.

## Delivery stack

| Branch | Owns | Base |
| --- | --- | --- |
| `codex/vis3-contracts` | Specification, routes/browse/card contracts, preflight and registration boundaries, pure reset/copy helpers/tests | `unified-ux` |
| `codex/vis3-library` | Card dashboard, filters/paging/detail, creation, rename, same-scope duplicate, delete, browse restoration | Contracts |
| `codex/vis3-editor` | Workbench, metadata forms, autosave, reconciliation, protected leave | Library |
| `codex/vis3-preview` | Resolution/presenter/editor slots, compatibility/cancellation, state presentation, test adapters | Editor |
| `codex/vis3-recovery` | Reviewed source reset, cross-scope copy, transfer locks, deleted-draft recovery | Preview |
| `codex/vis3-integration` | Shell routes/navigation/single-site behavior, Dashboard sidebar, rail activation, combined acceptance | Recovery |

Library, editor and preview development may proceed in parallel after interfaces are pinned; integrate into the ordered stack with disjoint ownership. One integrator owns shared interfaces and shell changes. Every slice owns focused tests. Each PR requires context-aware self-review and a fresh no-history reviewer, both [review records](agents/pr-review-record.md), and non-closing `Connects #2904`. Publication/merge are separate authorization steps.

## Validation and acceptance

Fast tests cover Dashboard projections and controls, all families, single-site creation, retry identity, save races/conflicts/recovery, invalid input, reset/copy, unknown preservation and canceled navigation. Chromium covers real storage/reopen after reinitialization, keyboard/focus, browser history, source loss, external deletion, reviewed repair, account/scope changes before publication, and obsolete preview rejection. Protect shared inventory, existing editor policies and single-site no-analysis-write behavior.

Use the validation planner, focused checks, app type-check, full tests before handoff and production web build. The persisted incomplete-Scatter contract adjustment also receives production Electron build and backup/reopen coverage; no IPC or desktop integration behavior changes. Vis3's framework journey can be accepted independently; actual real-data preview acceptance remains pending until the first Vis4/Vis6 integration. Record actual validation evidence and gaps; do not close the broader acceptance early.

## Historical implementation evidence before alignment

The six slices are implemented locally. The library is enabled only with the integrated guarded workbench. Real-data source/chart acceptance remains pending in Vis4–Vis8; this does not close #2904. Invalid single-facility account setup blocks creation/copy until its sole facility is restored or the account is explicitly converted to a portfolio.

- `npm run test:all:ci`: 4,297 fast tests and 533 Chromium tests passed. Vis3 includes native storage/reopen, publication recovery without write replay, reviewed transfer repair, deleted-draft recovery, keyboard, browser-history, and stale-preview coverage.
- App and browser-spec TypeScript checks passed; local documentation links and whitespace checks passed.
- Production web build passed with existing component-budget and dependency-format warnings. No Electron boundary changed; Electron release validation is not claimed.
- Earlier restricted Angular invocations aborted with exit 134 and were rerun with normal process access. An existing Energy Use browser year check timed out in one full run, then passed both focused and full reruns without unrelated calculation or test changes.

PR preparation retains context-aware self-review and separate fresh no-history review records. Publication, human review, QA and merge remain separate steps.
