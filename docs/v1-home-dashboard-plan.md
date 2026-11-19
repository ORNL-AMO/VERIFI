# V1 Home dashboard plan

Plan for [Home1 #2912](https://github.com/ORNL-AMO/VERIFI/issues/2912) and the subsequent Home phases of [epic #2564](https://github.com/ORNL-AMO/VERIFI/issues/2564). The [visualizations and Home plan](v1-visualizations-and-home-plan.md) owns delivery order across the epic. This plan records the agreed Home experience and phase acceptance so each phase can be developed separately while visualization work finishes.

The product decisions below are agreed; implementation and phase acceptance remain pending. Current behavior remains owned by the existing feature references. As phases land, move implemented contracts into their owning references and retire completed planning material without losing unique decisions or open acceptance.

Implement the new overview experience before migrating overview reports. Overview reports have not been migrated; their report formats and creation flow remain separate later work. Home must not advertise a working v1 overview-report action before that migration lands.

## Accepted Home experience

### Ownership and navigation

- Supply six editable starter dashboards in this sidebar order: Home, Goal Progress, Energy Use, Costs, Emissions, Water. Blank is an additional creation template, not an automatically added dashboard.
- Each account and facility has its own independent set, explicitly bound to its owner. A valid single-facility account exposes one coherent set for its sole facility while retaining required account-backed relationships. Viewing Home never creates hidden analysis pairs.
- Initialize starters once when an owner first enters Home. This replaces the earlier decision against automatically populating dashboards. Initialization creates dashboard/chart records only, never facilities, meters, analyses, or other source data.
- Users may edit, rename, reorder, duplicate, and delete every starter dashboard, including Home. Templates remain separate from their instances. Personas suggest useful content without a role-selection gate or restricted capabilities.
- Clicking the main Home navigation item opens the user-selected default, initially Home. If that dashboard is deleted or conditionally hidden, use the first remaining visible dashboard. With none remaining, show dashboard creation; do not recreate deleted starters.
- Switching owner opens that owner's default dashboard. Explicit same-account reuse of another scope's saved visualization retains its original visible source scope; owner navigation never retargets it. Cross-account widget references are rejected.

### Visibility and empty states

- Reveal default Water navigation and water sections once any water meter exists within the owner scope. Readings are not required: a newly added meter reveals useful setup placeholders.
- Default Emissions visibility follows the account's existing emissions-enabled setting. User-created dashboards remain accessible independently of these starter visibility rules.
- Keep analysis, cost, and equipment placeholders when required configuration or data is missing. Explain what is missing and link to the relevant existing setup/data workflow.
- Preserve explicit user visibility choices and deletions. Automatic eligibility changes do not erase saved widgets or resurrect deleted dashboards.
- Distinguish loading, no data, incomplete coverage, invalid configuration, unavailable source, calculation failure/retry, and saving/recovery. Missing values never become zero progress, zero spending, or a success state.

## Template composition

The [Home dashboard specification](v1-home-dashboard-spec.md) defines exact widget order, bindings, periods, scope variants, optional capabilities and annotated layouts. The table below is the planning summary; the specification owns those detailed compositions.

The names Home and Goal Progress are the user-facing names for the issue's Overview and Goals & Performance templates. They introduce no new goal types or calculation methods.

| Template | Audience and initial content | Required data |
| --- | --- | --- |
| Home | Portfolio/facility managers: prioritized actions, energy goal card and rolling-improvement trend, plus the equivalent water section when applicable. Cards show target, baseline, latest modeled improvement, reporting analysis, and through-date. Detailed analysis charts live on Goal Progress. | Existing goal settings, v1 findings and actions, active reporting analyses |
| Goal Progress | Portfolio managers: facility progress comparison table first, then account goal summaries and performance charts. Facility managers: goal summaries, rolling improvement, actual versus modeled use, monthly savings/loss percentages, and annual improvement. Include energy and applicable water. | Goals and active reporting analyses for the account/facilities shown |
| Energy Use | Energy managers/analysts: metered consumption summary, monthly line trend, utility-source breakdown, annual comparison bars, facility/meter detail table, and source summary. A separate equipment section shows estimated annual consumption, an equipment-type breakdown, and annual comparisons. | Utility readings; saved annual equipment histories for the estimate section |
| Costs | Managers/analysts: spending summary, monthly trend, source breakdown, annual comparisons, facility/meter detail table, and source summary. Named bill-charge charts are optional additions requiring explicit charge selection. | Recorded utility costs; named charges where selected |
| Emissions | Sustainability users: emissions summary, monthly trend, source breakdown, annual comparisons, facility/meter detail table, and source summary. | Existing emissions settings, inputs, and calculations |
| Water | Water/facility managers: consumption and cost summaries, monthly trends, source breakdown, annual comparisons, facility/meter detail table, and source summary. Detailed goal progress is on Goal Progress. | Water meter readings; recorded water costs for cost widgets |
| Blank | Any user: an empty editable dashboard with Add widget guidance. | None |

At account scope, detail tables compare facilities; at facility scope, they compare meters. Both include a separate utility-source summary, with applicable usage, cost, and emissions columns. Preserve source units where unlike quantities cannot be totaled.

The portfolio progress table uses each facility's latest eligible modeled result and shows its goal, improvement, analysis name, through-date, and readiness. Missing or invalid results retain a row. Do not rank unlike reporting periods as equivalent or normalize differences between analysis baselines. Show goal and analysis baseline differences explicitly.

Default utility selections follow all current owned facilities and matching meters. Facility defaults follow that facility's meters. New members enter according to these explicit live rules. Equipment follows its selected current membership while preserving annual estimates, carry-forward provenance, and actual fiscal intervals; do not fabricate a portfolio aggregate across incompatible calendars.

### Widget catalog and layout

The initial catalog includes linked visualizations, goal/performance summaries, status/actions, data tables, optional portfolio maps, plain-text notes, and shortcuts to existing VERIFI workspaces. Images and custom report authoring are excluded. A portfolio map has a table alternative and is not included by default.

Use full-width action lists and tables, paired cards/charts where space permits, and one column on narrow screens. Saved layout order is reading and focus order. Reordering and resizing have keyboard alternatives. Provide labeled controls, visible focus, accessible chart values, theme support, and print layouts that omit editing controls. Default charts replace v0 carousels with separately accessible widgets.

## Sources and dashboard controls

### Linked charts and reporting analyses

- Chart widgets link to saved visualizations. Editing a definition updates every linked appearance; Duplicate visualization creates independent intent. Matching starter charts, including trends reused by Home and Goal Progress, share definitions within an owner's starter set.
- Starter visualizations remain in the normal Visualizations library with a Home/template origin label and a filter for that origin.
- Default analysis charts and summary widgets explicitly follow the owner's analysis marked Active for reporting, separately for energy and water. A later reporting-selection change updates their resolved source. No selection produces a placeholder; missing or invalid selections retain repair states. Never fall back to the most recently edited analysis.
- Existing charts explicitly bound to a named analysis remain pinned. Following Active for reporting requires a new declared saved binding mode and runtime resolution; it is not an implicit rewrite of an exact analysis GUID.
- Use existing goal settings, analysis results, calculations, and v1 status findings. Keep raw utility changes, modeled improvement/savings, equipment estimates, and predictor observations distinct. Viewing widgets neither retrieves weather nor writes source/history records.

### Periods and precedence

- Utility summaries, monthly trends, breakdowns, and detail tables start with a shared latest-12-data-month window ending at the newest eligible utility month in dashboard scope. Lagging sources retain gaps and coverage evidence.
- Annual comparisons show saved fiscal-year history. Equipment widgets retain supported annual periods. Label widgets that use a different period from the shared utility window.
- Offer dashboard dates, compatible display units, Site/Source energy, and location/market emissions controls. Apply each setting only to widgets that support it and explicitly inherit it.
- Resolve a supported setting through explicit widget override, then opted-in dashboard setting, then saved visualization setting. Starter utility widgets inherit applicable dashboard controls; added saved charts keep their saved settings until the user enables inheritance.
- Dashboard controls never change source identities, narrow a linked portfolio chart to the current facility, change analysis baselines, or convert an analysis's saved energy basis. Goal summaries and latest-per-facility progress retain their labeled reporting context.
- Unsupported requested overrides show an explanation rather than being silently dropped. Re-resolve changed data requests before showing new values; do not relabel previous results.
- Browsing changes remain in the session. Save as dashboard defaults persists settings to the dashboard without editing linked visualizations. Session state is isolated by account and dashboard.

## Dashboard lifecycle

| Action | Required behavior |
| --- | --- |
| Duplicate dashboard | Copy layout/settings into an independent dashboard while retaining saved visualization links. |
| Restore from template | Confirm replacement of the current layout and widget links with fresh starter definitions. Preserve dashboard identity and all former saved charts. Fresh definitions can be shared by matching widgets created in the same restore; do not reset charts referenced elsewhere. |
| Ship improved templates | Automatically update only untouched starter dashboards. Any saved dashboard customization or edit to a linked starter chart protects that dashboard. Browsing filters, reporting-selection changes, and underlying source changes do not count as customization. Preserve user default selection, deletions, and sidebar organization. |
| Remove a widget/dashboard | Remove only the widget/layout records. Never delete saved charts or source data. |
| Lose a linked visualization | Retain a recoverable placeholder with Replace and Remove actions. Review affected widgets before source-definition deletion. |
| Open a chart and return | Retain dashboard identity, browsing controls, scroll, and focus. Respect protected chart edits before returning. Validate owner/destination; fall back to the owner's Home default if the originating dashboard disappeared. |
| Initialize or restore after interruption | Use stable operation identities and atomic persistence. Retry rejected persistence without duplicating records; committed-publication recovery must not replay writes. |
| Import or restore backups | Preserve dashboard/chart relationships, template provenance, customization protection, and verified GUID remapping. Older backups without Home records remain supported; deleted/initialized state must not be mistaken for a fresh owner. |

Home2 must persist enough template baseline/provenance information to distinguish untouched instances and charts from customized ones without treating runtime results as configuration. During template upgrades, replace eligible dashboard references with fresh definitions and preserve old saved charts; never overwrite a shared edited definition.

## V0 content disposition

The [source-backed content map](v1-home-content-map.md) inventories [account Home](../src/app/v0/data-evaluation/account/account-home/), [facility Home](../src/app/v0/data-evaluation/facility/facility-home/), [account Overview](../src/app/v0/data-evaluation/account/account-overview/), and [facility Overview](../src/app/v0/data-evaluation/facility/facility-overview/), with stable identifiers and follow-on owners. The summary below records the agreed destinations; neither document claims implemented parity.

| Existing area | Agreed destination or disposition |
| --- | --- |
| Energy/water goals and progress | Home goal summaries and Goal Progress detail |
| Monthly analysis, savings/loss, and annual improvement carousels | Separate linked widgets, primarily on Goal Progress |
| Account/facility status, meter/predictor/analysis checks, setup actions | Prioritized actions using existing v1 findings, preferences, and destinations; detailed checks remain reachable |
| Facility/meter usage and cost tables and donuts | Data-dashboard comparison tables and breakdown widgets |
| Utility consumption/cost tables and emissions tables | Corresponding utility-source summaries and detail tables |
| Monthly usage/cost/emissions trends and annual comparisons | Linked chart widgets on Energy Use, Costs, Emissions, and Water |
| Portfolio maps across the four overview areas | Optional portfolio map widgets with accessible table alternatives |
| Address, contact, NAICS, and resource counts | Existing owner details/settings remain authoritative; optional compact summary widgets can expose this context |
| Data Overview, Analysis, Reports, Visualizations, Settings, and data-management shortcuts | Sidebar destinations and optional internal shortcut widgets |
| Utility spreadsheet export and Email Data modals | Intentionally excluded from dashboard widgets. Preserve v0 behavior and track any remaining migration separately; JSON backup is not an equivalent spreadsheet export. |

## Phased delivery and acceptance

Work through phases individually. A checked item represents accepted delivery, not just a draft or an available chart type. The dependencies below retain the epic's existing ordering; stable design work can overlap ongoing visualization implementation.

### Home1 content and template specification

[Issue #2912](https://github.com/ORNL-AMO/VERIFI/issues/2912). Depends on Vis1; design may proceed during Vis9.

- [ ] Complete the inventory of every existing Home/Overview content area, recording retain/combine/intentional disposition and source ownership.
- [ ] Finalize the seven compositions above, widget order, required-data behavior, and account/facility/single-facility presentations with annotated desktop/narrow layouts.
- [ ] Specify source-following, context/filter behavior, lifecycle states, and safe return navigation using the accepted decisions above.
- [ ] Record required follow-on interfaces: dashboard/widget ownership and layout, template provenance/customization baselines, reporting-following analysis binding, and compatible display-setting inheritance. Keep shipped schema/version decisions with implementation owners.
- [ ] Review representative portfolio, single-facility, no-analysis, missing-cost, incomplete-data, keyboard, responsive, and print scenarios. HOME1 completion does not imply runtime implementation.

### Home2 storage and compatibility

[Issue #2913](https://github.com/ORNL-AMO/VERIFI/issues/2913). Depends on Home1 and Vis2.

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
- [ ] Implement summary/detail/source tables and optional portfolio maps with accessible alternatives. These additions are explicit Home delivery work, not assumed existing saved-chart capabilities.
- [ ] Preserve unavailable rows, through-dates, goal/analysis baseline distinctions, missing costs, true zeros, incomplete coverage, and equipment estimate provenance.

### Home6 starter templates and integrated acceptance

[Issue #2917](https://github.com/ORNL-AMO/VERIFI/issues/2917). Depends on Home1–Home5 and Vis10.

- [ ] Instantiate the complete starter set, share matching starter charts, and expose all seven creation templates with useful descriptions.
- [ ] Apply water/emissions eligibility and live membership without overriding explicit user choices or changing exact saved-source intent.
- [ ] Verify restore and untouched-template upgrades with shared definitions, customized charts, deleted defaults, and preserved older charts.
- [ ] Complete content acceptance against the Home1 inventory and document intentional dispositions; do not silently drop unavailable content.
- [ ] Exercise dense portfolios, single-facility presentation, reporting-selection changes, incompatible settings/calendars, backup transfer, source deletion, themes, keyboard access, responsive layouts, printing, and practical Electron windows.

## Validation policy

Each implementation phase owns focused meaningful tests for its changed contracts and interactions. Final integration does not defer those tests. Use the [testing policy](testing.md) and scoped validation planner to select fast tests, native browser coverage, type-checking, builds, and Electron checks according to changed boundaries.

For planning-document changes, validate local links/headings and commands with `npm run docs:check`; do not add artificial application tests or run unrelated builds. Home1 design acceptance still requires the source inventory and scenario review listed above.
