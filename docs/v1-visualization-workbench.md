# V1 visualization Dashboard and workbench

This reference owns browsing, creation, editing, navigation, repair, and preview lifecycle. Use [foundation](v1-visualization-foundation.md) for meaning/runtime contracts and planned Home reuse, [persistence](v1-visualization-persistence.md) for durable commands/transfers, and [utility visualizations](v1-utility-visualizations.md) for implemented resources, line/bar controls, recipes, and capture.

## Dashboard and creation

Visualizations is enabled. Its Dashboard reuses resource cards, shared inventory detail levels, paging, sticky filters, and session browse restoration. Cards show ownership, source families, chart/period summaries, modification, and setup/reference status without calculating every item. Search names, owners, and saved source labels; filter scope/family/setup/attention; sort modified (default), name, or attention. Folders, tags, favorites, thumbnails, bulk actions, and Recents are not implemented.

Custom creation collects ownership, concrete chart type, one or more source families, and name through selection cards. Single choices advance; multi-family selection requires Continue. Returning retains choices. Facility entry preselects/locks ownership; single-facility accounts skip the owner choice and create only facility-scoped items. Existing portfolio definitions stay visible. Invalid sole-facility setup blocks creation and copying until repaired or explicitly converted to a portfolio.

The catalog offers setup for Line, Bar, Area, Combination, Scatter, Correlation, Heatmap, Breakdown bar, Donut, Treemap, and Sankey, with Utility, Predictor, Weather, Energy Use, Analysis Result, and Analysis Model families. Choosing them does not establish rendering compatibility. Each family creates one coherent setup source without invented resources/series. Utility sources can now be configured and added, with explicitly bound Energy usage trend and Utility cost trend recipes. Other providers and chart breadth remain pending.

Commit coherent incomplete intent before opening the saved workbench. One proposal GUID and chart/source intent survive failed creation and retry; committed publication failure recovers rather than recreates. Rename stays a simple form. Recipes create independent definitions only after explicit saved-meter binding.

Setup defaults are native/unstacked time series, disabled Scatter fit, raw signed correlation, month-year linear heatmap, absolute composition, unassigned treemap hierarchy, and energy-balance Sankey. Scatter axes may remain unassigned; malformed supplied bindings are rejected. Energy Use alone defaults to latest saved fiscal year; other families use all saved history subject to adapter review. Definition version 2 accepts version-1 intent without a read-time write; unreadable formats follow persistence preservation rules.

Account routes retain `visualization/library` and `visualization/workbench/:visualizationGuid`. Facility entry filters Dashboard rather than retargeting intent. Session returns restore original filters, page/detail, scroll, and focus even if a created/copied item falls outside them. Scope navigation resolves edits before opening the destination Dashboard; account navigation resolves edits before another account is selected/published. Entry does not initialize hidden analysis pairs.

## Editing and guarded navigation

Connected Sources and Appearance sit beside a persistent preview; narrow screens stack controls first. Typed editors own name/title/legend, supported source/period fields, and registered chart settings. Unsupported combinations retain coherent intent with setup/unavailable feedback, never fabricated chart data.

Typed reactive forms use serialized debounced autosave and submitted-revision acknowledgements. Normalize comparisons while retaining equivalent raw text. Merge name, title, and legend independently; conservatively group interconnected source/series/chart/period/comparison changes. Acknowledgement updates the submitted baseline without replacing newer input. Invalid source/date fields remain protected during unrelated metadata saves; external changes to that configuration require explicit saved/local review. Linked consumers use committed definitions, never drafts.

Distinguish rejected persistence, conflicting authoritative snapshots, and committed-but-unpublished state. Recover the last through publication/read without mutation replay. One asynchronous navigation preflight owns portal review across route guards and shell account/scope actions. Valid pending edits flush; invalid/failed/conflicting input offers Stay, applicable Retry/Review, and explicit Discard. Running writes block destructive transitions. Shared conditional unload protection guards unresolved session drafts; no durable journal is added.

## Repair and deleted-draft recovery

Same-scope Duplicate uses independent identity. Cross-scope copying uses a reviewed stable creation proposal with explicit destination, retained reusable settings, and listed cleared dependencies; never map by name. In single-facility accounts, copying retained portfolio intent requires review into the sole facility.

Reset readable missing/blocked sources only after review. Clear the affected selection and dependent series/chart references while retaining coherent reusable appearance/date/chart intent. Scatter repair clears removed axis bindings without erasing its selected chart. Readable transfer locks require acknowledgement/removal of unverified relationships. Unknown/unreadable formats remain read-only and backup-preserved, with diagnostics and confirmed deletion, without rename/copy/reset.

Externally deleted editors remain mounted with drafts. Save as new reviews intent and retains a new stable proposal. Deleted facilities require explicit valid destination review. Protected recovery proposals veto navigation before their portal can be replaced, including after an awaited flush. Cancel rejected proposals back to the original dirty draft; committed proposals require refresh-only recovery. Discarding incomplete child fields always needs an explicit decision.

## Preview and validation

Preview availability is independent of save status. Active previews alone request registered providers. Feature-injector registration supports lazy-loaded providers, presenters, and source editors. Use shared dates, exact settings support, domain compatibility, cancellation, and account/workspace/definition/edit/request identity; reject obsolete responses. Utility line/bar previews and supported underlying values are implemented. Other capabilities expose setup/unavailable states until their adapters arrive.

Use shared chart/inventory layers, shell-portal confirmations, focus restoration, accessible values, theme tokens, narrow layouts, and print support. Protect projections, ownership, retry identity, save/conflict/recovery races, invalid fields, reviewed copying/reset, unknown preservation, source loss, account/scope transitions, cancellation, and single-facility no-analysis-write behavior. Native storage/backup/reopen and keyboard/history/rendering journeys complement pure/editor tests. Select commands and broader gates through [testing policy](testing.md) and the validation planner. Remaining source/chart/capture coverage and full integration acceptance belong to the [phase plan](v1-visualizations-and-home-plan.md).
