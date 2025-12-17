# Shared Calculations

## Overview

The shared calculations module provides utility functions used across multiple calculation modules. These functions handle common tasks such as date manipulation, fiscal year calculations, data filtering, and value validation.

## Fiscal Year Calculations

### getFiscalYear

Determines the fiscal year for a given date based on facility/account configuration.

**Calendar Year (January-December):**
```
Fiscal_year = Calendar_year of the date
```

**Custom Fiscal Year:**

**Case 1: Fiscal year ends in calendar year** (`fiscalYearCalendarEnd = true`)
```
Example: October 1, 2023 - September 30, 2024 → FY 2024

if (date.month >= fiscalYearMonth):
    Fiscal_year = date.year + 1
else:
    Fiscal_year = date.year
```

**Case 2: Fiscal year starts in calendar year** (`fiscalYearCalendarEnd = false`)
```
Example: October 1, 2023 - September 30, 2024 → FY 2023

if (date.month >= fiscalYearMonth):
    Fiscal_year = date.year
else:
    Fiscal_year = date.year - 1
```

**Examples:**

**Calendar year facility:**
```
Date: March 15, 2024
Fiscal_year = 2024
```

**October start, ends in calendar year:**
```
fiscalYearMonth = 9 (October, 0-indexed)
fiscalYearCalendarEnd = true

Date: November 15, 2023
month (10) >= fiscalYearMonth (9): YES
Fiscal_year = 2023 + 1 = 2024

Date: August 20, 2024
month (7) >= fiscalYearMonth (9): NO
Fiscal_year = 2024
```

**October start, starts in calendar year:**
```
fiscalYearMonth = 9 (October)
fiscalYearCalendarEnd = false

Date: November 15, 2023
month (10) >= fiscalYearMonth (9): YES
Fiscal_year = 2023

Date: August 20, 2024
month (7) >= fiscalYearMonth (9): NO
Fiscal_year = 2024 - 1 = 2023
```

## Date and Time Functions

### getMonthlyStartAndEndDate

Calculates the baseline date, end date, and banked analysis date for an analysis item.

**Without Banking:**
```
baselineDate = First day of baseline year
endDate = First day after report year
```

**With Banking:**
```
baselineDate = First day of new baseline year (after banking)
endDate = First day after report year
bankedAnalysisDate = First day after banked analysis year
```

**Calendar Year Example:**
```
Baseline year: 2020
Report year: 2023

baselineDate = January 1, 2020
endDate = January 1, 2024
```

**Custom Fiscal Year Example:**
```
Fiscal year: October - September (ends in calendar year)
Baseline year: 2020
Report year: 2023
fiscalYearMonth = 9 (October)

baselineDate = October 1, 2019 (start of FY 2020)
endDate = October 1, 2023 (start of FY 2024)
```

### getLastBillEntryFromCalanderizedMeterData

Finds the most recent bill date across all meters in a group.

```
Last_bill = MAX(bill.date) for all bills in all meters in group
```

Used to determine data availability end date for analysis.

## Data Filtering Functions

### filterYearPredictorData

Filters predictor data for a specific fiscal year.

**Calendar Year:**
```
Filter where: predictor.date.year == target_year
```

**Custom Fiscal Year:**
```
Filter where: getFiscalYear(predictor.date) == target_year
```

**Example:**
```
Target fiscal year: 2023
Fiscal year: October-September, ends in calendar
Includes predictor data from: Oct 1, 2022 through Sep 30, 2023
```

### filterYearMeterData

Filters meter data (MonthlyData) for a specific fiscal year.

**Calendar Year:**
```
Filter where: meter_data.date.year == target_year
```

**Custom Fiscal Year:**
```
Filter where: getFiscalYear(meter_data.date) == target_year
```

Similar logic to predictor filtering but operates on calanderized monthly meter data.

### getIncludedMeters

Determines which meters should be included in an analysis for a specific year.

```
For each facility in analysis:
    Get facility analysis item
    if (analysis_item.guid != 'skip'):
        Get meters for facility
        Filter by analysis item specifications
        Add to included_meters list
```

Meters can be excluded if:
- Facility is marked to skip in that year
- Meter was not operational during the year
- Meter is not part of analysis groups

## Predictor Functions

### getPredictorUsage

Calculates total predictor usage across multiple predictor variables.

```
Total_usage = Σ(Σ(amount_i)) for each predictor variable
```

**Process:**
1. For each predictor variable in the analysis
2. Filter predictor data for that variable
3. Sum all amounts for that variable
4. Add to total

**Example:**
```
Predictor variables:
- Production: 50,000 units
- Heating Degree Days: 3,500 HDD

Total_usage = 50,000 + 3,500 = 53,500
```

Note: This simple sum is used primarily for energy intensity calculations where there's typically one production variable.

## Value Validation Functions

### checkAnalysisValue

Checks if a value is effectively zero and rounds to exactly zero if so.

```
if (|value| < 0.0000001):
    return 0
else:
    return value
```

**Purpose:** Prevents floating-point precision issues from displaying very small non-zero values (e.g., 1.23e-10) that should be zero.

**Example:**
```
checkAnalysisValue(0.00000001) → 0
checkAnalysisValue(0.001) → 0.001
checkAnalysisValue(-0.0000000005) → 0
```

## Calanderization Helper Functions

### daysBetweenDates

Calculates the number of days between two dates, inclusive.

```
Days = (end_date - start_date) + 1
```

The +1 includes both the start and end dates.

**Example:**
```
Start: January 1, 2024
End: January 10, 2024
Days = 10 - 1 + 1 = 10 days
```

### getConsumptionUnit

Determines the appropriate consumption unit for a meter based on its type and configuration.

**Electric meters:**
```
if (energyIsSource):
    return source_energy_unit
else:
    return 'kWh' (or configured site unit)
```

**Non-electric meters:**
```
return meter's configured consumption unit (ccf, gal, therms, etc.)
```

### getUnitFromMeter

Gets the unit of measurement from a meter configuration.

Returns the consumption unit for non-electric meters, or energy unit for electric meters.

### getCurrentMonthsReadings

Gets all meter readings that fall within a specific calendar month.

```
Filter readings where:
    reading_date.year == target_month.year AND
    reading_date.month == target_month.month
```

### getPreviousMonthsBill / getNextMonthsBill

Navigates bill data to find adjacent billing periods.

Used for:
- Determining bill start dates (previous bill's end date)
- Identifying gaps in billing data
- Interpolating missing data

## Date Utilities

### checkSameMonth

Checks if two dates are in the same calendar month and year.

```
return (date1.year == date2.year AND date1.month == date2.month)
```

Used extensively in monthly data aggregation to ensure correct month assignment.

## Analysis Configuration Helpers

### getNeededUnits

Determines standard units for analysis category:

**Energy analysis:**
```
return 'MMBtu'
```

**Water analysis:**
```
return 'kgal' (thousand gallons)
```

This ensures consistent units across facilities in multi-facility analyses.

## Emissions Helper Functions

### combineEmissionsResults

Aggregates emissions from multiple sources.

```
Combined = {
    locationElectricityEmissions: Σ(location_i),
    marketElectricityEmissions: Σ(market_i),
    stationaryEmissions: Σ(stationary_i),
    mobileEmissions: Σ(mobile_i),
    fugitiveEmissions: Σ(fugitive_i),
    processEmissions: Σ(process_i),
    ... (all emission categories)
}
```

### getZeroEmissionsResults

Returns an emissions result structure with all values set to zero.

Used for meters/periods with no emissions (e.g., renewable energy sources).

## Aggregation Patterns

### Summing Monthly to Annual

```
Annual_value = Σ(Monthly_value_i) for all months in fiscal year
```

Applied to:
- Energy use
- Cost
- Savings
- Emissions
- Predictor usage

### Summing Groups to Facility

```
Facility_value = Σ(Group_value_i) for all groups in facility
```

Maintains hierarchical consistency.

### Summing Facilities to Account

```
Account_value = Σ(Facility_value_i) for all facilities in account
```

Highest level of aggregation.

## Common Calculation Patterns

### Year-over-Year Change

```
Change = (Current_year - Previous_year) / Previous_year × 100%
```

For absolute change:
```
Absolute_change = Current_year - Previous_year
```

### Percent of Total

```
Percent = (Part / Total) × 100%
```

### Intensity Calculation

```
Intensity = Total_value / Activity_metric
```

Examples:
- Energy intensity: MMBtu per unit produced
- Cost intensity: $ per MMBtu
- Emissions intensity: metric tons CO₂e per MMBtu

### Weighted Average

When combining values with different weights:

```
Weighted_avg = Σ(value_i × weight_i) / Σ(weight_i)
```

**Example - Average cost per MMBtu across facilities:**
```
Facility A: 100 MMBtu at $5/MMBtu = $500
Facility B: 200 MMBtu at $6/MMBtu = $1,200

Weighted average = (500 + 1,200) / (100 + 200) = $1,700 / 300 = $5.67/MMBtu
```

## Performance Optimization Helpers

### Caching Fiscal Year Calculations

Since fiscal year calculations are repeated frequently:

```
Cache key = date.toISOString() + facility.guid
if (key in cache):
    return cache[key]
else:
    result = calculate_fiscal_year()
    cache[key] = result
    return result
```

### Memoization

For expensive calculations that are called multiple times with same inputs:

```
function memoized_calculation(input):
    if (input in memo):
        return memo[input]
    result = perform_calculation(input)
    memo[input] = result
    return result
```

## Data Quality Utilities

### Identifying Outliers

Simple outlier detection:

```
Mean = Σ(value_i) / n
Std_dev = sqrt(Σ((value_i - Mean)²) / n)

if (|value - Mean| > 3 × Std_dev):
    Flag as potential outlier
```

### Data Completeness Check

```
Completeness = (Months_with_data / Expected_months) × 100%

if (Completeness < 90%):
    Flag for review
```

### Missing Data Handling

**Option 1: Interpolation**
```
Missing_value = (Previous_value + Next_value) / 2
```

**Option 2: Previous year same month**
```
Missing_value = Previous_year_same_month_value
```

**Option 3: Monthly average**
```
Missing_value = Average(Available_months_in_year)
```

## Error Handling

### Division by Zero Protection

```
if (denominator == 0 or denominator is undefined):
    return 0
else:
    return numerator / denominator
```

### Null/Undefined Checks

```
if (value == null or value == undefined or isNaN(value)):
    return default_value
else:
    return value
```

## Date Range Utilities

### Generating Month List

Create list of all months in a date range:

```
months = []
current = start_date
while (current <= end_date):
    months.push(current)
    current = first_day_of_next_month(current)
return months
```

### Fiscal Year Boundaries

```
function getFiscalYearBoundaries(year, facility):
    start = first_day_of_fiscal_year(year, facility)
    end = last_day_of_fiscal_year(year, facility)
    return {start, end}
```

## Key Concepts

1. **Fiscal year handling:** Critical for multi-facility analyses with different fiscal years
2. **Date filtering:** Ensures data is assigned to correct periods
3. **Value validation:** Prevents floating-point errors from affecting results
4. **Consistent aggregation:** Maintains data integrity through hierarchy
5. **Caching/memoization:** Improves performance for repeated calculations
6. **Data quality checks:** Identifies issues before they affect analyses
7. **Null safety:** Robust handling of missing or invalid data

## Common Use Cases

### Monthly Analysis Loop
```
for each month in analysis period:
    monthly_data = filterYearMeterData(all_data, month)
    fiscal_year = getFiscalYear(month, facility)
    predictor_data = filterYearPredictorData(predictors, fiscal_year)
    perform_monthly_calculations()
```

### Multi-Facility Aggregation
```
total = 0
for each facility in account:
    facility_value = calculate_facility_value()
    total += facility_value
return total
```

### Year-over-Year Comparison
```
current_year_data = filterYearData(data, current_year)
previous_year_data = filterYearData(data, previous_year)
change_percent = (current - previous) / previous × 100%
```

These shared utilities form the foundation that enables consistent, accurate calculations across all VERIFI modules.
