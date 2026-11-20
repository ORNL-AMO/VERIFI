# V1 Home dashboard specification

Design contract for [Home1 #2912](https://github.com/ORNL-AMO/VERIFI/issues/2912). This specifies the intended customizable Home experience; it does not claim implemented dashboards. The [content map](v1-home-content-map.md) owns legacy capability identifiers and dispositions. The [phase plan](v1-home-dashboard-plan.md) owns remaining delivery and acceptance.

Built-in Home and Overview defaults render from shipped configurations without first creating saved visualizations. The current [persistence](v1-home-persistence.md) and [workspace](v1-home-workspace.md) references describe the implemented saved-reference model and built-in compatibility contracts. Runtime embedding, customization and complete-composition activation below are delivered in their assigned phases.

## Templates and ownership

Provide Home, Goal Progress, Energy Use, Costs, Emissions and Water as editable starter dashboards, with Blank available for creation. Home and Goal Progress are the display names for the issue's Overview and Goals & Performance templates. Templates are shipped blueprints, not shared user instances. There is no role-selection gate; audiences below explain useful starting content without restricting customization.

An account's templates use account ownership and explicit live All facilities inclusion. A facility's templates use its exact owner GUID and that facility's current eligible resources. A one-facility portfolio remains a portfolio. A ready account marked single-facility with exactly one owned facility exposes the facility set once; it does not create hidden account analysis pairs or change existing account-backed report relationships. Invalid zero/multiple-facility single-facility setups show recovery instead of guessing an owner.

Default sidebar order is Home, Goal Progress, Energy Use, Costs, Emissions, Water. Hide default Water entries/sections until an intake or discharge meter exists in that owner scope; an empty meter is sufficient. Default Emissions visibility follows the account's emissions setting. Explicitly created/duplicated dashboards stay accessible. Preserve explicit deletion and visibility choices; conditional visibility never removes records or source data.

The main Home action opens the owner's chosen default, initially Home. Unconfigured owners use available built-in order; configured owners retain their saved choices. If the default is unavailable or hidden, choose the first visible dashboard in owner-local order. If none remain, show Create dashboard and template choices; do not recreate deleted starters or override an initialized-empty set. Switching owners opens that owner's default, rather than retargeting the previous dashboard.

## Widget and period vocabulary

The identifiers below are specification keys for compositions and acceptance, not a serialized schema. Default charts use immutable built-in configurations bound to the explicit owner at render time; explicitly linked charts use same-account saved visualizations. Both use the shared provider/rendering pipeline. Summary, table, action, note and shortcut widgets have their own typed settings; their values are projections of existing domain data, not frozen results.

### Built-in defaults and saved customizations

| User action | Required persistence behavior |
| --- | --- |
| View a built-in Home/Overview dashboard | Render current data from versioned shipped configuration; create no saved visualization records or library entries. Viewing is not customization or initialization intent. |
| Move, resize, hide or reorder a widget; change the selected default | Save owner-local dashboard preferences through the command boundary; do not copy the chart definition. |
| Customize a default chart | Keep a protected draft until save. Persist supported changes as dashboard-owned typed overrides; changes requiring an independent definition may create a copy only on an explicit successful save with a clear library outcome. Never edit the shipped configuration or another widget implicitly. |
| Save as visualization | Explicitly create a normal reusable library item, retaining source/period/reporting meaning. Linking that item back to a widget is an explicit choice. No frozen results or executable chart options are saved. |

Built-in recipes need stable identities, widget keys and versions, distinct from resource and saved-record GUIDs. Their owner binding is explicit; a route or remembered selection cannot silently retarget it. Notes, shortcuts and layout preferences remain dashboard-owned. Opening/canceling customization must leave no orphan records. Existing saved visualizations, Home-origin records and links remain supported without automatic deletion or conversion.

A complete template can ship once all its required widget capabilities work, including truthful setup/empty states. Home can ship before the other five templates; later templates become available independently. Do not offer incomplete compositions or use unimplemented widgets as a substitute for a complete default. Automatic availability for new/unconfigured owners must preserve initialized-empty, imported, hidden and deleted owner choices as described below.

| Binding | Meaning |
| --- | --- |
| Utility energy | All current eligible energy meters within explicit owner inclusion; canonical calendarized energy with supported common display units and Site/Source treatment |
| Utility cost | All eligible utility meters, including energy, water and Other, with recorded costs; currency remains the supported recorded currency |
| Utility emissions | Eligible sources using existing market/location emissions calculations; not a new emissions inventory |
| Utility water | Intake and discharge meters, shown as separately labeled series/rows; never invent a net-water total |
| Reporting energy/water | Explicitly follow the owner's Active for reporting selection for that category; use that saved analysis's full authoritative results |
| Equipment | Current equipment in explicit included facilities; existing annual history projection with unit, actual fiscal interval and carry-forward provenance |

Utilities grouped by facility at account scope or meter at facility scope preserve owner-qualified identities. Utility-source grouping remains distinct from those comparisons. Equipment is never folded into measured utility totals.

| Period key | Initial period and inherited controls |
| --- | --- |
| U | One dashboard-wide 12-month window ending at the newest eligible calendarized utility month across that dashboard's default utility bindings, independent of legend visibility. No eligible month means no anchor, not today's month. Eligible lagging sources retain gaps. Monthly utility widgets inherit dates and compatible units/basis/emissions treatment. |
| Y | All saved fiscal-year utility history, full-year mode with incomplete-year evidence. Do not inherit the U date window initially. Inherit compatible display settings. |
| R | All available monthly results from the reporting analysis, after full calculation. No dashboard-date inheritance initially; compatible display-unit conversions may be enabled, but analysis basis stays fixed. |
| A | All returned annual analysis results, preserving actual fiscal intervals and saved baseline. No dashboard-date inheritance initially. |
| L | Latest eligible result per selected reporting analysis, with its own through-date; not a cross-facility common-period ranking. No dashboard-date inheritance. |
| E | Latest saved equipment fiscal year within the selected membership, preserving actual intervals; no monthly-date inheritance or measured-data anchoring. Annual equipment history uses all saved equipment fiscal years. No conversion across incompatible fiscal intervals. |
| N | Non-periodic committed owner/configuration/status data; dashboard dates do not apply. |

These are defaults, not permission to ignore an explicitly requested override. Unsupported overrides show their reason. Separate latest-data anchors on different dashboards are allowed; all participating U widgets on one dashboard use the same resolved bounds. A source summary's same-month previous-year comparison may read outside U and labels that secondary period explicitly.

## Default compositions

Order is also keyboard and screen-reader order. Full means the whole content width; Half means paired in source order where the content area permits two columns. When a conditional water widget is hidden, remaining widgets pack without changing their relative order.

### Home

Audience: portfolio and facility managers who need goals and work requiring attention. Goal cards show category, reduction target/target year, goal baseline year, current modeled rolling improvement, analysis name, analysis baseline and through-date. No result means setup/unavailable, not zero progress. Negative improvement remains visible; no fabricated linear schedule or extra goal type.

| Order / ID | Widget and width | Binding / period | Required data and unavailable behavior | Content map |
| --- | --- | --- | --- | --- |
| 1 HOME.actions | Prioritized actions, Full | V1 findings for owner / N | Existing active v1 To-dos, errors before warnings, then existing source order; show owner context and links. Include all matching actions in a paged list using existing inventory paging patterns; no independent dismissal policy. No findings is a scoped ready state only after evaluation succeeds. | H04–H06 |
| 2 HOME.energy-goal | Energy goal summary, Half | Owner goal + Reporting energy / L | Missing target links to owner goal settings; missing reporting selection links to Analysis. Valid results may still show without a goal, labeled No goal set. | H07 |
| 3 HOME.energy-trend | Rolling improvement line, Half | Reporting energy, existing rolling-12-month improvement / R | Requires current eligible monthly analysis results; preserve signed values and gaps. Same built-in recipe as GP.energy-rolling. | H07, H09 |
| 4 HOME.water-goal | Water goal summary, Half, conditional | Owner goal + Reporting water / L | Same goal/result separation as energy; water visibility rule applies. | H07 |
| 5 HOME.water-trend | Rolling improvement line, Half, conditional | Reporting water / R | Same built-in recipe as GP.water-rolling; no reporting selection keeps a placeholder. | H07, H09 |

The rolling improvement trend projects the existing monthly result field rolling12MonthImprovement, preserving its sign and exclusions. If a source currently exposes only split savings/loss measures, Home4 must add an explicit compatible projection of that existing field before this recipe renders; do not reconstruct it by summing traces or invent a new calculation.

Owner name and scope are in the dashboard header; the initial layout does not repeat contact/NAICS/counts or every workspace shortcut as default widgets.

### Goal Progress

Audience: portfolio managers comparing facility progress and facility managers inspecting modeled performance. Account progress includes every currently owned facility, even one with no goal, reporting selection or valid result. Rows show facility link, category, target/baseline, reporting analysis/baseline, latest improvement, through-date and readiness. Do not average improvement percentages or sum heterogeneous baselines. Use each facility's reporting selection, not an account analysis's selected-child roster. That roster still governs the account charts below.

| Order / ID | Widget and width | Binding / period | Required data and unavailable behavior | Content map |
| --- | --- | --- | --- | --- |
| 1 GP.facilities | Facility progress table, Full; account only | Each owned facility's goals + reporting selections / L | Keep missing/invalid rows with setup links; dates remain per row. No facility produces creation guidance. | H04, H07 |
| 2–3 GP.energy-goal, GP.energy-rolling | Goal summary, Half; rolling improvement line, Half | Same bindings/recipes as corresponding Home widgets / L, R | Same prerequisites; independent layout/overrides using the immutable trend recipe without saved-chart creation. | H07, H09 |
| 4 GP.energy-monthly | Actual and calculated use, monthly lines, Full | Reporting energy, actual + calculated / R | Requires valid results; calculated is adjusted modeled use. No baseline edits or source-basis conversions. | H08 |
| 5 GP.energy-savings | Savings/loss percentage bars, Half | Reporting energy, existing monthly savings/loss measures / R | Keep losses negative and banking exclusions authoritative; no dollar-savings conversion. | H09 |
| 6 GP.energy-annual | Annual and total improvement lines, Half | Reporting energy / A | Preserve distinct authoritative percentage measures; no averaging into a new score. | H07; added detailed improvement view |
| 7–11 GP.water-* | Repeat orders 2–6 for water, conditional | Reporting water / L, R, A | Same states and period distinctions. | H07–H09 |

At facility/single-facility scope omit only GP.facilities, retaining the detailed energy/water story. Annual actual-versus-calculated consumption bars remain an optional linked Analysis widget (H10), not silently replaced by annual improvement percentages.

### Energy Use

Audience: energy managers and analysts comparing metered use with a separately identified equipment estimate section.

| Order / ID | Widget and width | Binding / period | Required data and unavailable behavior | Content map |
| --- | --- | --- | --- | --- |
| 1 EN.total | Measured energy and recorded energy cost summary, Full | Utility energy / U | Canonical energy observations; cost has independent missing/partial state. Only sum compatible, nonoverlapping contributions. | E02–E04 |
| 2 EN.monthly | Monthly energy lines by utility source, Half | Utility energy / U | Energy data; no eligible meters gives setup guidance, missing months remain gaps. | E03, E06 |
| 3 EN.sources | Source contribution bars, Half | Utility energy / U | Period sum by source; signed bars preserve negative corrections; do not substitute shares when denominator/coverage is invalid. | E02–E03 |
| 4 EN.annual | Annual energy bars, Full | Utility energy / Y | Account groups by facility; facility groups by utility source. Fiscal-year intervals remain labeled. | E07; new annual history at account scope |
| 5 EN.detail | Facility/meter usage-cost comparison table, Full | Utility energy / U | Names/owner links, source/group where applicable, usage, units, recorded cost, coverage and totals. | E02–E03, O08 |
| 6 EN.summary | Utility-source summary and comparisons, Full | Utility energy / U plus D2 comparison periods | Source, meter count, period usage/cost, latest month, same month previous year, monthly average and authoritative signed deltas. Missing comparisons remain missing. | E02, E04 |
| 7 EN.equipment-total | Estimated annual equipment consumption summary, Full | Equipment / E | Show explicit estimate, saved/carry-forward year and coverage; no equipment links to Energy Uses setup. Show separate comparable subtotals when units/calendars differ. | Accepted new content |
| 8 EN.equipment-types | Equipment-type estimate bars, Half | Equipment / E | Group by equipment type; compatible facility traces remain separate where required. | Accepted new content |
| 9 EN.equipment-history | Annual equipment consumption lines by facility, Half | Equipment / all saved equipment fiscal years | Use existing annual projection, never spread annual estimates across months or sum incompatible fiscal intervals. | Accepted new content |

The equipment section heading and provenance separate estimates from measured use. Do not claim a valid account-total equipment chart where the current source only supports facility contributions; Home5 must implement a compatible summary adapter before showing that total.

### Costs and Emissions

Both use the following six-position layout. Differences in measure and supplementary content are explicit.

| Order | Costs ID / content | Emissions ID / content | Binding / period and unavailable behavior | Content map |
| --- | --- | --- | --- | --- |
| 1 | COST.total: recorded spending summary, Full | EM.total: emissions total, Full | Utility cost / U; utility emissions / U. Costs stay missing when unrecorded; emissions require current existing inputs/settings. | C02, M02 |
| 2 | COST.monthly: monthly cost lines by source, Half | EM.monthly: monthly emissions lines by source, Half | Corresponding utility binding / U; independent source gaps and partial notices. | C03, C06, M06 |
| 3 | COST.sources: spending by source bars, Half | EM.sources: emissions by utility source bars, Half | Corresponding binding / U, signed absolute contributions rather than invalid percentage shares. | C02–C03, M02–M03 |
| 4 | COST.annual: annual spending bars, Full | EM.annual: annual emissions bars, Full | Corresponding binding / Y; account by facility, facility by source. Category-based annual bars and selected-period facility-by-category bars remain separate optional views. | C07, M07; new annual history at account scope |
| 5 | COST.detail: facility/meter costs, Full | EM.detail: facility/meter emissions, Full | Corresponding binding / U; rows retain names, units/basis and coverage, with relevant usage/cost context. | C02–C03, M02, O08 |
| 6 | COST.summary: source summary/comparisons, Full | EM.summary: source and emissions-category summary/comparisons, Full | U totals plus latest month, previous-year same month and monthly average with existing deltas. Emissions category table preserves separate market/location columns; selected basis governs default totals/charts, never their sum. | C04, M03–M04 |

EM.summary retains Scope 1 stationary/mobile/fugitive/process and Scope 2 electricity/other categories supplied by current calculations. A utility-source chart does not replace that category table. Category chart adapters are explicit later work. Costs includes Other utility sources where eligible; it introduces no cost-reduction goal, tariff estimate or modeled dollar savings.

### Water

Audience: water/facility managers inspecting recorded intake/discharge and spending.

| Order / ID | Widget and width | Binding / period | Required data and unavailable behavior | Content map |
| --- | --- | --- | --- | --- |
| 1 WATER.total | Intake, discharge and recorded water-cost summary, Full | Utility water / U | Distinct intake/discharge values; no net-water or gross-combined consumption headline. Costs may be missing independently of usage. | W02, W04 |
| 2 WATER.monthly | Monthly consumption lines by intake/discharge, Half | Utility water / U | Compatible owner units; absent readings show setup/empty, not zero. | W03, W06 |
| 3 WATER.costs | Monthly water-cost lines by source, Half | Water meters' recorded costs / U | Setup placeholder when costs are unrecorded; include eligible intake/discharge costs once each. | W04; accepted cost view |
| 4 WATER.sources | Intake/discharge contribution bars, Full | Utility water / U | Separate labeled source values; no implied net total. | W02–W03 |
| 5 WATER.annual | Annual consumption bars by source, Full | Utility water / Y | Preserve intake/discharge grouping at account and facility scope, owner fiscal intervals and incomplete years. | W07; new annual history at account scope |
| 6 WATER.detail | Facility/meter comparison table, Full | Utility water / U | Keep intake/discharge in separate columns at account scope and source-qualified meter rows at facility scope; recorded costs and coverage remain explicit. | W02–W03, O08 |
| 7 WATER.summary | Source usage/cost summary, subtype detail and comparisons, Full | Utility water / U plus D2 comparison periods | Period totals, latest month, same month previous year, monthly average, existing deltas and applicable cost. Account subtype detail keeps waterIntakeType/waterDischargeType separate, qualified by direction; source-only grouping is insufficient. | W02, W04 |

### Blank and optional widgets

Blank has a dashboard header, Add widget action and empty-state guidance. It creates no saved charts; adding a built-in widget or linking an existing visualization also creates none. A new library item requires an explicit save.

| Optional widget | Binding, period and behavior | Content map |
| --- | --- | --- |
| Annual Analysis consumption | Named or reporting-following analysis, yearly actual/calculated bars / A; explicitly separate from annual improvement | H10 |
| Facility/meter contribution breakdown or utility stack | Explicit eligible utility binding / U initially; existing denominator, units, coverage and disjoint-contribution checks apply. Bar is safe when signed; donut requires compatible nonnegative complete data. | H11, E02–E03, C02–C03, M02, W02–W03 |
| Facility-by-utility-source comparison | Account facilities on X, source stacks for selected dates / U; requires an approved two-dimension Home5 adapter, not relabeling annual history | E05, C05 |
| Emissions category breakdown, monthly category stack, annual category bars or facility-by-category comparison | Existing category projection / U or Y as named; facility comparison uses selected U dates, annual category bars use Y. Requires a Home5 adapter and retains market/location distinctions | M03, M05, M07 |
| Water subtype detail/breakdown and facility-by-subtype comparison | Saved intake/discharge subtype identity and direction; account table/breakdown and selected-period facility stack / U. Requires a Home5 subtype adapter; current source grouping cannot preserve subtype meaning | W02, W05 |
| Portfolio map | Account-owned eligible facilities/metric / U; explicit metric and units, table alternative includes facilities without coordinates. No map at facility scope; no new geocoding requirement. | E01, C01, M01, W01 |
| Named bill-charge chart | Explicit meter/charge binding; compatible native bill periods and units rather than forcing U/monthly dates | Accepted Costs addition |
| Owner summary | Committed owner details/counts / N, linking to Settings/Data instead of making a second editor | H01 |
| Notes | Plain text with an optional title / N; no executable HTML or image storage | Accepted addition |
| Shortcuts | Explicit internal workspace destination / N, validated for current account/owner/resource; unavailable target explains why | H02 |
| Other saved visualization | Explicit same-account saved identity; source scope and saved settings visible, inheritance off initially | Existing visualization reuse |

O06's legacy Create Overview Report dialog is deferred until the new overview exists and overview reports are migrated. Do not add a shortcut claiming that report is implemented. Existing Reports navigation remains available for its supported workflows. H03's export/email workflows and Plotly-specific drawing tools (O07) remain outside Home widgets.

## Annotated layouts

These schematics describe widget spans and order, not a new visual system. Use existing workspace connected borders, square outer corners, theme tokens and sidebar patterns, without vertical gaps between workbench sections. Header, dashboard actions and filter controls precede content in focus order.

```text
Account Home, wide content area
Home sidebar         Dashboard header: owner / name / actions
  Home               Dashboard controls: dates / compatible display settings
  Goal Progress      [1 Prioritized actions                         ]
  Energy Use         [2 Energy goal       ][3 Energy improvement   ]
  Costs              [4 Water goal        ][5 Water improvement    ]
  Emissions          Water row is conditional; other rows keep order.
  Water
  Add dashboard

Account Goal Progress                    Facility / single-facility
[1 Facility progress table             ] No facility comparison table.
[2 Goal               ][3 Rolling trend] [2 Goal           ][3 Rolling trend]
[4 Monthly actual / calculated         ] [4 Monthly actual / calculated    ]
[5 Savings/loss       ][6 Annual change] [5 Savings/loss   ][6 Annual change]
[7-11 Equivalent water sequence        ] [7-11 Equivalent water sequence   ]

Energy Use, wide                          Costs / Emissions
[1 Measured summary                   ] [1 Summary                          ]
[2 Monthly trend      ][3 Source bars  ] [2 Monthly         ][3 Source bars   ]
[4 Annual comparison                  ] [4 Annual comparison                ]
[5 Facility/meter table               ] [5 Facility/meter table             ]
[6 Source totals and comparisons      ] [6 Source totals and comparisons    ]
[7 Equipment estimate summary         ] Emissions includes category details.
[8 Type estimates     ][9 Annual history]

Narrow content area, every template
[Dashboard header/actions              ]
[Controls, wrapping in reading order   ]
[Widget 1                              ]
[Widget 2                              ]
[Widget 3                              ]
[... saved order ...                   ]
```

Use two columns only when each half can retain at least 24rem of content width; otherwise stack every widget. Full-width tables scroll within a labeled region rather than widening the whole workspace. A collapsed/mobile sidebar remains keyboard reachable. Users resize to Half or Full and move widgets using labeled Move earlier/Move later controls as well as pointer interactions; layout packing never changes stored reading order.

Widgets have headings and scope/period labels. Chart tooltips supplement accessible values and are not the only way to inspect data. Table headers include units and actual period meaning. Water's seven positions use the same Full/Half rules; Blank has no grid until content is added.

Print uses saved reading order in one column, including widget titles, units, periods, coverage and readable table headings. Omit sidebar, filter/edit controls and transient menus; retain notes and shortcut labels. Render chart alternatives and table content without clipping. These are planned acceptance requirements, not a claim of rendered browser/Electron QA.

## Implementation boundaries

Current utility/analysis/Energy Use providers and shared renderers are reusable only where their exact combinations are supported by the [foundation](v1-visualization-foundation.md), [utility](v1-utility-visualizations.md), [composition](v1-composition-visualizations.md) and [workbench](v1-visualization-workbench.md) contracts. Home1 does not add a provider, schema, store, Worker message, runtime widget or report format.

Home2/Home3 supply implemented persistence and navigation/layout. Before built-in rollout, their reference/preference/backup contracts need the compatibility work in the [phase plan](v1-home-dashboard-plan.md#first-usable-home-milestone). Home4 owns shared built-in/linked chart rendering, customization handoff and compatible controls; Home5 owns goals/actions/tables/maps and required adapters; Home6 owns complete compositions, progressive availability and final parity acceptance. Existing formulas, report output and v0 behavior remain unchanged.

## Linked visualization and reporting contracts

A chart widget identifies either a built-in recipe/version bound to its owner or one saved visualization in its own account. The recipe or saved definition owns base source/chart intent; the dashboard owns widget position, size and compatible overrides. Built-in customization affects only the chosen instance unless the user explicitly creates/reuses a saved definition. For an existing saved link, Edit linked visualization identifies other dashboard usage and committed edits update those linked appearances; Duplicate visualization creates independent intent. A table or summary projects existing domain data under its own typed settings and is not a frozen chart result.

Home/Goal Progress may use the same immutable rolling-trend recipe, with independent instance layout/overrides and explicit owner binding. This requires no saved-chart deduplication or starter-chart creation. Creating/restoring a built-in template selects its shipped composition without manufacturing saved chart records. Duplicating a dashboard copies its preferences and overrides, retains explicit saved links, and never deduplicates against unrelated user charts by name or appearance.

Built-in configurations are not library records. Existing Home-origin saved records retain their provenance, library visibility and durable identity. User-created saved copies are ordinary same-account reusable records. Source records, numerical results, ECharts objects and executable functions are not stored in dashboard layouts.

### Active for reporting resolution

| Declared binding / condition | Required result |
| --- | --- |
| Follow reporting with valid selected energy/water analysis | Resolve the owner GUID and category to its committed selectedEnergyAnalysisId or selectedWaterAnalysisId; verify exact ownership/category, then use that analysis's current authoritative result. |
| Follow reporting with no selection | Setup placeholder linking to Analysis selection. Existing other analyses do not create a fallback. |
| Follow reporting with missing, foreign, wrong-category or invalid selection | Preserve the declared rule, show missing/invalid-source status and scoped repair links. Do not substitute a same-name analysis or clear the owner's selection by viewing. |
| Selected analysis changes while widget is active | Revalidate and resolve the newly selected analysis. Cancel/reject pending evidence from the former resolved analysis, even if the dashboard GUID and reporting rule are unchanged. |
| Selected analysis remains but inputs/results change | Existing analysis readiness, fingerprints, calculation freshness and retry policy apply. Old evidence cannot appear current. |
| Exact named-analysis binding | Preserve its GUID through renames and reporting-selection changes. Deletion retains missing-source repair; never promote it to Follow reporting. |
| Reporting-following portfolio progress table | Resolve each facility's own category selection for that row. Resolve account charts independently through the account selection and its authoritative child-analysis roster. |

The rule is configuration intent, shipped or explicitly persisted; the resolved analysis GUID is request evidence, not a silently persisted rebind. Home2 defines existing serialized/transfer semantics; Home4 extends built-in references and source/editor/capability resolution with the compatible rolling-improvement projection above. Existing exact bindings retain their supported meaning. Single-facility Home uses the sole facility's selection; viewing never reconciles or initializes hidden account pairs.

Goal targets remain existing sustainability settings. When goal and analysis baseline years differ, show both and a mismatch explanation. A percentage toward target is unavailable without a finite valid result and a positive valid target; retain negative improvement and above-target performance rather than silently clipping them into success. No goal setting or reporting selection is edited from a chart filter.

## Dashboard filters and session behavior

The precedence below applies separately to each setting that a widget supports. Selective inheritance is explicit, not an automatic override of any chart added to a dashboard.

| Priority | Setting source | Persistence |
| --- | --- | --- |
| 1 | Explicit widget override, enabled for that setting | Dashboard widget configuration |
| 2 | Opted-in dashboard setting; current browsing value supersedes its shipped or explicitly saved default for this session | Built-in default or saved preference, plus separate session state |
| 3 | Built-in recipe, saved visualization or specialized widget setting, including declared follow-owner bindings | Shipped configuration, existing linked definition or widget configuration |

Controls offer dates and supported display units, Site/Source treatment for eligible utility energy, and market/location treatment for emissions. The effective treatment is always labeled. Initial energy units/basis follow the owner; emissions initially uses market, matching existing overview session behavior. Currency is not an arbitrary conversion control. Equipment and analysis units change only where their canonical projections support conversion; analysis energy basis and all baselines remain fixed.

Source identity, category, included facilities, analysis roster, grouping and resource selection are not dashboard filter overrides. Same-account charts explicitly reused in another owner's dashboard keep their source inclusion and show that scope. Cross-account links are rejected. Location/market is a declared supported treatment override for existing emissions measures, resolved through providers; it never mutates the chart's saved measure or substitutes new input factors.

When inheritance is off, a widget retains its built-in or saved base period/settings and displays its own context. When a requested override is unsupported, retain the request and explain why it cannot render, with an explicit recovery to the base configuration. Do not silently ignore controls or apply a U monthly range to bill-charge, yearly equipment, latest-result goal summaries, or incompatible analysis periods.

Invalid control input stays local with field feedback and does not replace the last valid effective request. Valid changes invalidate affected numerical evidence before publishing a replacement; unchanged sibling widgets keep current results. No eligible latest-data month produces an explained empty window, not a calendar-date fallback.

Browsing filters survive chart open/return and navigation away/back within the current account session, isolated by dashboard identity. A new account session or reload starts from explicit saved defaults where present, otherwise shipped defaults. Save as dashboard defaults reviews/applies valid current settings through the command boundary; success updates only dashboard preferences and creates no saved visualization. Rejected persistence retains browsing values for retry. Committed-but-unpublished recovery refreshes publication and never saves again.

## Dashboard lifecycle and template updates

### Initialization and owner changes

After a ready committed workspace is available, resolve available complete built-in views for a new/unconfigured owner without saving visualization records. Bind them to that explicit owner and request data only for active eligible widgets. Persist preferences/customization only for user choices; do not mark viewing as deliberate creation, deletion or an initialized empty set. This replaces the planned requirement to create six dashboard/chart graphs before showing default content.

Durable state must distinguish an unconfigured owner from an older/imported saved set and an initialized owner whose dashboards were deleted. Never infer from an empty persisted list alone that built-ins should reappear. Existing imported dashboards, unavailable defaults/order and deliberate empty sets retain precedence. Later template releases offer additional choices without silently refilling an already configured or deleted set. Define versioned built-in identity, route/default/order/tombstone resolution and preference transfer before enabling this path; preserve existing Home2 atomicity, revision and recovery protections.

A newly added facility can resolve its own eligible built-in views on first Home entry without creating charts. Account live selections remain independent of facility dashboard configuration. A conversion between portfolio and valid single-facility presentation exposes the appropriate owner views rather than changing identities. Owner/account deletion and backup replacement preserve ownership boundaries and explicit preferences; saved definitions outside a deleted dashboard remain protected.

### User actions

| Action | Result and confirmation |
| --- | --- |
| Create from template | Independent editable layout/preferences based on a complete shipped composition; built-in chart references create no saved visualizations. Blank has none. |
| Rename/reorder/resize/edit widgets or notes/shortcuts | Save through typed values and command boundaries. Saved user edits protect that dashboard from automatic template replacement. Pointer actions have keyboard alternatives. |
| Set as default | Save owner-local default identity without changing another owner's default or the definition of a template. |
| Duplicate dashboard | Allocate independent dashboard/widget identities, copy layout/settings/notes/shortcuts and built-in overrides, retain explicit saved-chart links. The copy is user-owned. |
| Delete widget | Remove the widget/reference only; preserve its saved chart and source records. |
| Delete dashboard | Confirm the named owner/dashboard and explain that linked charts remain. Preserve a built-in deletion choice so it cannot reappear on read or upgrade. If it was the default, choose the first remaining visible dashboard atomically, or leave creation guidance when none remain. |
| Restore from template | Confirm replacement of the name, layout, widgets, chart customizations and saved dashboard defaults. Preserve dashboard identity, sidebar position, visibility and default selection; restore shipped built-in configuration without creating charts, and preserve every former saved chart. Establish a new baseline only after commit. |
| Delete a linked saved chart | Review affected widgets; keep recoverable Replace/Remove placeholders afterward. Dashboard/widget deletion never cascades to that chart. |
| Replace a missing link | Explicitly choose a same-account visualization, review its scope and settings, then replace only that widget reference. No name-based repair. |

Opening menus, viewing defaults or changing session filters is not a saved customization. Persisted widget/date/display edits and dashboard renames protect those choices. Existing saved-chart edits/deletion retain their Home2 protection semantics; an unavailable saved link is never replaced by a built-in automatically. Protection survives returning to old values; explicit restore establishes a new baseline. Source-data, owner settings, reporting-selection and runtime membership changes do not count as customization.

### Shipped template revisions

Untouched built-in views may follow a compatible shipped revision without chart writes. Customized instances need a reproducible base recipe/version and stable widget identity; incompatible revisions require review rather than silently rebasing overrides or source meaning. Choose the version/baseline representation and backup behavior before implementation. Updates to persisted preferences use revision checks so intervening edits cancel replacement. Existing saved/template records retain their original sticky protection and chart-baseline checks; do not overwrite their definitions.

Preserve dashboard identity, selected default, sidebar order, visibility/deletion choices and all existing saved charts through upgrades. New template types are available to create; they do not automatically refill a configured or initialized-empty set. Templates never mutate because an instance was edited.

Unsupported/future versions retain their payload and an unavailable explanation; do not normalize unknown data into current defaults. Home2 owns validation, revision conflicts, transfer/remapping and operation recovery. The spec does not assign a database, backup or definition version.

## Safe open and return navigation

A saved chart opens the existing visualization workbench with an owner-qualified session return token. A built-in opens a protected customization draft; opening or canceling does not first save a visualization. Explicit save/materialization must commit once before reporting a saved handoff. The token resolves only to a validated internal dashboard destination and carries dashboard/widget identity, scroll, focused action and browsing controls. Do not persist arbitrary return URLs or chart session state in a saved definition.

Resolve protected workbench edits before chart exit, scope change or account change. Return restores the originating dashboard and effective session controls, then focus to its originating widget action. If that widget disappeared, focus the dashboard heading. If the dashboard disappeared, use its owner's current default/creation state. If ownership/account no longer exists or the token belongs to another account, use the current valid workspace destination rather than restoring stale cross-account state.

While on another route, account/snapshot/definition/source changes cannot publish into the former widget. Demand results only for the active dashboard and its active widgets; hidden conditional dashboards start no chart work. Use existing cancellation/freshness checks and bounded result reuse, including the resolved reporting analysis identity.

## Follow-on interface requirements

These are semantic requirements, not executable types or final wire shapes. Follow the existing neutral domain/application/UI ownership boundaries.

| Contract | Required capability | Delivery owner |
| --- | --- | --- |
| Dashboard identity/preferences | Stable owner-qualified built-in and saved identities; durable order/default/hidden/deleted choices, layout overrides, lineage and revision-checked commands; preserve initialized-empty sets | Home4 compatibility work with Home2/Home3 boundaries |
| Widget variants | Distinguish built-in recipe/version from saved GUID; typed overrides and goals/actions/tables/maps/notes/shortcuts; explicit owner inclusion and no fake saved GUIDs | Home4 contracts; Home3–Home5 consumers |
| Template blueprint | Immutable complete shipped composition with stable widget/recipe versions and symbolic owner/resource/reporting bindings; no automatic chart records or result rows | Home4 contract; Home6 catalog |
| Analysis source binding | Exact GUID or explicit reporting-owner/category rule; ownership validation; resolved target in request identity; safe editor, Used By and source-repair behavior | Home2 serialization/transfer; Home4 provider/editor |
| Embedding capabilities | Per-setting override approval and effective-context evidence for dates, display units, energy basis and emissions treatment; changed settings re-resolve current data | Home4; no existing API claims |
| Summary/category adapters | Existing D2 comparison semantics, existing analysis rolling field, emissions categories, water subtypes and two-dimension selected-period comparisons without new formulas | Home4 rolling chart projection; Home5 summaries/categories |
| Template provenance | Built-in version/customization baseline and durable owner choices; preserve existing Home-origin library records and shared-chart protection | Home4 compatibility; Home6 rollout |
| Session return/context | Validated internal origin, owner/account/dashboard/widget identity, session filter/scroll/focus restoration and protected leave behavior | Home3/Home4 |
| Backup and recovery | Round-trip built-in references/versions/preferences and saved links, remap resource GUIDs separately, preserve legacy/unknown intent and committed recovery without replay | Home4 compatibility using Home2 boundaries |

## Widget state and action matrix

| State | Presentation and recovery | Required invariant |
| --- | --- | --- |
| Workspace not ready / loading | Scoped loading text; no stale ready status | No initialization or widget source requests against an obsolete owner |
| Setup required | Missing goal/reporting selection/meter/equipment/cost explanation and scoped setup link | Missing configuration is not observed zero |
| Eligible but empty | Owner, requested period and No saved observations message | Preserve valid intent and explicit empty membership |
| Partial coverage | Available values with coverage, through-date and gaps; retain unavailable rows | A partial subtotal is labeled; unlike periods/baselines are not a fair ranking |
| Invalid/missing source | Preserve binding/row and explanation; repair or choose a valid reporting selection | No same-name or latest-modified substitution |
| Unsupported override/version | Explain incompatible control/version; explicit recovery to a supported base configuration | No destructive normalization or silently dropped intent |
| Calculation error | Preserve widget intent, show retry for the current owner/source | Old failed/pending result cannot publish after context changes |
| Ready | Values, units, effective basis, provenance and periods; accessible chart/table detail | True zero and negative values remain visible; totals require valid aggregation |
| Saving / rejected save | Indicate progress, prevent duplicate submission; retain unsaved valid input and retry after rejection | Acknowledgment cannot erase newer edits |
| Conflict / committed but unpublished | Review current revisions or recover publication using existing command boundary | Never replay already committed creation/restore/update writes |

## Home1 acceptance scenarios

These are source/design walkthroughs and later implementation acceptance targets, not executed browser or storage tests. Each row states the expected result and the phase responsible for runtime evidence.

| Scenario | Expected result | Runtime owner |
| --- | --- | --- |
| Portfolio with energy/water and complete catalog/data | Six eligible built-in entries without saved-chart creation; Home actions/goals; Goal Progress facility rows before account charts; metered and equipment content separate | Home3–Home6 |
| Only the complete Home recipe is released | New/unconfigured owners can view Home; no unfinished templates, six-graph seeding or saved library entries; later releases preserve existing owner choices | Home4–Home6 |
| View, customize, cancel, then explicitly save a built-in chart | Viewing/canceling creates no chart; saved overrides/copies are owner-local; explicit library save commits once with original source/reporting meaning | Home3/Home4 |
| Valid single-facility account versus one-facility portfolio | First exposes one sole-facility set; second retains account and facility scopes. No viewing-time hidden pair creation | Home2/Home3/Home6 |
| Single-facility account with zero/multiple owned facilities | Recovery state; no guessed owner or duplicate starter graph | Home2/Home3 |
| Empty owner and newly created water meter | Initial setup guidance; no anchor fallback. Water appears for that owner when a meter exists, before readings, without being revealed by another facility's water | Home3/Home5/Home6 |
| Emissions disabled, then enabled; explicit custom dashboard | Default Emissions visibility follows preference; user-created dashboard stays reachable and explains unavailable data | Home3/Home6 |
| No reporting selection, although other analyses exist | Goals/configuration remain visible with selection placeholder; no latest-analysis fallback or source write | Home4/Home5 |
| Reporting selection changes during calculation | Following widgets resolve the new exact target; named-analysis widgets retain their GUID; obsolete results are rejected | Home4 |
| Different facility through-dates, goals, baselines or readiness | Rows display their own dates/baselines/unavailable state, without ranked equivalence or averaged percentages | Home5 |
| Missing goal, negative improvement, zero utility value, missing costs | Independent states remain explicit; valid zero/negative values are not hidden; no invented progress or dollar savings | Home4/Home5 |
| Lagging facility and shared U anchor | All U widgets use one window; lagging sources retain gaps. Y/A/E/L widgets label independent periods | Home4/Home5/Home6 |
| Energy/cost facility comparison versus annual history | Optional facility-by-source chart uses selected dates; annual history uses actual fiscal years. Neither replaces the other | Home5/Home6 |
| Multiple water subtypes and emissions categories | Account subtype rows/optional facility stacks and category tables/charts preserve those dimensions and their adapter requirements | Home5/Home6 |
| Incompatible fiscal intervals, units or requested overrides | Distinct labeled contributions or explained unavailable state; no fabricated aggregate, resampling or silent fallback | Home4/Home5 |
| Saved chart edited, dashboard duplicated, template instantiated | Saved links update after commit; duplicate retains saved links and independent built-in overrides; template creation makes no chart records or shared mutable defaults | Home2–Home4/Home6 |
| Restore a dashboard with built-in overrides and saved links | Only that dashboard returns to shipped configuration; old saved charts and other dashboards survive unchanged; no starter chart records are manufactured | Home2/Home3/Home6 |
| New shipped revision with pristine versus edited/deleted starters | Upgrade pristine original starters only; preserve edits/shared-chart protection, deletions, default choice and sidebar order | Home2/Home6 |
| Link deletion, replacement and return after dashboard/widget loss | Recoverable placeholder; explicit same-account replacement; return uses heading/default fallback and correct focus | Home3/Home4 |
| Backup round trip, older backup, unknown payload, interrupted graph write | Verify owner/GUID references and initialization state; preserve unknown intent and do not reseed or replay commits | Home2/Home6 |
| Keyboard, narrow layout, long labels and print | Saved order equals reading/focus order; keyboard move/resize available; tables stay usable and printing omits controls | Home3/Home4/Home6 |
| Overview reports still unmigrated | New overview remains independent; supported Reports navigation is available, but no unavailable overview-report creation shortcut is advertised | Separate later report migration |

### Issue acceptance traceability

| Home1 criterion | Evidence |
| --- | --- |
| Every Home/Overview content area dispositioned | Content map H01–H12, E01–E07, C01–C07, M01–M07, W01–W07 and O01–O09; source/calculation owners and explicit legacy exclusions |
| Seven templates with audience, widgets and data | Default compositions, vocabulary, optional catalog and annotated layouts above |
| Personas without a role gate | Template audience descriptions and unrestricted template/customization choices |
| Independent instances without editing shipped templates | Templates and ownership, linked-chart rules and lifecycle/upgrade contracts |
| Linked definitions, filters, missing sources and safe return | Reporting resolution, filter precedence, state matrix and safe open/return sections |

Home1 completes a source-backed specification and design walkthrough. It does not certify rendered layouts, native persistence/Workers, backup compatibility, real-data calculations or Electron printing. Each later issue must implement and test its assigned contract before the integrated Home6 acceptance; human review and QA retain issue closure.
