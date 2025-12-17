# Performance Report Calculations

## Overview

The performance report calculations module generates comprehensive reports that combine multiple aspects of facility and account performance into unified summaries. These reports integrate energy, water, cost, emissions, and operational metrics to provide a holistic view of organizational performance.

## Performance Reports

VERIFI generates comprehensive performance reports that combine multiple aspects of facility and account performance.

**Key Components:**
- Energy and water performance metrics
- Cost performance and trends
- Emissions tracking
- Efficiency indicators
- Year-over-year comparisons
- Goal progress tracking
- Multi-year trend analysis

## Report Structure

### Executive Summary

High-level overview of key performance indicators:

**Summary Includes:**
- Report period
- Total energy use (MMBtu)
- Total cost ($)
- Total emissions (metric tons CO₂e)
- Overall improvement percentage
- Progress toward goals

**Example Summary:**
- Report Period: FY 2024
- Total Energy Use: 125,000 MMBtu
- Total Cost: $1,500,000
- Total Emissions: 8,500 metric tons CO₂e
- Overall Improvement: 15.2%
- Goal Progress:
  - 25% energy intensity reduction: 60.8% complete
  - 20% GHG reduction: 76.0% complete

### Detailed Sections

1. **Energy Performance**
   - Total energy consumption
   - Energy by source
   - Energy intensity trends
   - Comparison to baseline
   - Savings achieved

2. **Cost Performance**
   - Total costs
   - Cost trends
   - Unit costs by fuel type
   - Cost savings
   - Budget variance

3. **Emissions Performance**
   - Total GHG emissions
   - Emissions by scope
   - Emissions intensity
   - Year-over-year changes
   - Renewable energy impact

4. **Operational Metrics**
   - Production levels
   - Weather data (if applicable)
   - Operating hours
   - Facility changes

5. **Goal Progress**
   - Progress toward energy goals
   - Progress toward emissions goals
   - Timeline for achievement
   - Recommended actions

## Energy Performance Metrics

### Total Energy Use

Aggregate across all sources:

```
Total_energy = Σ(Source_energy_i) for all energy sources
```

**By Source:**
```
{
    electricity: MMBtu,
    naturalGas: MMBtu,
    fuelOil: MMBtu,
    steam: MMBtu,
    other: MMBtu
}
```

### Energy Intensity

**Current Period:**
```
Energy_intensity = Total_energy / Production
```

**Baseline Comparison:**
```
Baseline_intensity = Baseline_energy / Baseline_production
Intensity_change = ((Current - Baseline) / Baseline) × 100%
```

**Example:**
```
Current year:
- Energy: 125,000 MMBtu
- Production: 625,000 units
- Intensity: 0.20 MMBtu/unit

Baseline year:
- Energy: 130,000 MMBtu
- Production: 550,000 units
- Intensity: 0.236 MMBtu/unit

Change: ((0.20 - 0.236) / 0.236) × 100% = -15.3% (improvement)
```

### Energy Savings

From analysis calculations (see analysis-calculations.md):

```
Energy_savings = Adjusted_baseline - Actual_energy
Percent_savings = (Energy_savings / Adjusted_baseline) × 100%
```

**Cumulative Savings:**
```
Cumulative = Σ(Annual_savings_i) from baseline to current
```

## Cost Performance Metrics

### Total Cost

Sum of all utility costs:

```
Total_cost = Energy_cost + Demand_cost + Other_charges
```

**By Utility:**
```
For each utility type:
    Utility_cost = Σ(meter_cost_i) for meters of that type
```

### Unit Costs

**Average Cost per Energy Unit:**
```
Unit_cost = Total_cost / Total_energy
```

**By Source:**
```
Electricity_rate = Electricity_cost / Electricity_kWh
Gas_rate = Gas_cost / Gas_MMBtu
```

**Example:**
```
Electricity:
- Use: 10,000 MWh
- Cost: $850,000
- Rate: $85/MWh or $0.085/kWh

Natural Gas:
- Use: 50,000 MMBtu
- Cost: $500,000
- Rate: $10/MMBtu
```

### Cost Trends

**Year-over-Year:**
```
Cost_change = ((Current - Previous) / Previous) × 100%
```

**Multi-Year Average:**
```
Avg_annual_change = ((Current - Baseline) / Years) / Baseline × 100%
```

**Cost Savings:**
```
Cost_savings = (Adjusted_baseline_cost) - Actual_cost
```

**Example:**
```
Current cost: $1,500,000
Previous year: $1,650,000
Change: ($1,500,000 - $1,650,000) / $1,650,000 = -9.1%

Energy savings of 15% contributed to cost reduction
Additional savings from rate decreases or demand management
```

## Emissions Performance Metrics

### Total Emissions

From emissions calculations (see emissions-calculations.md):

```
Total_emissions = Scope1 + Scope2
```

**By Scope:**
```
{
    scope1: metric tons CO₂e,
    scope2LocationBased: metric tons CO₂e,
    scope2MarketBased: metric tons CO₂e,
    biogenic: metric tons CO₂ (reported separately)
}
```

### Emissions Intensity

```
Emissions_intensity = Total_emissions / Production
```

**Units:** metric tons CO₂e per unit of production

**Baseline Comparison:**
```
Intensity_reduction = ((Baseline - Current) / Baseline) × 100%
```

**Example:**
```
Current: 8,500 tCO₂e / 625,000 units = 0.0136 tCO₂e/unit
Baseline: 10,200 tCO₂e / 550,000 units = 0.0185 tCO₂e/unit

Reduction: ((0.0185 - 0.0136) / 0.0185) × 100% = 26.5%
```

### Emissions by Source

```
{
    electricity: tCO₂e and %,
    naturalGas: tCO₂e and %,
    transportation: tCO₂e and %,
    other: tCO₂e and %
}
```

## Operational Metrics

### Production Data

```
{
    currentProduction: units,
    baselineProduction: units,
    change: percentage,
    productionType: string (e.g., "tons manufactured")
}
```

### Weather Data

If weather-normalized:

```
{
    heatingDegreeDays: {current: HDD, normal: HDD},
    coolingDegreeDays: {current: CDD, normal: CDD},
    weatherImpact: estimated energy impact
}
```

**Weather Impact Estimation:**
```
Weather_impact = (Actual_HDD - Normal_HDD) × HDD_coefficient
```

### Operational Changes

Document significant changes:
- Facility expansions or closures
- Major equipment installations
- Process modifications
- Operating schedule changes
- Product mix changes

## Multi-Year Trend Analysis

### Annual Time Series

Track key metrics over multiple years:

```
Years: [2020, 2021, 2022, 2023, 2024]
Energy: [130000, 128000, 127000, 126000, 125000] (MMBtu)
Cost: [1560000, 1600000, 1575000, 1525000, 1500000] ($)
Emissions: [10200, 9800, 9300, 8900, 8500] (tCO₂e)
Intensity: [0.236, 0.225, 0.215, 0.205, 0.200] (MMBtu/unit)
```

### Trend Lines

**Linear Regression:**
```
y = mx + b

Where:
y = metric value
x = year number (0, 1, 2, ...)
m = slope (annual change rate)
b = y-intercept
```

**Calculate slope:**
```
m = (n×Σ(xy) - Σx×Σy) / (n×Σ(x²) - (Σx)²)
```

**Example:**
```
Energy intensity trend:
Year 0 (2020): 0.236
Year 1 (2021): 0.225
Year 2 (2022): 0.215
Year 3 (2023): 0.205
Year 4 (2024): 0.200

Slope: -0.009 MMBtu/unit per year
Interpretation: Reducing intensity by 0.009 MMBtu/unit annually
At this rate, 25% reduction achieved in 6-7 years from baseline
```

### Forecast

Project future performance:

```
Future_value = Current_value + (Trend_slope × Years_ahead)
```

**Example:**
```
Current intensity (2024): 0.200 MMBtu/unit
Trend slope: -0.009 MMBtu/unit per year
Forecast for 2026: 0.200 + (-0.009 × 2) = 0.182 MMBtu/unit
```

## Goal Progress Tracking

### Energy Goal

**Progress Calculation:**
```
Progress = (Current_improvement / Target_improvement) × 100%
```

**Example:**
```
Target: 25% energy intensity reduction
Current: 15.3% achieved
Progress: (15.3 / 25) × 100% = 61.2%
```

### Emissions Goal

**Progress Calculation:**
```
Progress = (Current_reduction / Target_reduction) × 100%
```

**Example:**
```
Target: 20% emissions reduction
Current: 16.7% achieved
Progress: (16.7 / 20) × 100% = 83.5%
```

### Timeline to Goal

```
Years_remaining = (Target - Current) / Annual_improvement_rate
```

**Example:**
```
Target: 25% improvement
Current: 15.3%
Remaining: 9.7 percentage points
Recent annual rate: 3.2% per year

Years to goal: 9.7 / 3.2 ≈ 3 years
Estimated achievement: 2027
```

## Performance Benchmarks

### Internal Benchmarking

Compare facilities within organization:

```
For each facility:
    Calculate performance metrics
Rank facilities by:
    - Energy intensity
    - Cost per unit
    - Emissions intensity
    - Improvement rate
```

**Example:**
```
Facility rankings by energy intensity:
1. Facility C: 0.15 MMBtu/unit (best)
2. Facility A: 0.20 MMBtu/unit
3. Facility B: 0.28 MMBtu/unit (needs improvement)

Benchmarking insight:
If Facility B matched Facility A's intensity:
Current: 15,000 MMBtu (at 0.28)
Potential: 10,714 MMBtu (at 0.20)
Savings opportunity: 4,286 MMBtu (29%)
```

### External Benchmarking

Compare to industry averages (if available):

```
{
    facilityIntensity: 0.20 MMBtu/unit,
    industryAverage: 0.25 MMBtu/unit,
    industryBest: 0.15 MMBtu/unit,
    percentile: 75th (better than 75% of industry)
}
```

## Key Performance Indicators (KPIs)

### Primary KPIs

1. **Energy Intensity:** MMBtu per unit production
2. **Emissions Intensity:** tCO₂e per unit production
3. **Cost per Unit:** $ per unit production
4. **Percent Improvement:** % reduction from baseline
5. **Goal Progress:** % of goal achieved

### Secondary KPIs

1. **Energy Cost per MMBtu:** $/MMBtu
2. **Renewable Energy Share:** % of total energy
3. **Demand Reduction:** kW reduced from peak
4. **Load Factor:** Average/peak ratio
5. **Water Intensity:** Gallons per unit (if applicable)

## Report Visualizations

### Charts and Graphs

**Time Series:**
- Line chart of energy use over time
- Stacked area chart of energy by source
- Emissions trend line

**Comparisons:**
- Bar chart of year-over-year changes
- Waterfall chart showing savings components
- Pie chart of energy/emissions by source

**Progress:**
- Gauge chart for goal progress
- Bullet chart showing actual vs. target
- Milestone timeline

**Benchmarking:**
- Horizontal bar chart of facility rankings
- Box plot showing facility distribution
- Scatter plot of intensity vs. improvement

## Report Customization

### Time Periods

Reports can be generated for:
- Monthly
- Quarterly
- Annual (fiscal or calendar year)
- Custom date ranges
- Multi-year summary

### Metrics Selection

Users can include/exclude:
- Specific energy sources
- Scope 1 and/or Scope 2 emissions
- Cost breakdowns
- Operational metrics
- Weather data

### Comparison Periods

Compare to:
- Previous period
- Same period last year
- Baseline year
- Custom comparison period

## Data Quality Indicators

Report includes data quality metrics:

```
{
    dataCompleteness: percentage,
    estimatedBills: count,
    missingMonths: array,
    dataQualityScore: rating (A-F)
}
```

**Example:**
```
Data Completeness: 98% (355 of 365 days)
Estimated Bills: 2 of 36 bills
Missing Months: None
Data Quality Score: A
```

## Recommended Actions

Based on performance analysis:

```
recommendations: [
    {
        category: "Energy Efficiency",
        priority: "High",
        description: "Replace aging HVAC units",
        estimatedSavings: "500 MMBtu/year",
        estimatedCost: "$50,000",
        payback: "2.5 years"
    },
    {
        category: "Renewable Energy",
        priority: "Medium",
        description: "Install solar PV system",
        estimatedSavings: "200 tCO₂e/year",
        estimatedCost: "$150,000",
        payback: "8 years"
    }
]
```

## Executive Summary Template

**Performance Highlights:**
- Total energy use and change
- Total cost and change
- Emissions and change
- Key achievements

**Progress Toward Goals:**
- Current progress percentages
- Timeline to goal achievement
- Recent improvement rate

**Areas of Excellence:**
- Metrics exceeding targets
- Best-performing facilities
- Notable improvements

**Opportunities:**
- Underperforming areas
- Recommended focus areas
- Potential savings

## Key Insights

1. **Holistic view:** Combines energy, cost, emissions, and operations
2. **Trend analysis:** Multi-year patterns reveal progress
3. **Goal tracking:** Clear progress toward commitments
4. **Actionable:** Identifies specific opportunities
5. **Benchmarking:** Internal and external comparisons
6. **Visual:** Charts and graphs communicate effectively
7. **Customizable:** Tailored to specific needs and audiences
8. **Data-driven:** Transparent about data quality

Performance reports synthesize complex data into clear, actionable intelligence for decision-makers at all levels of the organization.
