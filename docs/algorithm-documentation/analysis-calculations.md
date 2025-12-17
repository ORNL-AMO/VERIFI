# Analysis Calculations

## Overview

The analysis calculations module is the core computational engine of VERIFI, responsible for calculating energy and water performance metrics, energy savings, and performance indicators. The calculations follow a hierarchical aggregation pattern:

1. **Monthly Group Level** - Calculate monthly performance for each analysis group
2. **Annual Group Level** - Aggregate monthly data to annual summaries for each group
3. **Facility Level** - Combine all groups within a facility
4. **Account Level** - Combine all facilities within an account

## Analysis Types

VERIFI supports four fundamental analysis methodologies:

### 1. Regression Analysis

Uses multiple linear regression with predictor variables to model expected energy consumption.

**Formula:**
```
M = β₀ + β₁P₁ + β₂P₂ + ... + βₙPₙ
```

Where:
- `M` = Modeled energy use for the period
- `β₀` = Regression constant (intercept)
- `βᵢ` = Regression coefficient for predictor i
- `Pᵢ` = Predictor variable value for predictor i (e.g., production units, heating degree days)

**Example:** If a facility has regression coefficients:
- Constant: 1000 MMBtu
- Production coefficient: 0.5 MMBtu/unit
- Heating Degree Days coefficient: 2.0 MMBtu/HDD

For a month with 5,000 units production and 200 HDD:
```
M = 1000 + (0.5 × 5000) + (2.0 × 200)
M = 1000 + 2500 + 400
M = 3900 MMBtu
```

### 2. Energy Intensity Analysis

Normalizes energy use by dividing by production or activity level.

**Formula:**
```
Baseline Intensity = E_baseline / P_baseline
M_current = Baseline Intensity × P_current
```

Where:
- `E_baseline` = Total baseline year actual energy use
- `P_baseline` = Total baseline year predictor usage
- `P_current` = Current period predictor usage
- `M_current` = Modeled (expected) energy for current period

**Example:** 
- Baseline year: 100,000 MMBtu consumed, 50,000 units produced
- Baseline intensity: 100,000 / 50,000 = 2.0 MMBtu/unit
- Current month: 4,000 units produced
- Modeled energy: 2.0 × 4,000 = 8,000 MMBtu

### 3. Modified Energy Intensity Analysis

Similar to energy intensity but accounts for baseload energy that doesn't vary with production.

**Formula:**
```
M_current = (Baseline Intensity × P_current × (1 - f_baseload)) + (E_baseline_month × f_baseload)
```

Where:
- `f_baseload` = Baseload fraction (e.g., 0.30 for 30% baseload)
- `E_baseline_month` = Actual energy use in the corresponding baseline month

**Example:**
- Baseline intensity: 2.0 MMBtu/unit
- Current month production: 4,000 units
- Baseload fraction: 30% (0.30)
- Baseline month actual: 8,500 MMBtu

```
M = (2.0 × 4,000 × (1 - 0.30)) + (8,500 × 0.30)
M = (8,000 × 0.70) + 2,550
M = 5,600 + 2,550
M = 8,150 MMBtu
```

### 4. Absolute Energy Consumption

Direct comparison against baseline without normalization for activity changes.

**Formula:**
```
M_current = E_baseline_month
```

The modeled energy for each month is simply the actual energy used in the corresponding baseline month.

## Monthly Calculations

### Step 1: Energy Use
Aggregate all meter data for the group for the month.

**For Energy Analysis:**
```
E = Σ(meter energy use for all meters in group)
```

**For Water Analysis:**
```
E = Σ(meter water consumption for all meters in group)
```

### Step 2: Modeled Energy
Calculate expected energy based on the selected analysis type (see Analysis Types above).

### Step 3: Baseline Actual Energy
- If current month is in baseline year: Use actual energy from current month
- If not baseline year: Use actual energy from the corresponding month in baseline year

### Step 4: Baseline Adjustment Input
If operational adjustments are specified:
```
BA_input = (E_month / E_year_total) × BA_year_total
```

Where:
- `BA_input` = Baseline adjustment for this month
- `E_month` = Energy use this month
- `E_year_total` = Total energy use for the year
- `BA_year_total` = Total baseline adjustment for the year

### Step 5: Data Adjustments
Similar calculation for data quality adjustments:
```
DA_month = (E_month / E_year_total) × DA_year_total
```

## Rolling 12-Month Calculations

VERIFI uses rolling 12-month windows to smooth out seasonal variations and provide more stable metrics. These calculations begin after 12 months of data are available.

### Rolling Values Setup

**Rolling Baseline (months 1-12 of baseline):**
```
RB_actual = Σ(E_i) for i = 1 to 12 (baseline months)
RB_modeled = Σ(M_i) for i = 1 to 12 (baseline months)
```

**Rolling Current (most recent 12 months):**
```
RC_actual = Σ(E_i) for i = (n-11) to n (most recent 12 months)
RC_modeled = Σ(M_i) for i = (n-11) to n (most recent 12 months)
```

**Rolling Data Adjustment:**
```
RC_data_adj = Σ(DA_i) for i = (n-11) to n
```

**Rolling Baseline Adjustment Input:**
```
RC_baseline_adj = Σ(BA_input_i) for i = (n-11) to n
```

### Adjustment Ratio

The adjustment ratio accounts for changes in operating conditions:

```
R_adj = ((RC_modeled - DA_modelyear) / (RB_modeled - DA_modelyear)) × (RC_actual / (RC_actual - RC_data_adj))
```

Where:
- `DA_modelyear` = Total data adjustment for the model year
- First term normalizes for modeled energy changes
- Second term adjusts for data quality issues

**Example:**
```
RC_modeled = 120,000 MMBtu
RB_modeled = 100,000 MMBtu
DA_modelyear = 2,000 MMBtu
RC_actual = 95,000 MMBtu
RC_data_adj = 1,000 MMBtu

R_adj = ((120,000 - 2,000) / (100,000 - 2,000)) × (95,000 / (95,000 - 1,000))
R_adj = (118,000 / 98,000) × (95,000 / 94,000)
R_adj = 1.204 × 1.011
R_adj = 1.217
```

### Rolling Adjusted Baseline

```
RC_adjusted = (RB_actual + RC_baseline_adj) × R_adj
```

This represents what energy use would have been if operating at baseline efficiency under current conditions.

**Example (continuing above):**
```
RB_actual = 100,000 MMBtu
RC_baseline_adj = 3,000 MMBtu
R_adj = 1.217

RC_adjusted = (100,000 + 3,000) × 1.217
RC_adjusted = 103,000 × 1.217
RC_adjusted = 125,351 MMBtu
```

### Rolling Savings

**Without Banking:**
```
RC_savings = RC_adjusted - RC_actual
```

**With Banking:**
```
RC_savings_unbanked = RC_adjusted - RC_actual
RC_savings_banked = Savings preserved from previous banking period
RC_savings_total = (1 + I_banked) × RC_adjusted - RC_actual
```

Where `I_banked` is the improvement percentage at the time of banking.

**Example (without banking):**
```
RC_adjusted = 125,351 MMBtu
RC_actual = 95,000 MMBtu

RC_savings = 125,351 - 95,000 = 30,351 MMBtu
```

### Rolling 12-Month Improvement

```
I_12month = RC_savings / RC_adjusted
```

**Example:**
```
I_12month = 30,351 / 125,351 = 0.242 = 24.2%
```

### Monthly Values from Rolling Calculations

To get monthly savings from rolling 12-month values:

**Monthly Savings:**
```
S_month = RC_savings - Σ(S_i) for previous 11 months
```

**Monthly Adjusted Baseline:**
```
A_month = RC_adjusted - Σ(A_i) for previous 11 months
```

**Monthly Baseline Adjustment for Normalization:**
```
BA_norm_rolling = (RB_actual × R_adj) - RB_actual
BA_norm_month = BA_norm_rolling - Σ(BA_norm_i) for previous 11 months
```

**Monthly Baseline Adjustment for Operational Changes:**
```
BA_other_rolling = RC_baseline_adj × R_adj
BA_other_month = BA_other_rolling - Σ(BA_other_i) for previous 11 months
```

**Total Monthly Baseline Adjustment:**
```
BA_total = BA_norm_month + BA_other_month
```

## SEnPI Calculation

The Superior Energy Performance Indicator (SEnPI) measures current performance against adjusted baseline:

```
SEnPI = E / A
```

Where:
- `E` = Actual energy use for the period
- `A` = Adjusted baseline energy for the period

An SEnPI of:
- 1.0 = Performance equal to baseline
- < 1.0 = Better than baseline (improvement)
- > 1.0 = Worse than baseline (degradation)

**Example:**
```
E_month = 8,200 MMBtu (actual)
A_month = 10,000 MMBtu (adjusted baseline)

SEnPI = 8,200 / 10,000 = 0.82

This indicates 18% improvement (1.0 - 0.82 = 0.18)
```

## Annual Aggregation

Annual values are calculated by summing monthly values for the fiscal year:

```
E_year = Σ(E_i) for all months in fiscal year
A_year = Σ(A_i) for all months in fiscal year
S_year = Σ(S_i) for all months in fiscal year
```

### Annual SEnPI
```
SEnPI_year = E_year / A_year
```

### Total Savings Percent Improvement
```
I_total = S_year / A_year
```

### Annual Savings Percent Improvement
```
I_annual = I_total_current - I_total_previous
```

This is the year-over-year change in improvement percentage.

### Cumulative Savings
```
S_cumulative = Σ(S_i) for all years from baseline to current
```

### New Savings
```
S_new = S_current_year - S_previous_year
```

## Facility-Level Aggregation

Facilities may contain multiple analysis groups. To aggregate groups to facility level:

```
E_facility = Σ(E_group_i) for all groups in facility
A_facility = Σ(A_group_i) for all groups in facility
S_facility = Σ(S_group_i) for all groups in facility
```

The facility-level SEnPI is then:
```
SEnPI_facility = E_facility / A_facility
```

## Account-Level Aggregation

Accounts contain multiple facilities. To aggregate facilities to account level:

```
E_account = Σ(E_facility_i) for all facilities in account
A_account = Σ(A_facility_i) for all facilities in account
S_account = Σ(S_facility_i) for all facilities in account
```

The account-level SEnPI is:
```
SEnPI_account = E_account / A_account
```

## Banking Mechanism

Banking preserves achieved energy savings when advancing the baseline year forward in time.

### When Banking Occurs
- A new baseline year is selected
- The analysis group is configured to apply banking
- The banked analysis year is the last year of the previous baseline period

### Banking Calculations

**Banked Improvement:**
```
I_banked = Savings improvement percentage at banking year
```

This improvement is "banked" and added to future adjusted baselines:

**Future Adjusted Baseline with Banking:**
```
A_with_banking = (1 + I_banked) × A_without_banking
```

**Savings Components:**
```
S_unbanked = Savings achieved since new baseline
S_banked = Additional savings credit from banked improvement
S_total = S_unbanked + S_banked
```

### Example Banking Scenario

Original baseline: 2020
- 2020 energy: 100,000 MMBtu
- 2023 energy: 90,000 MMBtu  
- 2023 adjusted: 105,000 MMBtu
- 2023 savings: 15,000 MMBtu (14.3% improvement)

Banking applied in 2024 with new baseline year 2021:
- 2021 becomes new baseline
- 14.3% improvement is banked
- 2025 adjusted baseline = Base calculation × 1.143
- 2025 savings include both new improvements and banked credit

## Fiscal Year Handling

VERIFI supports both calendar years and custom fiscal years:

**Calendar Year:** January 1 - December 31

**Custom Fiscal Year Options:**
- `fiscalYearMonth`: Starting month (0-11, where 0=January)
- `fiscalYearCalendarEnd`: 
  - `true`: Fiscal year ends in calendar year (e.g., Oct 2023 - Sep 2024 is FY 2024)
  - `false`: Fiscal year starts in calendar year (e.g., Oct 2023 - Sep 2024 is FY 2023)

All monthly and annual calculations respect the configured fiscal year boundaries.

## Key Insights

1. **Rolling 12-month calculations** provide stable, seasonally-adjusted metrics
2. **Adjustment ratio** normalizes baseline for current operating conditions
3. **Monthly decomposition** allows tracking of month-to-month performance
4. **Hierarchical aggregation** maintains consistency from meter to account level
5. **Banking mechanism** prevents "double counting" of savings when baseline shifts
6. **Multiple analysis types** accommodate different facility characteristics and data availability

## Data Requirements

For accurate calculations:
- At least 13 months of data (12 months baseline + 1 month for rolling calculations)
- Consistent meter data coverage
- Predictor data aligned with meter data periods
- Proper classification of meters into analysis groups
- Accurate regression coefficients (for regression analysis type)
- Appropriate baseline year selection
