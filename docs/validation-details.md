# VERIFI Validation Checks Reference

This document describes every validation check performed at each level of the application, what triggers an **Error**, what triggers a **Warning**, and what it means for the user.

---

## Status Levels

| Status | Meaning |
|--------|---------|
| **Good** | All checks pass — no action needed |
| **Warning** | Something needs attention but does not block core operations |
| **Error** | A critical problem that must be resolved before the feature can work correctly |

Statuses roll upward: a child object's error or warning bubbles up to its parent.

---

## 1. Account

The account status is derived entirely from its facilities. No independent account-level validation flags a status directly, but two advisory actions are generated:

| Condition | Status | Description |
|-----------|--------|-------------|
| Account name is still "New Account" | Warning | Prompts user to configure account name, unit settings, location, and goals. |
| No facilities exist | Error | Prompts user to import data or add a facility manually. |

**Status rollup rule:**
- Error if any facility is Error
- Warning if any facility is Warning
- Good if all facilities are Good

---

## 2. Facility

The facility status is the worst of: meters status, predictors status, energy analysis status, water analysis status.

### Facility-level action triggers

| Condition | Status | Description |
|-----------|--------|-------------|
| No meters | Error | Utility meters are required. |
| Meters exist but no meter groups | Error | Meter groups are required for analysis and reporting. |
| No predictors | Error | Predictors are required for analysis. |

### Meters rollup status

| Condition | Status |
|-----------|--------|
| No meters, OR any meter is Error | Error |
| No meter groups (but meters exist), OR any meter is Warning | Warning |
| All meters Good and at least one group exists | Good |

### Predictors rollup status

| Condition | Status |
|-----------|--------|
| No predictors, OR any predictor is Error | Error |
| Any predictor is Warning | Warning |
| All predictors Good | Good |

### Additional tracked flags (informational, not directly reflected in facility status)

| Flag | Meaning |
|------|---------|
| `hasNonCurrentMeters` | At least one meter's data does not reach the facility's most recent data month |
| `hasNonCurrentPredictors` | At least one predictor's data does not reach the facility's most recent data month |
| `hasPredictorWeatherWarnings` | At least one weather predictor has entries flagged with weather data gap warnings |
| `hasInvalidMeters` | At least one meter has a configuration error |

---

## 3. Meter

### Error conditions

| Condition | Description |
|-----------|-------------|
| **Invalid meter configuration** | One or more required setup fields are missing or invalid (see validity checks below) |
| **No data** | No readings have been entered for this meter |
| **Duplicate entries** | More than one reading shares the same day/month/year |

### Warning conditions

| Condition | Description |
|-----------|-------------|
| **No calendarization method** | `meterReadingDataApplication` is not set; energy use cannot be properly assigned to calendar months |
| **Data not current** | The meter's most recent reading is earlier than the facility's most recent data month |
| **Negative readings** | Any reading has a negative `totalEnergyUse` or `totalVolume` |

### Meter validity checks — what makes a meter "invalid" (Error)

A meter is invalid if any of the following fields are missing or fail validation:

| Field | Rule |
|-------|------|
| Name | Must not be blank |
| Source | Must not be blank |
| Starting unit | Must not be blank |
| Energy unit | Must not be blank |
| Fuel type | Required when source = "Other Fuels" (scope ≠ 2) or source = "Other Energy" |
| Phase | Required when source = "Other Fuels" (scope ≠ 2) |
| Heat capacity | Required for certain source/unit combinations; must be ≥ 0 |
| Site-to-source ratio | Required for certain source/includeInEnergy combinations; must be ≥ 0 |
| Water intake type | Required when source = "Water Intake" |
| Water discharge type | Required when source = "Water Discharge" |
| Vehicle category | Required when scope = 2 |
| Vehicle type, collection type, distance unit, fuel efficiency | Required when scope = 2 and vehicle category = 2 |
| Global warming potential option | Required when scope = 5 or 6 |
| Green purchase fraction | Must be between 0 and 1 (if provided) |
| Charges | Each charge entry must have a name and a charge type |

---

## 4. Predictor

### Error conditions

| Condition | Description |
|-----------|-------------|
| **No data** | No predictor data entries have been added |
| **Duplicate entries** | More than one entry exists for the same month/year |
| **Missing entries** | Gaps in month coverage exist between the first and last entry dates |

### Warning conditions

| Condition | Description |
|-----------|-------------|
| **Data not current** | The most recent entry is earlier than the facility's most recent data month |
| **Weather data gap warning** | Applies to Weather-type predictors only. One or more entries were calculated from weather station data containing gaps of 12 or more hours — the values may not be accurate. This warning can be dismissed per predictor (`ignoreWeatherDataWarning`); dismissing hides it from status checks. |

---

## 5. Facility Analysis (Analysis Item)

An analysis item organises one or more analysis groups. Status is determined by setup errors at the item level and by errors or warnings across its groups.

### Error conditions

All of the following are setup-level errors that block the analysis:

| Condition | Description |
|-----------|-------------|
| **Missing name** | The analysis item has no name |
| **No groups** | The analysis has no groups configured |
| **Missing baseline year** | No baseline year is set |
| **Baseline year after meter data end** | The baseline year is beyond the end of available meter data |
| **Baseline year before meter data start** | The baseline year is before the start of available meter data |
| **Banking error** | Banking is enabled but no linked banking analysis item is selected |
| **Group errors** | One or more groups have errors (rolls up to analysis Error) |

### Warning conditions

| Condition | Description |
|-----------|-------------|
| **Group warnings** | One or more groups have warning status (no setup errors) |

---

## 6. Analysis Group

Each analysis group inside an analysis item is validated independently.

### Error conditions

| Condition | Description |
|-----------|-------------|
| **Missing production variables** | No predictor variables are selected as "in analysis" |
| **No production variables** | (Non-regression types) No predictor is marked as a production variable |
| **Missing group meters** | No calendarized meters are assigned to this group |
| **Missing banking baseline year** | Banking is applied but no new baseline year is configured |
| **Missing banking applied year** | Banking is applied but no banked analysis year is configured |
| **Invalid banking years** | Banked analysis year is ≥ new baseline year (applied year must be before baseline year) |
| **Missing regression constant** | Regression constant value is absent |
| **Missing regression model year** | Model year not set (generated model only) |
| **Missing regression model selection** | Generated model type but no model has been selected |
| **Missing regression predictor coefficient** | A predictor variable in the analysis has no regression coefficient assigned |
| **Invalid average baseload** | Modified energy intensity: average percent baseload is not a valid number |
| **Invalid monthly baseload** | Modified energy intensity: one or more monthly percent baseload values are invalid |
| **Invalid model date selection** | User-defined model: the date range is invalid, spans fewer than 12 months, or meter/predictor data is missing within the selected range |
| **Missing predictor data for model year** | Predictor data has gaps within the regression model year |

### Warning conditions

| Condition | Description |
|-----------|-------------|
| **Predictor setup errors** | One or more predictors used by this group have Error status |
| **Meter setup errors** | One or more meters in this group have Error status |
| **Invalid generated regression model** | The selected auto-generated regression model is flagged as invalid (`isValid = false`) |
| **Invalid user-defined model** | The user-defined model has configuration issues (missing date fields, range checks, or coefficient problems) |

> **Note on user-defined model invalidity:** A user-defined model is invalid when any of the following are true: missing start month, end month, start year, or end year; the date selection is invalid (bad range, fewer than 12 months, or missing data in range); missing regression constant; or missing predictor coefficient for any variable in analysis.

---

## 7. Account Analysis

An account analysis aggregates results from selected facility analyses across the account. Status is driven by its own setup and by the statuses of the included facility analyses.

### Error conditions

| Condition | Description |
|-----------|-------------|
| **Missing name** | The account analysis has no name |
| **Missing baseline year** | No baseline year is set |
| **Facility selections invalid** | One or more facility-analysis links are broken: a facility has no analysis selected (and is not set to "skip"), or the linked facility analysis has errors |

### Warning conditions

| Condition | Description |
|-----------|-------------|
| **Facility analysis warnings** | One or more of the included facility analyses have Warning status |

---

## 8. Facility Report

Facility report validation produces a single `hasErrors` flag — there is no warning tier; a report is either valid or not.

### All report types

| Condition | Description |
|-----------|-------------|
| **Missing name** | Report has no name |

### By report type

**Overview Report**

| Condition | Description |
|-----------|-------------|
| Missing start date | Start month or year is not set |
| Missing end date | End month or year is not set |
| Invalid date range | Start date is the same as or after the end date |

**Analysis Report**

| Condition | Description |
|-----------|-------------|
| Missing report year | Report year is not set |
| Analysis has errors | The linked analysis item has setup or group errors |

**Emission Factors Report**

| Condition | Description |
|-----------|-------------|
| Missing baseline year | Start year is not set |
| Missing report year | End year is not set |
| Invalid date range | Start year is the same as or after end year |

**Savings Report**

| Condition | Description |
|-----------|-------------|
| Missing report year | End year is not set |
| Missing end date | End month is not set |
| Analysis has errors | The linked analysis item has errors |

**Modeling Report**

| Condition | Description |
|-----------|-------------|
| Missing report year | Report year is not set |
| Analysis has errors | The linked analysis item has errors |

**Cost Savings Report**

| Condition | Description |
|-----------|-------------|
| Missing report year | Report year is not set |
| Data incomplete | The `isDataComplete` flag is false in the report settings |
| Analysis has errors | The linked analysis item has errors |

---

## 9. Account Report

Account report validation produces a single `hasErrors` flag — no warning tier.

### All report types

| Condition | Description |
|-----------|-------------|
| **Missing name** | Report has no name |
| **Missing report type** | Report type is not selected |

### By report type

**Better Plants, Performance, Better Climate, Analysis Reports**

| Condition | Description |
|-----------|-------------|
| Missing report year | Report year is not set |
| Missing baseline year | Baseline year is not set |

**Performance and Better Climate Reports (additional check)**

| Condition | Description |
|-----------|-------------|
| Baseline after report year | Baseline year is later than the report year |

**Data Overview Report**

| Condition | Description |
|-----------|-------------|
| Missing start date | Start month or year is not set |
| Missing end date | End month or year is not set |
| Invalid date range | Start date is the same as or after the end date |

**Account Savings Report**

| Condition | Description |
|-----------|-------------|
| Missing end date | End month or year is not set |

**Account Emission Factors Report**

| Condition | Description |
|-----------|-------------|
| Invalid date range | Start year is the same as or after end year |

### Reports requiring a valid linked analysis

The following report types verify that an analysis item is linked and that the linked analysis has no errors:

| Report Type | Linked Field |
|-------------|-------------|
| Better Plants | `betterPlantsReportSetup.analysisItemId` |
| Performance | `performanceReportSetup.analysisItemId` |
| Analysis | `analysisReportSetup.analysisItemId` |
| Account Savings | `accountSavingsReportSetup.analysisItemId` |

If the field is empty or the linked analysis has any errors, `analysisHasErrors` is set to true and the report is considered invalid.

---

## Status Rollup Summary

```
Account
└── Facility (worst of meters, predictors, energy analysis, water analysis)
    ├── Meter (error: invalid/no data/duplicates | warning: no cal. method/not current/negative)
    ├── Predictor (error: no data/duplicates/missing months | warning: not current/weather gap)
    ├── Facility Analysis (error: setup errors/group errors | warning: group warnings)
    │   └── Analysis Group (error: config/data errors | warning: predictor/meter errors, bad model)
    └── Account Analysis (error: setup/facility link errors | warning: facility analysis warnings)
```
