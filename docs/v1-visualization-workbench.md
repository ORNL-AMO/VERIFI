# V1 Visualization Library and Workbench

Accepted implementation specification for [Vis3 / #2904](https://github.com/ORNL-AMO/VERIFI/issues/2904), following the [foundation](v1-visualization-foundation.md) and [persistence](v1-visualization-persistence.md). This is framework-first delivery within the [Visualizations and Home plan](v1-visualizations-and-home-plan.md).

## Library and creation

Use the Reports/Analysis card dashboard, shared inventory detail levels, paging, sticky filters, and session browse restoration. Show ownership, source family, chart/period summaries, modified date, and setup/reference status without calculating library items. Search names, owners and saved source labels; filter scope, family and setup/attention status; sort modified (default), name or attention. No folders, tags, favorites, thumbnails, bulk actions or Recents.

Create collects name, scope and one of Utility, Predictor, Weather, Energy Use, Analysis Result or Analysis Model. Commit an incomplete definition through Vis2 before opening the saved workbench. Preserve one proposal GUID across failure/retry; recover committed publication rather than replaying a committed create. Single-facility accounts create only facility-scoped items with no scope picker. Existing portfolio items remain visible and unchanged. Scope-changing copies obey the same destination restriction.

Canonical account routes are `visualization/library` and `visualization/workbench/:visualizationGuid`. Facility entry opens the library's facility filter. Browsing another scope never retargets a saved definition. Session return context restores originating filters, paging, detail, scroll and focus even if the created/copied item is outside them. Scope switches resolve edits then open the target library; account switches resolve edits before selecting/publishing the new account. Single-facility visualization entry must not initialize hidden analysis pairs.

## Workbench and save lifecycle

Connected Sources and Appearance sections sit beside persistent preview; narrow screens stack controls first. Edit name, display title and legend initially. Source/period/chart summaries preserve saved intent; source pickers and capability-specific settings arrive in Vis4–Vis8 through registration points. Concrete production providers and presenters are absent in Vis3 and clearly unavailable; no fabricated chart data is shipped.

Use typed reactive forms, 650 ms serialized autosave, submitted-revision acknowledgements, and retained newer input. Normalize for comparison while retaining equivalent raw text during reconciliation. Merge name, title and legend independently; conservatively group interconnected sources/series/chart/period/comparison. Invalid input stays local; coherent incomplete/unavailable intent can save. Linked consumers see committed intent only.

Distinguish rejected persistence, conflicting authoritative snapshots, and committed-but-unpublished state. Recover the latter by publication/read, never mutation replay. One async navigation preflight owns portal review for both route guards and shell account/scope changes, without changing existing editor policies. Valid pending edits flush; invalid/failed/conflicting edits offer Stay, applicable Retry/Review, and explicit Discard. Running writes block destructive transitions. Protect unresolved session drafts with the shared conditional unload listener; no durable draft journal is added.

## Recovery and preview

Same-scope duplication uses Vis2's duplicate command. Cross-scope duplication uses a reviewed create proposal with independent identity, explicit destination, retained settings and listed cleared dependencies; never map by name. Reset a missing/blocked readable source only after explicit review, clearing the whole affected source selection and dependent series/chart references, retaining coherent reusable appearance/date intent. Readable transfer locks require acknowledgement and removal of unverified relationships. Unknown/unreadable formats stay read-only and backup-preserved, with diagnostics and confirmed deletion; no rename/copy/reset.

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
| `codex/vis3-integration` | Shell routes/navigation/single-site behavior, Library sidebar, rail activation, combined acceptance | Recovery |

Library, editor and preview development may proceed in parallel after interfaces are pinned; integrate into the ordered stack with disjoint ownership. One integrator owns shared interfaces and shell changes. Every slice owns focused tests. Each PR requires context-aware self-review and a fresh no-history reviewer, both [review records](agents/pr-review-record.md), and non-closing `Connects #2904`. Publication/merge are separate authorization steps.

## Validation and acceptance

Fast tests cover library projections and controls, all families, single-site creation, retry identity, save races/conflicts/recovery, invalid input, reset/copy, unknown preservation and canceled navigation. Chromium covers real storage/reopen after reinitialization, keyboard/focus, browser history, source loss, external deletion, reviewed repair, account/scope changes before publication, and obsolete preview rejection. Protect shared inventory, existing editor policies and single-site no-analysis-write behavior.

Use the validation planner, focused checks, app type-check, full tests before handoff and production web build. Electron gates apply only for Electron boundaries. Vis3's framework journey can be accepted independently; actual real-data preview acceptance remains pending until the first Vis4/Vis6 integration. Record actual validation evidence and gaps; do not close the broader acceptance early.
