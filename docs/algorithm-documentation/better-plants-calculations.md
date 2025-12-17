# Better Plants Calculations

## Overview

The Better Plants program, run by the U.S. Department of Energy (DOE), helps manufacturers improve their energy efficiency and reduce greenhouse gas emissions. The Better Plants calculations module generates reports that align with DOE Better Plants reporting requirements, tracking energy and water performance improvements over time.

## Program Goals

Better Plants partners commit to:
- **25% energy intensity improvement** over 10 years, OR
- **25% greenhouse gas intensity improvement** over 10 years

Improvements are measured against a baseline year.

## Better Plants Report Structure

### Report Components

Better Plants performance reports provide comprehensive tracking of energy and water improvements.

**Key Outputs:**
- Energy performance metrics
- Water performance metrics (if applicable)
- Facility-level performance summaries
- Percent improvement calculations
- Primary energy totals

## Energy Performance Calculations

### Primary Energy

Better Plants reports use **primary (source) energy** rather than site energy.

**Source Energy Conversion:**
```
Primary_energy = Site_energy × Source_factor
```

**Common source factors:**
- Electricity: ~3.14
- Natural gas: ~1.05
- Fuel oil: ~1.01
- Coal: ~1.00

**Example:**
```
Facility energy use:
- Electricity: 1,000 MMBtu site
- Natural gas: 500 MMBtu site

Primary energy:
- Electricity: 1,000 × 3.14 = 3,140 MMBtu primary
- Natural gas: 500 × 1.05 = 525 MMBtu primary
Total primary: 3,140 + 525 = 3,665 MMBtu primary
```

### Energy Performance Metrics

**Baseline Year Primary Energy:**
```
E_baseline_primary = Σ(meter_energy_i × source_factor_i) for baseline year
```

**Report Year Primary Energy:**
```
E_report_primary = Σ(meter_energy_i × source_factor_i) for report year
```

**Adjusted Baseline Primary Energy:**

From analysis calculations (see analysis-calculations.md):
```
E_adjusted_baseline = Analysis_adjusted_baseline (already in primary energy)
```

This accounts for changes in production, weather, or other normalizing factors.

### Energy Intensity Improvement

**Energy Intensity:**
```
Intensity_baseline = E_baseline_primary / Production_baseline
Intensity_report = E_report_primary / Production_report
```

**Percent Improvement:**
```
% Improvement = ((E_adjusted_baseline - E_report) / E_adjusted_baseline) × 100%
```

Or equivalently, using savings:
```
% Improvement = (Savings / E_adjusted_baseline) × 100%
```

**Example:**
```
Adjusted baseline primary energy: 10,000 MMBtu
Report year actual primary energy: 8,500 MMBtu
Savings: 1,500 MMBtu

% Improvement = (1,500 / 10,000) × 100% = 15%
```

### Energy Savings

**Total Energy Savings:**
```
Total_savings = E_adjusted_baseline - E_report
```

**Banked vs. Unbanked Savings:**

If banking is applied (see analysis-calculations.md):
```
Total_savings = Savings_unbanked + Savings_banked
```

Where:
- `Savings_unbanked`: Improvements since new baseline
- `Savings_banked`: Credit for improvements preserved from previous baseline period

**Cumulative Savings:**

Sum of savings across all years from baseline to report year:
```
Cumulative_savings = Σ(Annual_savings_i) for i = baseline_year to report_year
```

## Water Performance Calculations

### Water Intensity

Similar to energy, but for water consumption:

**Baseline Water Intensity:**
```
Water_intensity_baseline = Water_baseline / Production_baseline
```

**Report Year Water Intensity:**
```
Water_intensity_report = Water_report / Production_report
```

**Adjusted Baseline Water:**
```
Water_adjusted_baseline = Water_intensity_baseline × Production_report
```

### Water Savings

**Total Water Savings:**
```
Water_savings = Water_adjusted_baseline - Water_report
```

**Percent Water Improvement:**
```
% Water_improvement = (Water_savings / Water_adjusted_baseline) × 100%
```

**Example:**
```
Baseline year: 5,000 kgal water, 10,000 units production
Baseline intensity: 5,000 / 10,000 = 0.5 kgal/unit

Report year: 4,200 kgal water, 12,000 units production
Report intensity: 4,200 / 12,000 = 0.35 kgal/unit

Adjusted baseline: 0.5 × 12,000 = 6,000 kgal
Savings: 6,000 - 4,200 = 1,800 kgal
% Improvement: (1,800 / 6,000) × 100% = 30%
```

## Facility Performance Summaries

### Per-Facility Calculations

For each facility in the account:

**Facility Energy Performance:**
```
Facility_improvement = (Facility_savings / Facility_adjusted_baseline) × 100%
```

**Facility Performance Summary:**
- Facility A: 20.5% improvement
- Facility B: 18.2% improvement
- Facility C: 22.1% improvement

### Account-Level Aggregation

**Total Account Savings:**
```
Account_savings = Σ(Facility_savings_i) for all facilities
```

**Total Account Adjusted Baseline:**
```
Account_adjusted = Σ(Facility_adjusted_i) for all facilities
```

**Account Performance:**
```
Account_improvement = (Account_savings / Account_adjusted) × 100%
```

This may differ from the average of facility improvements due to different facility sizes.

**Example:**
```
Facility A: 1,000 MMBtu adjusted, 200 MMBtu savings (20%)
Facility B: 500 MMBtu adjusted, 75 MMBtu savings (15%)

Account total: 1,500 MMBtu adjusted, 275 MMBtu savings
Account improvement: 275 / 1,500 = 18.3%

Note: 18.3% ≠ average of (20% + 15%) / 2 = 17.5%
The larger facility (A) has more weight in the account total.
```

## Better Plants Energy Summary

### Energy Usage Summary

The energy summary breaks down energy usage by fuel type and source for a specific year.

**Fuel Categories:**
- Electricity
- Natural Gas
- Fuel Oil
- Coal
- Other fuels

**For each fuel type:**
```
{
    fuelType: string,
    siteEnergy: MMBtu (site energy),
    primaryEnergy: MMBtu (source energy),
    percentOfTotal: percentage of total primary energy,
    cost: dollars
}
```

**Example Summary:**
```
[
    {
        fuelType: 'Electricity',
        siteEnergy: 2,930 MMBtu,
        primaryEnergy: 9,200 MMBtu,
        percentOfTotal: 75%,
        cost: $350,000
    },
    {
        fuelType: 'Natural Gas',
        siteEnergy: 3,000 MMBtu,
        primaryEnergy: 3,150 MMBtu,
        percentOfTotal: 25%,
        cost: $30,000
    }
]

Total primary energy: 12,350 MMBtu
Total cost: $380,000
```

## Better Plants Water Summary

### Water Usage Summary

The water summary provides an overview of water usage and associated metrics.

**Water Categories:**
- Potable water
- Process water
- Wastewater discharged
- Water reused/recycled

**Summary Metrics:**
- Total water use (kgal)
- Water intensity (kgal per unit production)
- Water cost (dollars)
- Cost per unit (dollars per kgal)

## Report Year Selection

Better Plants reports can be generated for any year from baseline through current.

**Setting Report Year:**
```
analysis_item.reportYear = selected_year
```

The calculations are then performed comparing the selected year against the baseline year.

## Progress Tracking

### Year-over-Year Progress

Track improvement year by year:

```
Years: [Baseline, Year1, Year2, ..., Current]
Improvements: [0%, 5%, 12%, ..., 20%]
```

**Annual Improvement Rate:**
```
Annual_rate = (Total_improvement - Previous_year_improvement) / Years_elapsed
```

**Example:**
```
Baseline (Year 0): 0% improvement
Year 5: 12% improvement
Year 10: 25% improvement

Year 0-5 rate: 12% / 5 = 2.4% per year
Year 5-10 rate: (25% - 12%) / 5 = 2.6% per year
Overall rate: 25% / 10 = 2.5% per year
```

### Goal Progress

**Progress toward 25% goal:**
```
Progress = (Current_improvement / 25%) × 100%
```

**Example:**
```
Current improvement: 18%
Progress toward goal: (18 / 25) × 100% = 72%
```

## Energy Management System (EnMS)

Better Plants partners are encouraged to implement ISO 50001 EnMS.

**EnMS Elements supported by VERIFI:**
- Energy baseline establishment
- Energy performance indicators (EnPIs)
- Measurement and monitoring
- Progress reporting
- Management review data

## Reporting Requirements

### Annual Data Submission

Partners submit annually:
- Total energy consumption (primary)
- Energy saved
- Cumulative energy savings
- Production metrics
- Cost data
- Facility information updates

### Progress Reports

Every 3 years, partners submit:
- Updated baseline (if applicable)
- Achievement of interim goals
- Plans for continued improvement

## Data Quality for Better Plants

### Required Data Accuracy

- **Energy data:** ±5% accuracy preferred
- **Production data:** Consistent units and definitions
- **Weather normalization:** Applied consistently
- **Baseline adjustments:** Well-documented and justified

### Documentation Requirements

- Baseline year selection rationale
- Production metrics definition
- Adjustment methodology
- Significant changes (acquisitions, divestitures)

## Special Scenarios

### New Facilities

Facilities built after baseline year:

**Option 1: Exclude from analysis**
```
Only analyze facilities operating during baseline
```

**Option 2: Establish separate baseline**
```
New facility gets baseline when operational
Reported separately or integrated with adjustment
```

### Facility Closures

**Option 1: Remove from both baseline and current**
```
Recalculate baseline excluding closed facility
Compare apples-to-apples
```

**Option 2: Note in reporting**
```
Report change in facility composition
Show impact separately
```

### Significant Production Changes

If production changes dramatically (>25%):

**Consider baseline adjustment:**
```
Adjust baseline to reflect new production reality
Document rationale for adjustment
Maintain conservative estimates
```

## Better Plants Recognition

### Achievement Levels

**Goal Achiever:**
- Achieved 25% improvement goal within commitment period

**Challenge Partner:**
- Actively working toward goal
- Submitting annual data
- Making progress

## Example: Complete Better Plants Calculation

**Facility Information:**
- Baseline Year: 2020
- Report Year: 2023
- Commitment: 10-year, 25% energy intensity reduction

**Baseline Year (2020):**
- Production: 100,000 units
- Electricity: 1,000,000 kWh = 3,412 MMBtu site
- Natural gas: 2,000 MMBtu site
- Site energy total: 5,412 MMBtu
- Primary energy: (3,412 × 3.14) + (2,000 × 1.05) = 10,714 + 2,100 = 12,814 MMBtu
- Energy intensity: 12,814 / 100,000 = 0.1281 MMBtu/unit

**Report Year (2023):**
- Production: 120,000 units
- Electricity: 1,100,000 kWh = 3,753 MMBtu site
- Natural gas: 2,100 MMBtu site
- Site energy total: 5,853 MMBtu
- Primary energy: (3,753 × 3.14) + (2,100 × 1.05) = 11,784 + 2,205 = 13,989 MMBtu
- Energy intensity: 13,989 / 120,000 = 0.1166 MMBtu/unit

**Performance Calculation:**
```
Adjusted baseline = 0.1281 MMBtu/unit × 120,000 units = 15,372 MMBtu
Actual energy = 13,989 MMBtu
Savings = 15,372 - 13,989 = 1,383 MMBtu
% Improvement = (1,383 / 15,372) × 100% = 9.0%

Progress toward goal: (9.0% / 25%) × 100% = 36%
Years elapsed: 3
Average annual improvement: 9.0% / 3 = 3.0% per year
On track for 10-year goal: 3.0% × 10 = 30% (exceeds 25% target)
```

## Key Insights

1. **Primary energy:** Better Plants uses source/primary energy, not site energy
2. **Intensity-based:** Improvements are normalized for production changes
3. **Baseline adjustment:** Ensures fair comparison despite operational changes
4. **Facility aggregation:** Account performance weighted by facility size
5. **Banking mechanism:** Preserves achieved savings when baseline advances
6. **Annual tracking:** Progress monitored year-over-year
7. **Goal-oriented:** 25% improvement over 10 years is the standard target
8. **Data quality:** Accuracy and consistency are critical for credible reporting

## References

- DOE Better Plants Program Guide
- Better Plants Technical Documentation
- ISO 50001 Energy Management Systems Standard
- EPA Energy Star Portfolio Manager (for source factors)
