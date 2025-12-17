# Savings Report Calculations

## Overview

The savings report calculations module generates detailed reports of energy and cost savings achieved through efficiency improvements, operational changes, and other conservation measures. These reports can be generated at both facility and account levels.

## Core Concepts

### Energy Savings
```
Savings = Baseline_energy - Actual_energy
```

However, to account for changes in production, weather, and other factors:
```
Savings = Adjusted_baseline_energy - Actual_energy
```

The adjusted baseline represents what energy would have been consumed at baseline efficiency under current operating conditions.

### Cost Savings
```
Cost_savings = Savings × Unit_cost
```

Or more precisely:
```
Cost_savings = (Adjusted_baseline_cost) - Actual_cost
```

## Facility Savings Report

### Facility Savings Reports

VERIFI generates comprehensive savings reports for individual facilities.

**Key Components:**
- Monthly savings breakdown
- Annual savings totals
- Cumulative savings over time
- Savings by analysis group
- Cost avoidance calculations

### Monthly Savings Calculation

From the analysis calculations (see analysis-calculations.md):

```
Monthly_savings = Monthly_adjusted_baseline - Monthly_actual_energy
```

**Components:**
```
Adjusted_baseline = Baseline_energy × Adjustment_ratio
Adjustment_ratio = (Modeled_current / Modeled_baseline) × Data_quality_adjustment
```

**Example:**
```
Month: January 2024
Baseline energy (Jan 2020): 1,000 MMBtu
Actual energy (Jan 2024): 850 MMBtu
Adjustment ratio: 1.15 (15% increase in production/activity)

Adjusted baseline: 1,000 × 1.15 = 1,150 MMBtu
Savings: 1,150 - 850 = 300 MMBtu (26% improvement)
```

### Annual Savings

Sum of monthly savings for the fiscal year:

```
Annual_savings = Σ(Monthly_savings_i) for i = 1 to 12
```

**Percent Improvement:**
```
Annual_improvement = (Annual_savings / Annual_adjusted_baseline) × 100%
```

**Example:**
```
Annual adjusted baseline: 12,000 MMBtu
Annual actual energy: 10,200 MMBtu
Annual savings: 1,800 MMBtu
Improvement: (1,800 / 12,000) × 100% = 15%
```

### Cumulative Savings

Total savings achieved from baseline year through current year:

```
Cumulative_savings = Σ(Annual_savings_i) for all years since baseline
```

**Example:**
```
Baseline year: 2020
2021 savings: 500 MMBtu
2022 savings: 800 MMBtu
2023 savings: 1,200 MMBtu
2024 savings: 1,500 MMBtu (partial year)

Cumulative: 500 + 800 + 1,200 + 1,500 = 4,000 MMBtu total saved
```

### Savings by Group

For facilities with multiple analysis groups:

```
For each group:
    Group_savings = Group_adjusted_baseline - Group_actual
    Group_percent = (Group_savings / Group_adjusted_baseline) × 100%
```

**Example:**
```
Facility with 3 groups:

Production Area:
- Adjusted baseline: 8,000 MMBtu
- Actual: 6,800 MMBtu
- Savings: 1,200 MMBtu (15%)

HVAC:
- Adjusted baseline: 2,000 MMBtu
- Actual: 1,700 MMBtu
- Savings: 300 MMBtu (15%)

Lighting:
- Adjusted baseline: 1,000 MMBtu
- Actual: 900 MMBtu
- Savings: 100 MMBtu (10%)

Total facility:
- Adjusted baseline: 11,000 MMBtu
- Actual: 9,400 MMBtu
- Savings: 1,600 MMBtu (14.5%)
```

## Account Savings Report

### Account Savings Reports

Account-level savings reports aggregate savings across all facilities in an account.

### Facility-Level Aggregation

```
For each facility in account:
    Calculate facility_savings
    Sum to account_total_savings
```

**Account Totals:**
```
Account_savings = Σ(Facility_savings_i) for all facilities
Account_adjusted_baseline = Σ(Facility_adjusted_baseline_i)
Account_improvement = (Account_savings / Account_adjusted_baseline) × 100%
```

### Facility Comparison

Rank facilities by savings or improvement percentage:

**By Absolute Savings:**
```
Sort facilities by savings descending
```

**By Percent Improvement:**
```
Sort facilities by improvement_percent descending
```

**Example:**
```
Facility A: 2,000 MMBtu saved, 20% improvement
Facility B: 1,500 MMBtu saved, 18% improvement
Facility C: 800 MMBtu saved, 25% improvement

By absolute savings:
1. Facility A (2,000 MMBtu)
2. Facility B (1,500 MMBtu)
3. Facility C (800 MMBtu)

By percent improvement:
1. Facility C (25%)
2. Facility A (20%)
3. Facility B (18%)
```

### Portfolio Performance

Overall account performance metrics:

**Total Savings:**
```
Total_account_savings = Σ(All facility savings)
```

**Weighted Average Improvement:**
```
Avg_improvement = (Total_savings / Total_adjusted_baseline) × 100%
```

This differs from arithmetic average of facility improvements.

## Cost Savings Calculations

### Energy Cost Savings

**Basic Calculation:**
```
Energy_cost_savings = Energy_savings × Average_unit_cost
```

**More Accurate Calculation:**

Account for different costs for different fuels:

```
For each fuel type:
    Fuel_cost_savings = Fuel_energy_savings × Fuel_unit_cost
Total_cost_savings = Σ(Fuel_cost_savings)
```

**Example:**
```
Energy savings breakdown:
- Electricity: 300 MMBtu saved at $30/MMBtu = $9,000
- Natural gas: 500 MMBtu saved at $10/MMBtu = $5,000
Total cost savings: $14,000

Note: Cannot simply use 800 MMBtu × average cost
```

### Demand Cost Savings

For electricity with demand charges:

**Peak Demand Reduction:**
```
Demand_savings = Baseline_peak_kW - Current_peak_kW
Demand_cost_savings = Demand_savings × Demand_rate
```

**Example:**
```
Baseline peak demand: 1,000 kW
Current peak demand: 900 kW
Demand reduction: 100 kW
Demand rate: $15/kW/month
Annual demand cost savings: 100 kW × $15/kW × 12 = $18,000/year
```

### Avoided Cost Escalation

If utility rates increase:

```
Avoided_cost = Baseline_usage × (New_rate - Old_rate)
```

**Example:**
```
Baseline energy: 10,000 MMBtu
Old rate: $10/MMBtu
New rate: $12/MMBtu
Rate increase: $2/MMBtu

If no savings achieved:
Additional cost = 10,000 × $2 = $20,000 more per year

With 15% savings (using 8,500 MMBtu instead):
Actual additional cost = 8,500 × $2 = $17,000
Avoided cost escalation = $20,000 - $17,000 = $3,000
```

## Common Savings Report Features

### Shared Report Elements

Both facility and account savings reports include:

**Data Formatting:**
- Numbers formatted with appropriate precision
- Unit conversions applied as needed
- Tables and charts generated for visualization

**Data Aggregation:**
- Monthly data summed to annual totals
- Facility data summed to account totals
- Weighted averages calculated when appropriate

**Comparison Capabilities:**
- Year-over-year comparisons
- Baseline vs. current comparisons
- Budget vs. actual comparisons

## Savings Persistence Analysis

### Year-over-Year Savings Trends

Track whether savings are maintained:

```
For each year:
    Year_savings = Annual_savings for that year
    Trend = Change from previous year
```

**Example:**
```
2021: 500 MMBtu saved
2022: 800 MMBtu saved (+300, +60% improvement in savings)
2023: 750 MMBtu saved (-50, -6% decline in savings)
2024: 900 MMBtu saved (+150, +20% improvement in savings)

Trend: Generally increasing, with one year decline
```

### Savings Degradation

If savings decline over time:

```
Degradation = (Peak_savings - Current_savings) / Peak_savings × 100%
```

**Example:**
```
Peak savings (2022): 1,000 MMBtu
Current savings (2024): 850 MMBtu
Degradation: (1,000 - 850) / 1,000 × 100% = 15%

Possible causes:
- Equipment performance decline
- Process changes
- Increased production
- Baseline adjustment needed
```

## New Savings vs. Persistent Savings

**New Savings:**

Savings achieved in current year that are above previous year:
```
New_savings = Current_year_savings - Previous_year_savings (if positive)
```

**Persistent Savings:**

Savings that continue from previous years:
```
Persistent_savings = MIN(Current_year_savings, Previous_year_savings)
```

**Example:**
```
2023 savings: 800 MMBtu
2024 savings: 1,000 MMBtu

New savings (2024): 1,000 - 800 = 200 MMBtu
Persistent savings (2024): 800 MMBtu

Interpretation: Maintained previous savings plus achieved 200 MMBtu more
```

## Savings Attribution

### By Measure Type

If savings projects are tracked:

```
For each measure:
    Measure_savings = Calculated or measured savings
Total_attributed = Σ(Measure_savings)
Unattributed = Total_savings - Total_attributed
```

**Example:**
```
Total facility savings: 1,500 MMBtu

Attributed savings:
- LED lighting upgrade: 200 MMBtu
- VFD installation: 300 MMBtu
- Process optimization: 400 MMBtu
- Boiler replacement: 250 MMBtu
Subtotal: 1,150 MMBtu

Unattributed savings: 1,500 - 1,150 = 350 MMBtu
(Could be behavioral, weather, or other factors)
```

### By Category

Group savings by category:

```
Categories:
- Equipment upgrades
- Process improvements
- Behavioral changes
- Operational optimization
- Control system improvements
```

## Savings Uncertainty

### Sources of Uncertainty

1. **Measurement error:** ±2-5% typical
2. **Model error:** ±5-10% for regression models
3. **Baseline uncertainty:** Depends on data quality
4. **Weather normalization:** ±3-5%

**Total Uncertainty:**

For independent error sources:
```
Total_uncertainty = √(Error₁² + Error₂² + Error₃² + ...)
```

**Example:**
```
Measurement error: ±3%
Model error: ±7%
Weather normalization: ±4%

Total: √(3² + 7² + 4²) = √(9 + 49 + 16) = √74 ≈ ±8.6%

Savings: 1,000 MMBtu ± 8.6% = 1,000 ± 86 MMBtu
Range: 914 to 1,086 MMBtu with ~95% confidence
```

### Confidence Levels

**Conservative Reporting:**

Report lower bound of uncertainty range:
```
Conservative_savings = Calculated_savings × (1 - Uncertainty_factor)
```

**Example:**
```
Calculated savings: 1,000 MMBtu
Uncertainty: ±10%
Conservative savings: 1,000 × (1 - 0.10) = 900 MMBtu
```

## Report Formats

### Executive Summary

High-level overview:
- Total energy savings
- Total cost savings
- Percent improvement
- Cumulative savings
- Key accomplishments

### Detailed Monthly Report

Month-by-month breakdown:
- Monthly energy use (actual)
- Monthly adjusted baseline
- Monthly savings
- Monthly savings percent
- Running total savings

### Annual Summary

Year-by-year progression:
- Annual totals
- Year-over-year comparison
- Trend analysis
- Goal progress

### Facility Comparison Report

For accounts with multiple facilities:
- Facility rankings
- Performance metrics
- Best practice identification
- Improvement opportunities

## Savings Verification

### Measurement and Verification (M&V)

**IPMVP Options:**

**Option A - Retrofit Isolation (Key Parameter):**
```
Savings = (Baseline_parameter - Current_parameter) × Operating_hours
```

**Option B - Retrofit Isolation (All Parameters):**
```
Savings = Baseline_energy - Current_energy
(With continuous measurement)
```

**Option C - Whole Facility:**
```
Savings = Adjusted_baseline - Actual_metered
(VERIFI's primary approach)
```

**Option D - Calibrated Simulation:**
```
Savings from energy modeling software
```

### Baseline Adjustments

When to adjust baseline:

1. **Facility changes:** Expansions, closures, major equipment
2. **Production changes:** >10-15% change in output
3. **Occupancy changes:** Significant changes in operating hours
4. **Process changes:** Major operational modifications

**Adjustment Process:**
```
New_adjusted_baseline = Original_baseline × Adjustment_factor
```

**Example:**
```
Original baseline: 10,000 MMBtu
Production increase: +25%
Adjustment factor: 1.20 (determined by regression)

New adjusted baseline: 10,000 × 1.20 = 12,000 MMBtu

This prevents penalizing facility for increased production
```

## Key Insights

1. **Adjusted baseline:** Critical for fair comparison when conditions change
2. **Multiple perspectives:** View savings by time, facility, group, or measure
3. **Cost savings:** Often more compelling than energy savings for stakeholders
4. **Persistence tracking:** Ensures savings are maintained over time
5. **Attribution:** Connects savings to specific projects where possible
6. **Uncertainty:** Acknowledge and quantify to ensure credible reporting
7. **Cumulative view:** Shows total value of efficiency program
8. **Verification:** Independent verification increases credibility

## Report Use Cases

1. **Internal management reporting:** Track progress toward goals
2. **Executive briefings:** High-level performance summaries
3. **Regulatory reporting:** Demonstrate compliance with mandates
4. **Incentive programs:** Document savings for utility rebates
5. **Investor relations:** Show corporate sustainability performance
6. **Energy team performance:** Measure effectiveness of initiatives

Savings reports transform raw energy data into actionable insights and compelling narratives about efficiency achievements.
