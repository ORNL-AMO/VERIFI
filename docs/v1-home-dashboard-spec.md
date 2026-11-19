# V1 Home dashboard specification

Design contract for [Home1 #2912](https://github.com/ORNL-AMO/VERIFI/issues/2912). This specifies the intended customizable Home experience; it does not claim implemented dashboards. The [content map](v1-home-content-map.md) owns legacy capability identifiers and dispositions. The [phase plan](v1-home-dashboard-plan.md) owns remaining delivery and acceptance.

## Templates and ownership

Provide Home, Goal Progress, Energy Use, Costs, Emissions and Water as editable starter dashboards, with Blank available for creation. Home and Goal Progress are the display names for the issue's Overview and Goals & Performance templates. Templates are shipped blueprints, not shared user instances. There is no role-selection gate; audiences below explain useful starting content without restricting customization.

An account's templates use account ownership and explicit live All facilities inclusion. A facility's templates use its exact owner GUID and that facility's current eligible resources. A one-facility portfolio remains a portfolio. A ready account marked single-facility with exactly one owned facility exposes the facility set once; it does not create hidden account analysis pairs or change existing account-backed report relationships. Invalid zero/multiple-facility single-facility setups show recovery instead of guessing an owner.

Default sidebar order is Home, Goal Progress, Energy Use, Costs, Emissions, Water. Hide default Water entries/sections until an intake or discharge meter exists in that owner scope; an empty meter is sufficient. Default Emissions visibility follows the account's emissions setting. Explicitly created/duplicated dashboards stay accessible. Preserve explicit deletion and visibility choices; conditional visibility never removes records or source data.

The main Home action opens the owner's chosen default, initially Home. If unavailable or hidden, choose the first visible dashboard in saved order. If none remain, show Create dashboard and template choices; do not recreate deleted starters. Switching owners opens that owner's default, rather than trying to retarget the previous dashboard.

## Widget and period vocabulary

The identifiers below are specification keys for compositions and acceptance, not a serialized schema. Every chart is a linked saved visualization. Summary, table, action, note and shortcut widgets have their own typed settings; their values are projections of existing domain data, not frozen results.

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
| 3 HOME.energy-trend | Rolling improvement line, Half | Reporting energy, existing rolling-12-month improvement / R | Requires current eligible monthly analysis results; preserve signed values and gaps. Same definition as GP.energy-rolling. | H07, H09 |
| 4 HOME.water-goal | Water goal summary, Half, conditional | Owner goal + Reporting water / L | Same goal/result separation as energy; water visibility rule applies. | H07 |
| 5 HOME.water-trend | Rolling improvement line, Half, conditional | Reporting water / R | Same definition as GP.water-rolling; no reporting selection keeps a placeholder. | H07, H09 |

The rolling improvement trend projects the existing monthly result field rolling12MonthImprovement, preserving its sign and exclusions. If a source currently exposes only split savings/loss measures, Home4 must add an explicit compatible projection of that existing field before this recipe renders; do not reconstruct it by summing traces or invent a new calculation.

Owner name and scope are in the dashboard header; the initial layout does not repeat contact/NAICS/counts or every workspace shortcut as default widgets.

### Goal Progress

Audience: portfolio managers comparing facility progress and facility managers inspecting modeled performance. Account progress includes every currently owned facility, even one with no goal, reporting selection or valid result. Rows show facility link, category, target/baseline, reporting analysis/baseline, latest improvement, through-date and readiness. Do not average improvement percentages or sum heterogeneous baselines. Use each facility's reporting selection, not an account analysis's selected-child roster. That roster still governs the account charts below.

| Order / ID | Widget and width | Binding / period | Required data and unavailable behavior | Content map |
| --- | --- | --- | --- | --- |
| 1 GP.facilities | Facility progress table, Full; account only | Each owned facility's goals + reporting selections / L | Keep missing/invalid rows with setup links; dates remain per row. No facility produces creation guidance. | H04, H07 |
| 2–3 GP.energy-goal, GP.energy-rolling | Goal summary, Half; rolling improvement line, Half | Same bindings/definitions as corresponding Home widgets / L, R | Same prerequisites; independent widget layout/overrides without duplicating the linked trend. | H07, H09 |
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

Blank has a dashboard header, Add widget action and empty-state guidance. It creates no saved charts until a chart is explicitly added.

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

Home2 owns durable instances, template provenance and reporting-following saved intent; Home3 owns navigation/layout; Home4 owns linked rendering and compatible controls; Home5 owns goals/actions/tables/maps and any required compatible summary/category adapters; Home6 owns complete template creation and parity acceptance. Existing formulas, report output and v0 behavior remain unchanged.
