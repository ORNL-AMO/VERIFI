# Dashboard Calculations

## Overview

The dashboard calculations module provides summary metrics and visualizations for account and facility overview pages. These calculations aggregate data across different time periods and utility types to give users a quick understanding of their energy and water usage, costs, and trends.

## Account Overview Calculations

### AccountOverviewClass

Provides high-level summary for an entire account across all facilities.

**Key Metrics:**
- Total energy use
- Total cost
- Energy by source (electricity, natural gas, etc.)
- Month-over-month comparisons
- Year-over-year comparisons
- Facility breakdowns

### Total Energy and Cost

**Annual Totals:**
```
Total_energy = Σ(facility_energy_i) for all facilities
Total_cost = Σ(facility_cost_i) for all facilities
```

**Monthly Totals:**
```
Monthly_energy = Σ(meter_energy_i) for all meters in month
Monthly_cost = Σ(meter_cost_i) for all meters in month
```

**Example:**
```
Account with 3 facilities:
Facility A: 10,000 MMBtu, $120,000
Facility B: 8,000 MMBtu, $95,000
Facility C: 5,000 MMBtu, $60,000

Total: 23,000 MMBtu, $275,000
Average cost: $275,000 / 23,000 = $11.96/MMBtu
```

### Energy by Source

Breakdown of energy consumption by utility type:

```
{
    electricity: {energy: MMBtu, cost: $, percent: %},
    naturalGas: {energy: MMBtu, cost: $, percent: %},
    fuelOil: {energy: MMBtu, cost: $, percent: %},
    other: {energy: MMBtu, cost: $, percent: %}
}
```

**Percentage Calculation:**
```
Percent_source = (Energy_source / Total_energy) × 100%
```

**Example:**
```
Total energy: 20,000 MMBtu
Electricity: 12,000 MMBtu → 60%
Natural Gas: 6,000 MMBtu → 30%
Fuel Oil: 2,000 MMBtu → 10%
```

### Time Period Comparisons

**Month-over-Month:**
```
MoM_change = ((Current_month - Previous_month) / Previous_month) × 100%
```

**Year-over-Year (Same Month):**
```
YoY_change = ((Current_year_month - Previous_year_month) / Previous_year_month) × 100%
```

**Example:**
```
Current month (Oct 2023): 2,000 MMBtu
Previous month (Sep 2023): 1,800 MMBtu
Same month last year (Oct 2022): 2,100 MMBtu

MoM: (2,000 - 1,800) / 1,800 × 100% = +11.1%
YoY: (2,000 - 2,100) / 2,100 × 100% = -4.8%
```

### Trailing 12-Month Totals

Rolling 12-month sum for trend analysis:

```
T12M_energy = Σ(monthly_energy_i) for last 12 months
T12M_cost = Σ(monthly_cost_i) for last 12 months
```

**Comparison to Previous 12 Months:**
```
T12M_change = ((Current_T12M - Previous_T12M) / Previous_T12M) × 100%
```

**Example:**
```
Last 12 months (Nov 2022 - Oct 2023): 25,000 MMBtu
Previous 12 months (Nov 2021 - Oct 2022): 26,500 MMBtu

Change: (25,000 - 26,500) / 26,500 × 100% = -5.7%
```

## Facility Overview Calculations

### FacilityOverviewClass

Similar to account overview but for a single facility.

**Facility-Specific Metrics:**
- Total energy and cost for facility
- Energy by meter or meter group
- Cost breakdown by utility
- Usage patterns and trends
- Comparison to facility baseline (if analysis configured)

### Meter-Level Aggregation

**Total by Meter:**
```
For each meter in facility:
    meter_total_energy = Σ(monthly_data_i.energy)
    meter_total_cost = Σ(monthly_data_i.cost)
```

**Top Consumers:**

Identify largest energy-consuming meters:
```
Sort meters by total_energy descending
Top_N_meters = first N meters from sorted list
```

**Example:**
```
Meter ranking:
1. Production Line 1: 8,000 MMBtu (40%)
2. HVAC System: 5,000 MMBtu (25%)
3. Compressed Air: 3,000 MMBtu (15%)
4. Lighting: 2,000 MMBtu (10%)
5. Other meters: 2,000 MMBtu (10%)
Total: 20,000 MMBtu
```

## Use and Cost Calculations

### UseAndCostClass

Detailed breakdown of usage and cost metrics.

**Structure:**
```
{
    energyUse: number,
    energyCost: number,
    energyUnit: string,
    demandUsage: number,
    demandCost: number,
    totalVolume: number,
    volumeUnit: string,
    totalCost: number,
    marketElectricityEmissions: number,
    locationElectricityEmissions: number
}
```

### Cost Components

**Energy Cost:**
```
Energy_cost = Σ(meter_energy_cost_i)
```

**Demand Cost:**

For electric meters with demand charges:
```
Demand_cost = Σ(meter_demand_cost_i)
```

**Total Cost:**
```
Total_cost = Energy_cost + Demand_cost + Other_charges
```

**Cost per Unit:**
```
Unit_cost = Total_cost / Total_energy
```

**Example:**
```
Electric meter:
- Energy use: 100,000 kWh
- Energy charge: $8,000 ($0.08/kWh)
- Demand: 500 kW
- Demand charge: $2,500 ($5/kW)
- Facilities charge: $100
- Total cost: $10,600
- Effective rate: $10,600 / 100,000 kWh = $0.106/kWh
```

### Emissions Integration

Dashboard includes emissions data from emissions calculations:

```
Total_emissions = Σ(meter_emissions_i)
Emissions_intensity = Total_emissions / Total_energy
```

## Source Totals Calculations

### SourceTotalsClass

Aggregates metrics by utility source (electricity, natural gas, etc.).

**For Each Source:**

**Total Energy:**
```
Source_energy = Σ(meter_energy_i) for meters of that source
```

**Total Cost:**
```
Source_cost = Σ(meter_cost_i) for meters of that source
```

**Average Cost:**
```
Source_avg_cost = Source_cost / Source_energy
```

**Meter Count:**
```
Source_meter_count = COUNT(meters of that source)
```

**Example - Natural Gas Summary:**
```
Meters: 5
Total energy: 8,000 MMBtu
Total cost: $80,000
Average cost: $10.00/MMBtu
Percentage of total: 35%
```

### Cost Ranking

Rank utility sources by total cost:

```
[
    {source: 'Electricity', cost: $150,000, percent: 55%},
    {source: 'Natural Gas', cost: $80,000, percent: 29%},
    {source: 'Water', cost: $30,000, percent: 11%},
    {source: 'Other', cost: $15,000, percent: 5%}
]
```

## Time-Series Data

### Monthly Time Series

Array of monthly data points for charting:

```
[
    {date: '2023-01', energy: 2000, cost: 24000, emissions: 150},
    {date: '2023-02', energy: 1800, cost: 21600, emissions: 135},
    {date: '2023-03', energy: 1900, cost: 22800, emissions: 142},
    ...
]
```

### Cumulative Metrics

Year-to-date cumulative totals:

```
YTD_energy = Σ(monthly_energy_i) from year start to current
YTD_cost = Σ(monthly_cost_i) from year start to current
```

**Example (as of June):**
```
YTD (Jan-Jun): 12,000 MMBtu, $144,000
Same period last year: 13,000 MMBtu, $156,000
YTD savings: 1,000 MMBtu, $12,000
```

## Utility Rate Analysis

### Average Rates by Period

**Monthly Average Rate:**
```
Monthly_rate = Monthly_cost / Monthly_energy
```

**Annual Average Rate:**
```
Annual_rate = Annual_cost / Annual_energy
```

**Rate Trends:**

Track how rates change over time:
```
Rate_change = ((Current_rate - Previous_rate) / Previous_rate) × 100%
```

**Example:**
```
Electric rates:
Q1 2023: $0.085/kWh
Q2 2023: $0.089/kWh
Q3 2023: $0.091/kWh
Q4 2023: $0.088/kWh

Q2 change: (0.089 - 0.085) / 0.085 = +4.7%
Q3 change: (0.091 - 0.089) / 0.089 = +2.2%
Q4 change: (0.088 - 0.091) / 0.091 = -3.3%
```

## Peak Demand Analysis

### Demand Tracking

For electric meters with demand measurement:

**Monthly Peak:**
```
Monthly_peak = MAX(demand_reading_i) for month
```

**Annual Peak:**
```
Annual_peak = MAX(monthly_peak_i) for year
```

**Demand Charges:**
```
Demand_charges = Peak_demand × Demand_rate
```

**Load Factor:**

Ratio of average to peak load:
```
Load_factor = (Total_kWh / (Peak_kW × Hours_in_period)) × 100%
```

**Example:**
```
Month: 730 hours
Peak demand: 500 kW
Total energy: 300,000 kWh

Maximum possible: 500 kW × 730 hrs = 365,000 kWh
Load factor: (300,000 / 365,000) × 100% = 82.2%

Higher load factor indicates more consistent usage, typically better.
```

## Budget vs. Actual

If budgets are configured:

**Variance:**
```
Variance = Actual - Budget
Variance_percent = (Variance / Budget) × 100%
```

**Example:**
```
Budget: $25,000
Actual: $27,500
Variance: $2,500 over budget
Variance %: (2,500 / 25,000) × 100% = +10%
```

**Cumulative Variance:**
```
YTD_variance = Σ(Monthly_variance_i) for year to date
```

## Weather Normalization for Dashboard

Simple weather adjustment for display:

**Heating Degree Days (HDD):**
```
Weather_adjusted = Actual × (Normal_HDD / Actual_HDD)
```

**Example:**
```
Actual natural gas: 1,000 MMBtu
Actual HDD: 800
Normal HDD: 700

Weather-adjusted: 1,000 × (700 / 800) = 875 MMBtu
```

This provides a rough estimate; detailed analysis uses the analysis calculations module.

## Facility Comparison

Compare multiple facilities:

```
For each facility:
    Calculate total_energy, total_cost, intensity
Rank by selected metric
Display comparative chart
```

**Normalized Comparison:**

When facilities differ in size, use intensity:
```
Intensity = Energy / Area (or production, or revenue)
```

**Example:**
```
Facility A: 20,000 MMBtu, 100,000 sq ft → 0.20 MMBtu/sq ft
Facility B: 15,000 MMBtu, 60,000 sq ft → 0.25 MMBtu/sq ft
Facility C: 25,000 MMBtu, 150,000 sq ft → 0.17 MMBtu/sq ft

Ranking by intensity:
1. Facility C: 0.17 MMBtu/sq ft (most efficient)
2. Facility A: 0.20 MMBtu/sq ft
3. Facility B: 0.25 MMBtu/sq ft (least efficient)
```

## Data Refresh and Caching

Dashboard calculations may be cached for performance:

**Cache Key:**
```
key = account_id + facility_id + start_date + end_date + last_data_update
```

**Cache Validity:**
```
if (cache_time < last_data_update):
    Recalculate and update cache
else:
    Return cached results
```

## Key Performance Indicators (KPIs)

Dashboard highlights key metrics:

1. **Total Energy Use** - Current period
2. **Total Cost** - Current period
3. **Change from Previous Period** - Percentage
4. **Year-to-Date Total** - Running sum
5. **Year-over-Year Change** - Comparison to last year
6. **Average Cost per Unit** - $/MMBtu or $/kWh
7. **Top 5 Consumers** - Largest meters/facilities
8. **Emissions** - Total CO₂e for period

## Visualization Support

Dashboard calculations prepare data for charts:

### Time Series Chart
```
{
    labels: ['Jan', 'Feb', 'Mar', ...],
    datasets: [
        {name: 'Energy', data: [2000, 1800, 1900, ...]},
        {name: 'Cost', data: [24000, 21600, 22800, ...]}
    ]
}
```

### Pie Chart (Energy by Source)
```
{
    labels: ['Electricity', 'Natural Gas', 'Other'],
    data: [60, 30, 10],  // percentages
    colors: ['#FF6384', '#36A2EB', '#FFCE56']
}
```

### Bar Chart (Facility Comparison)
```
{
    labels: ['Facility A', 'Facility B', 'Facility C'],
    data: [20000, 15000, 25000],  // MMBtu
}
```

## Summary Statistics

**Basic Statistics:**
```
Mean = Σ(value_i) / n
Median = Middle value when sorted
Min = Minimum value
Max = Maximum value
Range = Max - Min
```

**Example - Monthly electricity costs:**
```
Data: [$8,000, $9,000, $7,500, $8,500, $10,000, $8,200]

Mean: $51,200 / 6 = $8,533
Median: ($8,200 + $8,500) / 2 = $8,350
Min: $7,500
Max: $10,000
Range: $2,500
```

## Key Insights

1. **Real-time visibility:** Dashboard provides immediate access to current status
2. **Trend identification:** Time-series data reveals patterns
3. **Comparative analysis:** Facilities and sources can be compared
4. **Cost tracking:** Total cost and unit costs monitored
5. **Top consumers:** Identifies opportunities for focus
6. **Simple metrics:** Easy-to-understand KPIs for management
7. **Multiple views:** Account, facility, and meter-level perspectives
8. **Cached for performance:** Large accounts benefit from caching

Dashboard calculations provide the quick insights users need for day-to-day energy management, while detailed analysis calculations support in-depth performance evaluation and reporting.
