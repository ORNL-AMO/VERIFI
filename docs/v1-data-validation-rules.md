# V1 Data Validation and Status Rules

This document is the human-readable contract for validation in the production v1 workspace. It is intended for product, design, engineering, QA, and support. Source code and tests remain executable truth; any intentional rule change must update this document, the rule catalog, presentation copy, and tests together.

## Status language

| Severity | Meaning |
| --- | --- |
| Error | Data or configuration is invalid, incomplete, or prevents a dependent result from being trusted. |
| Warning | Work can continue, but the user should review or correct the condition. |
| Information | Context the user should understand but does not need to resolve. |
| Valid | No findings apply. Valid is a summary state, not a finding. |

Findings use one of five categories: **configuration**, **completeness**, **currency**, **quality**, or **readiness**. A scope summary uses its most severe finding: error, warning, information, then valid. Pending or failed evaluation is never presented as valid.

## Todo behavior

- Every error is included in Todos.
- Warnings that require user remediation are included, even when their v1 fix workflow is not available yet.
- Informational findings and statistical-outlier warnings are not global Todos.
- Available fixes link to the narrowest useful v1 screen. Unavailable fixes are labeled **Fix workflow not yet available in v1** and never link back to v0.
- Findings cannot be dismissed generically. They clear when the underlying data or settings change, or when an existing domain exception is enabled.
- Todos are grouped and sorted by severity, affected record, and stable rule code.

## Account and facility rules

| Rule code | Finding | Severity / category | Trigger and behavior | Todo and remediation |
| --- | --- | --- | --- | --- |
| `account.configuration.default-name` | Finish account setup | Warning / configuration | The account still uses the default `New Account` name. | Yes; Account Settings > Profile. |
| `account.facilities.missing` | Add a facility | Error / readiness | The account has no facilities. | Yes; Account Settings > Portfolio. |
| `facility.meters.missing` | Add utility meters | Error / readiness | The facility has no meters. | Yes; Facility Data > Meters. |
| `facility.meter-groups.missing` | Add meter groups | Warning / readiness | The facility has meters but no meter groups. | Yes; Facility Data > Meter Grouping. |
| `facility.predictors.missing` | Add predictors | Error / readiness | The facility has no predictors. This remains a facility-wide readiness finding. | Yes; fix workflow currently unavailable in v1. |

Account summaries include account findings and all descendant facility, data, analysis, and report findings. Facility summaries include their descendant meter, predictor, analysis, and report findings. Aggregation does not create duplicate parent findings.

## Meter rules

| Rule code | Finding | Severity / category | Trigger and exceptions | Todo and remediation |
| --- | --- | --- | --- | --- |
| `meter.configuration.invalid` | Complete meter setup | Error / configuration | One or more applicable required fields are missing or invalid. Evidence names the fields. | Yes; meter Settings. |
| `meter.data.missing` | Add meter readings | Error / completeness | The meter has no readings. Derived gap, currency, and outlier findings are suppressed. | Yes; meter Readings. |
| `meter.data.duplicate-date` | Resolve duplicate readings | Error / quality | Multiple readings use the same complete reading date. | Yes; meter Readings. |
| `meter.data.negative` | Review negative readings | Error / quality | Energy use or volume is negative and negative values are not allowed. | Yes; meter Readings or Settings. |
| `meter.data.gap` | Fill missing meter data | Error / completeness | Monthly data has a missing month, or annual data has a missing year, between the first and last entry. | Yes; meter Readings. |
| `meter.calendarization.missing` | Select a calendarization method | Warning / configuration | No meter-reading data application/calendarization method is selected. | Yes; meter Settings. |
| `meter.currency.stale` | Update stale meter data | Warning / currency | The latest entry is older than the configured threshold. When facility lag also applies, it is included as evidence instead of a second currency finding. | Yes; meter Readings. |
| `meter.currency.behind-facility` | Bring meter data current | Warning / currency | The meter ends before the facility's latest meter month and is not already stale. | Yes; meter Readings. |
| `meter.quality.consumption-outlier` | Review consumption outliers | Warning / quality | The meter-quality calculation finds one or more consumption outliers. | Context only; Quality Report. |
| `meter.quality.cost-outlier` | Review cost outliers | Warning / quality | The meter-quality calculation finds one or more cost outliers. | Context only; Quality Report. |

Required meter configuration includes applicable name, source, starting and energy units, fuel, phase, heat capacity, site-to-source value, water type, vehicle settings, GWP option, green-purchase fraction, and charge name/type. A missing stored heat capacity is considered configured when the value shown in Meter Settings can be deterministically derived from the selected standard or custom fuel and units; validation does not write that derived value back to the meter. An explicitly invalid heat capacity remains an error. Independent findings may coexist.

## Predictor rules

| Rule code | Finding | Severity / category | Trigger and exceptions | Todo and remediation |
| --- | --- | --- | --- | --- |
| `predictor.data.missing` | Add predictor data | Error / completeness | The predictor has no entries. Derived gap, currency, and weather findings are suppressed. | Yes; predictor data workflow, currently unavailable in v1. |
| `predictor.data.duplicate-month` | Resolve duplicate predictor data | Error / quality | Multiple entries use the same month and year. | Yes; currently unavailable in v1. |
| `predictor.data.gap` | Fill missing predictor data | Error / completeness | A month is missing between the first and last entry. | Yes; currently unavailable in v1. |
| `predictor.data.negative` | Review negative predictor data | Error / quality | A value is negative and negative values are not allowed. | Yes; currently unavailable in v1. |
| `predictor.currency.stale` | Update stale predictor data | Warning / currency | The latest entry is older than the configured threshold. Facility lag is included as evidence when both apply. | Yes; currently unavailable in v1. |
| `predictor.currency.behind-facility` | Bring predictor data current | Warning / currency | Predictor data ends before the facility's latest meter month and is not already stale. | Yes; currently unavailable in v1. |
| `predictor.weather.warning` | Review weather data | Warning / quality | A weather predictor contains a source-data warning that has not been ignored. | Yes; currently unavailable in v1. |

Independent predictor problems are all reported; one warning cannot hide an error.

## Date and exception rules

- Staleness uses the effective account/facility setting of 2, 3, 6, or 12 months; the default is 3 months.
- A date exactly on the threshold is current. It becomes stale only when older than the threshold.
- Evaluation receives an explicit date. It does not read the clock inside individual rules.
- **Ignore date status checks** suppresses both stale and behind-facility findings.
- Records marked **no longer in use** are compared with their configured stop month/year and are not wall-clock stale.
- **Allow negative values** suppresses negative-value findings.
- **Ignore weather warnings** suppresses only the weather finding.
- Validation never mutates, rounds, repairs, or otherwise rewrites stored data.

## Facility and account analysis rules

| Rule code family | Severity / category | Rules |
| --- | --- | --- |
| `analysis.configuration.*` | Error / configuration | A facility analysis requires a name, at least one group, a valid baseline year within available complete data years, and a linked banking analysis when banking is enabled. |
| `analysis-group.setup.*` | Error / configuration or completeness | Applicable groups require meters, production variables, complete model inputs, valid dates spanning at least 12 months, required readings, valid baseload settings, and valid banking years. Skipped groups produce no setup findings. |
| `analysis-group.model.invalid` | Warning / quality | A selected regression model exists but fails statistical/model-validity checks. |
| `analysis-group.inputs.invalid` | Warning / quality | An included meter or predictor has data/setup errors, unless a specific analysis requirement is also invalid and already produces an error. |
| `account-analysis.configuration.*` | Error / configuration | Account analyses require a name, baseline year, facility selections, and valid linked facility analyses. |
| `account-analysis.children.warning` | Warning / quality | One or more included facility analyses has warnings. |

Generated regression groups require a selected model, model year, constant, and required coefficients. User-defined regression groups require start/end months and years, constant, coefficients, and complete meter/predictor data for the selected period.

## Report rules

| Rule code family | Severity / category | Rules |
| --- | --- | --- |
| `report.configuration.*` | Error / configuration | Reports require a name, valid type, and the fields required by that type. Required years and dates must be numeric. |
| `report.dates.invalid` | Error / configuration | Start dates must precede end dates. Report year cannot precede baseline year where that comparison applies. |
| `report.analysis.invalid` | Error / readiness | Reports that require an analysis must reference an existing analysis without setup errors. |
| `report.data.incomplete` | Error / completeness | Facility cost-savings reports require complete source data; facility data-quality reports require a valid selection. |
| `report.analysis.warning` | Warning / quality | A structurally valid report inherits a warning from its linked analysis. |

Report findings contribute to their facility or account summary.

## Maintenance requirement

Every validation change must update this document, the stable rule catalog, presentation copy, and automated tests in the same change. New rules must define severity, category, evidence, scope, Todo behavior, exceptions, and remediation availability before implementation.

## Intentional differences from v0

- v1 emits every independent applicable finding instead of selecting one status action by priority. This prevents a currency warning from hiding a missing-data or duplicate-data error.
- Staleness uses the evaluation date supplied to the engine; it does not read the wall clock inside individual record checks.
- Findings contain stable codes and evidence only. URLs, user-facing copy, Todo inclusion, and workflow availability live in the v1 presentation catalog.
- Meter configuration findings identify all affected fields instead of exposing only one invalid flag.
- Statistical outliers are visible on meter cards, Readings, and the Quality Report but are intentionally excluded from global Todos.
- v1 may therefore show more findings than v0 for the same account. This is expected; no v0 status behavior is changed.
