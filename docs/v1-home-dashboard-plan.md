# V1 Home delivery phases

Delivery tracker for [Home1 #2912](https://github.com/ORNL-AMO/VERIFI/issues/2912) through Home6 in [epic #2564](https://github.com/ORNL-AMO/VERIFI/issues/2564). The [parent phase plan](v1-visualizations-and-home-plan.md) owns dependency order across Visualizations and Home.

## Contract owners and status

- The [Home dashboard specification](v1-home-dashboard-spec.md) owns the accepted intended templates, layouts, bindings, filters, lifecycle, future interface requirements and acceptance scenarios.
- The [Home content map](v1-home-content-map.md) owns source-backed legacy dispositions and adapter gaps.
- Current runtime behavior remains owned by existing visualization, workspace, status, calculation and persistence references. Home1 has delivered a specification; customizable dashboards and Home2–Home6 remain unimplemented. Human review/QA and issue closure are separate from specification delivery.
- Implement the new overview experience before migrating overview reports. Overview reports have not been migrated; their formats and creation flow remain later Reports work. Home must not advertise an unavailable v1 overview-report action.

As phases land, move their implemented contracts into the appropriate current references and retire completed planning material after preserving unique invariants and open acceptance. Do not use this tracker as a competing behavior specification.

## Home1 specification handoff

| Slice | Delivered artifact | Boundary |
| --- | --- | --- |
| H1-A | Source-backed content inventory covering both Home pages, eight Overview pages, nested controls/charts/tables/actions and calculation owners | Retain/combine/exclude decisions; no runtime parity claim |
| H1-B | Seven template compositions with ordered widgets, bindings, periods, data states and wide/narrow layout annotations | Account/facility/single-facility variants; no rendered UI claim |
| H1-C | Reporting-following/link/filter/lifecycle/return contracts, follow-on interface requirements and scenario/issue acceptance matrices | No executable schema, provider, persistence, calculation or report changes |

Home1 design walkthroughs are specified in the acceptance matrix. Browser, native storage/Worker, import/export, real-data and desktop evidence belongs to each implementing phase below; a later integrated gate does not defer focused tests.

## Remaining delivery

Each phase remains pending until its implementation, focused validation and applicable human acceptance are complete. Work through phases individually. Dependencies permit stable contract work to overlap; they do not authorize starting the next phase automatically.

### Home2 storage and compatibility

[Issue #2913](https://github.com/ORNL-AMO/VERIFI/issues/2913). Depends on Home1 and Vis2.

Implementation slices remain based on `home2`: contracts/schema/reporting intent; atomic commands/workspace/lifecycle; backup/copy/deletion and integrated acceptance. Each includes focused fast/native coverage and is reviewed/published against its immediate predecessor, with cumulative review against `home2`. The reviewed Home1 contract commit is an isolated prerequisite in the first slice.

Compatibility choices: two initially empty Home stores at structural schema 22; versioned record/payload envelopes independent of saved and workspace revisions; unchanged global data version; missing older collections mean no initialization evidence, while an explicit initialized empty owner never reseeds. Chart links are GUID references, and future payloads retain opaque JSON plus verified-transfer blocks. Home6 supplies immutable recipes through the Home2 graph-command contract; no incomplete template workflow is activated here.


- [ ] Add durable dashboard/default/layout/widget records, template provenance, origin metadata, and initialization/deletion state.
- [ ] Define serialized reporting-following bindings alongside exact named-analysis bindings, with validation and verified transfer/remapping behavior before runtime use.
- [ ] Implement atomic creation, duplication, deletion, restore, and untouched-template upgrade commands with one committed publication and safe recovery.
- [ ] Preserve supported older backups, imported dashboards, unknown payloads, account/facility ownership, and linked-definition identity.
- [ ] Cover round trips, initialization idempotency, interrupted commits/publication recovery, source loss, shared-chart customization protection, and native IndexedDB transactions.

### Home3 navigation and layout

[Issue #2914](https://github.com/ORNL-AMO/VERIFI/issues/2914). Depends on Home1 and Home2.

- [ ] Add dashboard sidebar entries, owner navigation, user-selected default, and empty creation state.
- [ ] Implement dashboard creation/rename/reorder/duplicate/delete/restore controls and template selection without changing shipped templates.
- [ ] Implement editable layout, keyboard reorder/resize, responsive reading order, plain-text notes, and internal shortcuts.
- [ ] Cover focus restoration, canceled confirmations, long names, conditional visibility, saved preferences, and narrow desktop windows.

### Home4 linked visualization embedding

[Issue #2915](https://github.com/ORNL-AMO/VERIFI/issues/2915). Depends on Home2, Home3, and Vis9.

- [ ] Render linked charts with origin grouping/filtering, visible source context, and explicit named-analysis versus reporting-following behavior.
- [ ] Resolve Active for reporting bindings against current committed owner settings; preserve exact named bindings and explain absent/invalid selections.
- [ ] Extend embedding capabilities for supported display overrides, date precedence, session exploration, and Save as dashboard defaults.
- [ ] Implement chart open/return, source repair/replacement, retry, and recovery placeholders without implicit definition writes.
- [ ] Bound demand to active widgets and reject obsolete account/dashboard/definition/source requests; cover native Worker/browser journeys where affected.

### Home5 summaries and supporting widgets

[Issue #2916](https://github.com/ORNL-AMO/VERIFI/issues/2916). Depends on Home1, Home3, and Vis5. Chart-backed integration uses Home4.

- [ ] Implement goal cards, reporting-following progress summaries, and latest-per-facility progress comparisons using existing authoritative calculations.
- [ ] Implement prioritized actions with existing v1 status preferences/destinations and applicable scope.
- [ ] Implement summary/detail/source tables, water subtype and emissions-category adapters, selected-period facility comparisons, and optional portfolio maps with accessible alternatives. These additions are explicit Home delivery work, not assumed existing saved-chart capabilities.
- [ ] Preserve unavailable rows, through-dates, goal/analysis baseline distinctions, missing costs, true zeros, incomplete coverage, and equipment estimate provenance.

### Home6 starter templates and integrated acceptance

[Issue #2917](https://github.com/ORNL-AMO/VERIFI/issues/2917). Depends on Home1–Home5 and Vis10.

- [ ] Instantiate the complete starter set, share matching starter charts, and expose all seven creation templates with useful descriptions.
- [ ] Apply water/emissions eligibility and live membership without overriding explicit user choices or changing exact saved-source intent.
- [ ] Verify restore and untouched-template upgrades with shared definitions, customized charts, deleted defaults, and preserved older charts.
- [ ] Complete content acceptance against the Home1 inventory and document intentional dispositions; do not silently drop unavailable content.
- [ ] Exercise dense portfolios, single-facility presentation, reporting-selection changes, incompatible settings/calendars, backup transfer, source deletion, themes, keyboard access, responsive layouts, printing, and practical Electron windows.

## Validation

Use the [testing policy](testing.md), validation planner and [PR workflow](agents/pr-workflow.md). Documentation-only changes require source/link/command inspection, `npm run docs:check` and whitespace checks, without artificial app tests or unrelated builds. Runtime phases require their affected tests and boundaries; Home6 owns the combined scenarios listed in the specification. Human review and QA retain issue closure.
