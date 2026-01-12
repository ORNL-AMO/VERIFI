# Carbon Calculations (Better Climate Report)

## Overview

The carbon calculations module generates Better Climate reports focused on greenhouse gas emissions tracking and carbon footprint reduction. This complements the Better Plants energy focus with specific attention to climate impact and emissions intensity improvements.

## Better Climate Program

Similar to Better Plants, Better Climate focuses on:
- Reducing absolute greenhouse gas emissions
- Improving emissions intensity (emissions per unit production)
- Tracking progress toward emissions reduction goals

**Typical Goals:**
- 25% reduction in GHG intensity over 10 years, OR
- Specific absolute reduction target (e.g., 1,000 metric tons CO₂e)

## Better Climate Reports

VERIFI generates comprehensive carbon emissions reports with year-over-year tracking.

**Key Components:**
- Total GHG emissions (Scope 1 and Scope 2)
- Emissions by source (electricity, natural gas, etc.)
- Emissions intensity metrics
- Year-over-year comparisons
- Progress toward goals

## Emissions Calculation

Emissions are calculated using the emissions calculations module (see emissions-calculations.md):

```
Total_emissions = Scope1_emissions + Scope2_emissions
```

**Scope 1:** Direct emissions from owned/controlled sources
**Scope 2:** Indirect emissions from purchased energy

## Emissions Intensity

### GHG Intensity Calculation

**Basic Formula:**
```
Emissions_intensity = Total_emissions / Production
```

**Units:** metric tons CO₂e per unit of production

**Example:**
```
Total emissions: 10,000 metric tons CO₂e
Production: 50,000 units

Intensity: 10,000 / 50,000 = 0.2 metric tons CO₂e per unit
```

### Alternative Intensity Metrics

**Per Revenue:**
```
Intensity_revenue = Total_emissions / Total_revenue
```

**Per Area:**
```
Intensity_area = Total_emissions / Facility_area
```

**Per Energy:**
```
Intensity_energy = Total_emissions / Total_energy_MMBtu
```

**Example - Multiple Intensity Views:**
```
Facility data:
- Emissions: 5,000 metric tons CO₂e
- Production: 25,000 tons product
- Revenue: $10,000,000
- Area: 100,000 sq ft
- Energy: 50,000 MMBtu

Intensity metrics:
- Per production: 5,000 / 25,000 = 0.20 tCO₂e/ton product
- Per revenue: 5,000 / 10,000,000 = 0.0005 tCO₂e/$ = 0.5 tCO₂e/k$
- Per area: 5,000 / 100,000 = 0.05 tCO₂e/sq ft
- Per energy: 5,000 / 50,000 = 0.10 tCO₂e/MMBtu
```

## Better Climate Years Details

### Year-by-Year Details

The report provides a detailed year-by-year breakdown of emissions data.

**For Each Year:**
```
{
    year: number,
    totalEmissions: metric tons CO₂e,
    scope1Emissions: metric tons CO₂e,
    scope2Emissions: metric tons CO₂e,
    emissionsIntensity: tCO₂e per unit,
    production: units,
    percentChange: % change from baseline
}
```

### Baseline Year

The baseline year establishes the reference point:

```
Baseline_emissions = Total emissions in baseline year
Baseline_intensity = Baseline_emissions / Baseline_production
```

### Report Year

Current or selected year for comparison:

```
Report_emissions = Total emissions in report year
Report_intensity = Report_emissions / Report_production
```

## Emissions Reduction Calculations

### Absolute Emissions Reduction

```
Absolute_reduction = Baseline_emissions - Report_emissions
Percent_reduction = (Absolute_reduction / Baseline_emissions) × 100%
```

**Example:**
```
Baseline (2020): 15,000 metric tons CO₂e
Report (2024): 12,000 metric tons CO₂e

Absolute reduction: 15,000 - 12,000 = 3,000 metric tons CO₂e
Percent reduction: (3,000 / 15,000) × 100% = 20%
```

### Intensity-Based Reduction

Accounts for changes in production:

```
Baseline_intensity = Baseline_emissions / Baseline_production
Report_intensity = Report_emissions / Report_production
Intensity_reduction = (Baseline_intensity - Report_intensity) / Baseline_intensity × 100%
```

**Example:**
```
Baseline year:
- Emissions: 15,000 tCO₂e
- Production: 50,000 units
- Intensity: 0.30 tCO₂e/unit

Report year:
- Emissions: 16,000 tCO₂e
- Production: 60,000 units
- Intensity: 0.267 tCO₂e/unit

Absolute change: +1,000 tCO₂e (emissions increased)
Intensity reduction: (0.30 - 0.267) / 0.30 × 100% = 11% improvement

Interpretation: Emissions increased due to higher production, but emissions
per unit decreased significantly, showing improved efficiency.
```

### Adjusted Baseline for Emissions

Similar to energy analysis:

```
Adjusted_baseline_emissions = Baseline_intensity × Report_production
Emissions_savings = Adjusted_baseline_emissions - Report_emissions
```

**Example (continuing above):**
```
Adjusted baseline: 0.30 tCO₂e/unit × 60,000 units = 18,000 tCO₂e
Actual emissions: 16,000 tCO₂e
Emissions savings: 18,000 - 16,000 = 2,000 tCO₂e

Interpretation: Achieved 2,000 tCO₂e less than would be expected at
baseline efficiency under current production level.
```

## Emissions by Source

### Source Breakdown

Categorize emissions by utility source:

```
{
    electricity: {
        energy: MMBtu,
        emissions: metric tons CO₂e,
        percent: % of total
    },
    naturalGas: {...},
    fuelOil: {...},
    other: {...}
}
```

**Example:**
```
Total emissions: 10,000 metric tons CO₂e

Electricity: 6,500 tCO₂e (65%)
Natural Gas: 2,800 tCO₂e (28%)
Fuel Oil: 500 tCO₂e (5%)
Other: 200 tCO₂e (2%)
```

### Emissions Factor Analysis

Track how emissions factors change:

**Grid Emission Factor:**
```
Grid_EF = Total_grid_emissions / Total_grid_generation
```

As grid becomes cleaner (more renewables), emission factor decreases:

**Example:**
```
2020 grid EF: 500 kg CO₂e/MWh
2024 grid EF: 420 kg CO₂e/MWh
Reduction: 16% cleaner grid

Facility impact (if electricity use unchanged at 1,000 MWh):
2020 emissions: 1,000 × 500 / 1,000 = 500 metric tons CO₂e
2024 emissions: 1,000 × 420 / 1,000 = 420 metric tons CO₂e
Reduction: 80 metric tons CO₂e without any facility action
```

## Renewable Energy Impact

### Renewable Energy Credits (RECs)

**Market-Based Emissions:**
```
Market_emissions = Location_emissions - REC_credits
```

**Example:**
```
Electricity use: 10,000 MWh
Grid emissions factor: 450 kg CO₂e/MWh
Location-based emissions: 10,000 × 450 / 1,000 = 4,500 tCO₂e

RECs purchased: 5,000 MWh worth
REC credit: 5,000 × 450 / 1,000 = 2,250 tCO₂e

Market-based emissions: 4,500 - 2,250 = 2,250 tCO₂e
Reduction: 50% through RECs
```

### On-Site Renewables

**Net Electricity:**
```
Net_electricity = Purchased_electricity - Generated_renewable
Emissions = Net_electricity × Grid_EF
```

**Example:**
```
Purchased electricity: 12,000 MWh
On-site solar generation: 2,000 MWh
Net electricity: 10,000 MWh

Grid EF: 450 kg CO₂e/MWh
Emissions: 10,000 × 450 / 1,000 = 4,500 tCO₂e

If no solar: 12,000 × 450 / 1,000 = 5,400 tCO₂e
Savings from solar: 5,400 - 4,500 = 900 tCO₂e (17% reduction)
```

## Carbon Reduction Strategies

### Fuel Switching

**Natural Gas vs. Coal:**
```
Coal EF: ~93.4 kg CO₂/MMBtu
Natural Gas EF: ~53.1 kg CO₂/MMBtu
Reduction per MMBtu: 40.3 kg CO₂ (43% less)
```

**Example:**
```
Switch 1,000 MMBtu from coal to natural gas:

Before (coal): 1,000 × 93.4 / 1,000 = 93.4 tCO₂
After (nat gas): 1,000 × 53.1 / 1,000 = 53.1 tCO₂
Reduction: 40.3 tCO₂
```

### Energy Efficiency

**Emissions Impact:**
```
Emissions_reduction = Energy_savings × Emission_factor
```

**Example:**
```
Energy savings: 1,000 MMBtu electricity
Grid EF: 450 kg CO₂e/MWh
Electricity: 1,000 MMBtu = 293 MWh

Emissions reduction: 293 × 450 / 1,000 = 132 tCO₂e
```

### Process Improvements

Reduce process emissions directly:
- Carbon capture
- Process optimization
- Alternative materials
- Waste reduction

## Scope 2 Accounting

### Location-Based Method

Uses average grid emissions:
```
Scope2_location = Electricity_use × Grid_average_EF
```

**Pros:**
- Simple and consistent
- Reflects actual grid mix
- Comparable across organizations

**Cons:**
- Doesn't credit renewable purchases
- Ignores market choices

### Market-Based Method

Reflects specific purchases:
```
Scope2_market = Electricity_use × Supplier_specific_EF - REC_credits
```

**Pros:**
- Credits renewable choices
- Incentivizes clean energy
- Reflects contractual instruments

**Cons:**
- More complex
- Requires documentation
- Potential for double-counting

**Better Climate Reports:**

Report both methods for transparency:
```
{
    scope2LocationBased: 5,000 tCO₂e,
    scope2MarketBased: 3,500 tCO₂e,
    difference: 1,500 tCO₂e (due to RECs/PPAs)
}
```

## Year-over-Year Tracking

### Annual Progression

Track emissions over time:

```
Years: [2020, 2021, 2022, 2023, 2024]
Emissions: [15000, 14500, 13800, 13200, 12500] (tCO₂e)
Intensity: [0.300, 0.285, 0.268, 0.255, 0.242] (tCO₂e/unit)
```

**Trend Analysis:**
```
Total reduction (2020-2024): 15,000 - 12,500 = 2,500 tCO₂e (16.7%)
Intensity reduction: (0.300 - 0.242) / 0.300 = 19.3%
Average annual reduction: 2,500 / 4 = 625 tCO₂e per year
```

### Cumulative Emissions Avoided

Total emissions prevented since baseline:

```
For each year:
    Avoided = Adjusted_baseline - Actual
Cumulative = Σ(Annual_avoided)
```

**Example:**
```
2021: 300 tCO₂e avoided
2022: 600 tCO₂e avoided
2023: 900 tCO₂e avoided
2024: 1,200 tCO₂e avoided

Cumulative: 3,000 tCO₂e total avoided over 4 years
```

## Carbon Equivalencies

Help communicate emissions reductions:

**Cars off the road:**
```
Cars = Emissions_reduced / 4.6 tCO₂e per car per year
```

**Trees planted:**
```
Trees = Emissions_reduced / 0.06 tCO₂e per tree per year
```

**Example:**
```
Emissions reduction: 2,000 tCO₂e

Equivalent to:
- 2,000 / 4.6 ≈ 435 cars off the road for one year
- 2,000 / 0.06 ≈ 33,333 trees planted and grown for 10 years
- 453,000 gallons of gasoline not consumed
- 4,600 barrels of oil not consumed
```

## Carbon Price Valuation

Assign monetary value to emissions:

**Social Cost of Carbon:**
```
Carbon_value = Emissions × Carbon_price
```

**Example:**
```
Emissions reduction: 2,000 tCO₂e
Social cost of carbon: $50/tCO₂e

Value: 2,000 × $50 = $100,000
```

**Carbon Tax Impact:**

If carbon tax implemented:
```
Carbon_cost = Emissions × Tax_rate
Savings_from_reduction = Reduction × Tax_rate
```

**Example:**
```
Current emissions: 12,000 tCO₂e
Potential carbon tax: $100/tCO₂e
Potential cost: $1,200,000 per year

With 20% reduction (to 9,600 tCO₂e):
Cost: $960,000 per year
Savings: $240,000 per year
```

## Goals and Targets

### Science-Based Targets

Align with climate science:

**1.5°C pathway:** ~4.2% annual reduction
**2°C pathway:** ~2.5% annual reduction

**Target Calculation:**
```
Target_year_emissions = Baseline × (1 - Annual_reduction_rate)^Years
```

**Example:**
```
Baseline (2020): 15,000 tCO₂e
Target: 1.5°C pathway (4.2% annual reduction)
Timeframe: 10 years (to 2030)

Target: 15,000 × (1 - 0.042)^10
      = 15,000 × 0.958^10
      = 15,000 × 0.650
      = 9,750 tCO₂e

Required reduction: 15,000 - 9,750 = 5,250 tCO₂e (35%)
```

### Net Zero Pathways

**Gross Zero:** Eliminate all emissions
**Net Zero:** Offset remaining emissions with removals

**Pathway:**
```
Year  Gross    Offsets   Net
2020  15,000      0     15,000
2025  12,000    500     11,500
2030   9,000  1,500      7,500
2035   6,000  3,000      3,000
2040   3,000  3,000         0  (Net Zero)
```

## Key Insights

1. **Intensity metrics:** Critical when production changes over time
2. **Both methods:** Report both location and market-based Scope 2
3. **Source breakdown:** Identify largest contributors for targeting
4. **Trend tracking:** Monitor year-over-year progress
5. **Grid changes:** Distinguish facility actions from grid improvements
6. **Renewable impact:** Quantify effect of RECs and PPAs
7. **Equivalencies:** Make reductions tangible and relatable
8. **Science-based:** Align targets with climate science

Better Climate reporting transforms emissions data into actionable climate strategies and demonstrates environmental leadership.
