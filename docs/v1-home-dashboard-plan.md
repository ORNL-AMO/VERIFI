# V1 Home delivery phases

Delivery tracker for [Home1 #2912](https://github.com/ORNL-AMO/VERIFI/issues/2912) through Home6 in [epic #2564](https://github.com/ORNL-AMO/VERIFI/issues/2564). The [parent phase plan](v1-visualizations-and-home-plan.md) owns dependency order across Visualizations and Home.

## Contract owners and status

- The [Home dashboard specification](v1-home-dashboard-spec.md) owns the accepted intended templates, layouts, bindings, filters, lifecycle, future interface requirements and acceptance scenarios.
- The [Home content map](v1-home-content-map.md) owns source-backed legacy dispositions and adapter gaps.
- Built-in Home/Overview views use shipped configurations; viewing them creates no saved visualizations. Layout preferences and explicit chart customization are saved separately. The specification owns this planned product contract; Home4 extends storage compatibility; complete default-view activation remains gated on its rendering and composition work.
- Current runtime behavior remains owned by existing visualization, workspace, status, calculation and persistence references. Home1 has delivered a specification; [Home2 persistence](v1-home-persistence.md) implements storage and compatibility contracts. [Home3 workspace](v1-home-workspace.md) implements navigation/layout editing; Home4 compatibility, shared rendering and protected interactions are merged; Home5 widgets and Home6 compositions remain pending. Human review/QA and issue closure are separate from specification delivery.
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

Each phase remains pending until its implementation, focused validation and applicable human acceptance are complete. Deliver capability slices across Home4–Home6 toward the milestone below. A complete first Home does not wait for all capture locations, every optional widget or the final six-template parity gate. This sequencing does not mark unfinished issues complete or authorize unrelated work automatically.

### First usable Home milestone

1. Define built-in versus saved chart references, owner-qualified dashboard/widget identities and versioned preference/customization contracts before changing runtime storage or routes. Preserve existing Home2/Home3 data and align issue acceptance with the revised specification.
2. Use the shared rendering/provider pipeline to display built-in chart configurations directly; also retain explicit saved-chart links. Implement the reporting-following resolution and exact rolling-improvement projection required by Home.
3. Deliver Home's actions and energy/water goal summaries through existing status/calculation owners, then assemble the complete Home composition with truthful setup/empty states. Its first display must not require saved-chart creation.
4. Complete the first Home release with customization, explicit Save as visualization, protected open/return and recovery. Store layout/compatible chart overrides on the dashboard; materialize a separate saved chart only for an explicit user save requiring one.
5. Release other complete overview/Goal Progress templates as their required charts, summaries and tables are ready. Reuse their configuration builders for optional quick-create chart recipes. Continue Vis9 capture breadth independently; retain final Home6/Vis10 integration and parity acceptance.

Before enabling built-in views, define stable recipe/version identity distinct from GUIDs; route/default/order/hidden/deleted resolution; reproducible customization baselines; backup/copy/remapping and unknown-version behavior; and atomic explicit materialization with expected revisions, stable proposals and publication-only recovery. Existing saved charts, Home-origin records, imported preferences and initialized-empty sets must not be converted, deleted or reseeded just to adopt the new model. New/unconfigured owners may see available complete views without writes; later templates are choices, not automatic refills of configured/deleted sets. The existing six-recipe initializer remains inactive until its contract is revised, rather than being bypassed to create partial saved graphs.

### Home2 storage and compatibility

[Issue #2913](https://github.com/ORNL-AMO/VERIFI/issues/2913). Depends on Home1 and Vis2.

Implemented contracts are owned by [Home persistence](v1-home-persistence.md), including record/default handling, serialized bindings, atomic lifecycle commands, workspace recovery, verified backup/copy/remapping, and owner/source deletion. Native acceptance covers restart, rollback, revision conflicts, repeated initialization, publication recovery, shared links, missing sources, unknown formats and older backups. Human review/QA remains required before phase acceptance and issue closure.

These implemented commands retain their current saved-reference and six-recipe initialization grammar. Home4 adds built-in chart references and versioned owner view preferences while preserving the existing graphs. The milestone above extends those contracts without rebuilding persistence or enabling the old initializer as a shortcut.

### Home3 navigation and layout

[Issue #2914](https://github.com/ORNL-AMO/VERIFI/issues/2914). Depends on Home1 and Home2.

Implemented contracts are owned by [Home workspace](v1-home-workspace.md): owner-local navigation/defaults/order and empty recovery, dashboard lifecycle, complete-recipe catalog boundary, protected typed drafts and publication-only recovery, note/shortcut/saved-chart widget structure, keyboard/pointer layout controls, and responsive/committed print order. Blank and existing persisted dashboards are functional. Complete shipped recipes/initialization remain Home6; numerical chart and data-widget content remain Home4/Home5. Human review/QA and issue acceptance remain separate.

### Home4 built-in rendering and linked visualization embedding

[Issue #2915](https://github.com/ORNL-AMO/VERIFI/issues/2915). Uses Home2/Home3 and the saved-definition/provider capabilities needed by each chart. Full Vis9 capture coverage is not a prerequisite; capturing an existing screen and rendering a supported configuration are separate entry paths.

- [x] Complete the built-in reference/preference/compatibility contracts in the first milestone; preserve existing GUID links and durable owner choices.
- [x] Render built-in configurations and linked saved charts through the shared pipeline with visible source context and explicit named-analysis versus reporting-following behavior. Default viewing must create no saved visualization records.
- [x] Resolve Active for reporting bindings against current committed owner settings; preserve exact named bindings and explain absent/invalid selections.
- [x] Extend embedding capabilities for supported display overrides, date precedence, session exploration, and Save as dashboard defaults.
- [x] Implement protected built-in customization drafts, explicit save/materialization and chart open/return, repair/replacement, retry and recovery without viewing-time writes or orphan records. Existing saved-chart edits retain explicit shared-link semantics.
- [x] Bound demand to active widgets and reject obsolete account/dashboard/definition/source requests; cover native Worker/browser journeys where affected.

Merged Home4 infrastructure does not establish Home6 composition/parity acceptance, paginated print-output QA or human issue acceptance.

### Home5 summaries and supporting widgets

[Issue #2916](https://github.com/ORNL-AMO/VERIFI/issues/2916). Depends on Home1, Home3, and Vis5. Chart-backed integration uses Home4.

Prioritize the actions/goals needed by the complete first Home, then the summaries/tables needed by each next overview. Optional maps and broader adapters need not block templates that do not use them; required composition elements must not be omitted.

- [ ] Implement goal cards, reporting-following progress summaries, and latest-per-facility progress comparisons using existing authoritative calculations.
- [ ] Implement prioritized actions with existing v1 status preferences/destinations and applicable scope.
- [ ] Implement summary/detail/source tables, water subtype and emissions-category adapters, selected-period facility comparisons, and optional portfolio maps with accessible alternatives. These additions are explicit Home delivery work, not assumed existing saved-chart capabilities.
- [ ] Preserve unavailable rows, through-dates, goal/analysis baseline distinctions, missing costs, true zeros, incomplete coverage, and equipment estimate provenance.

### Home6 starter templates and integrated acceptance

[Issue #2917](https://github.com/ORNL-AMO/VERIFI/issues/2917). First complete compositions depend on their implemented Home4/Home5 capabilities and compatibility contracts. Final issue acceptance still depends on Home1–Home5 and Vis10.

- [ ] Ship versioned built-in compositions progressively, beginning with Home, without automatically saving their chart definitions or populating the visualization library. Expose each template only when complete, with useful descriptions; retain all six agreed compositions and Blank as the final catalog.
- [ ] Apply water/emissions eligibility and live membership without overriding explicit user choices or changing exact saved-source intent.
- [ ] Verify compatible built-in revisions, protected customizations, explicit restore, saved-link sharing, deleted defaults and preserved older charts. Remove the all-six-before-first-view gate only after the revised contracts are implemented.
- [ ] Complete content acceptance against the Home1 inventory and document intentional dispositions; do not silently drop unavailable content.
- [ ] Exercise dense portfolios, single-facility presentation, reporting-selection changes, incompatible settings/calendars, backup transfer, source deletion, themes, keyboard access, responsive layouts, printing, and practical Electron windows.

## Validation

Use the [testing policy](testing.md), validation planner and [PR workflow](agents/pr-workflow.md). Documentation-only changes require source/link/command inspection, `npm run docs:check` and whitespace checks, without artificial app tests or unrelated builds. Runtime phases require their affected tests and boundaries; Home6 owns the combined scenarios listed in the specification. Human review and QA retain issue closure.
