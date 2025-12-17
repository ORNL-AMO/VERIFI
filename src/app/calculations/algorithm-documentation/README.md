# VERIFI Algorithm Documentation

This directory contains comprehensive documentation of the mathematical algorithms and calculation methods used throughout VERIFI's calculations directory. The documentation is designed to help engineers and end users understand how energy, water, and emissions calculations work within VERIFI without needing to understand the codebase implementation details.

## Overview

VERIFI performs utility data analysis, tracking, and reporting for industrial facilities. The calculations encompass several key areas including energy analysis, emissions tracking, unit conversions, and various reporting mechanisms.

## Documentation Structure

### Core Analysis Calculations
- **[Analysis Calculations](./analysis-calculations.md)** - The main energy and water analysis engine
  - Monthly group-level calculations
  - Annual rollup methodology (group → facility → account)
  - SEnPI (Superior Energy Performance Indicator) calculations
  - Baseline adjustments and banking mechanisms
  - Regression, energy intensity, and absolute energy consumption models

### Unit Conversions and Data Processing
- **[Conversions](./conversions.md)** - Comprehensive unit conversion system
  - Supported measurement types (energy, volume, mass, temperature, etc.)
  - Conversion factors and definitions
  - Meter data conversion utilities

- **[Calanderization](./calanderization.md)** - Meter data normalization
  - Converting utility billing periods to calendar months
  - Handling variable billing cycles
  - Monthly data standardization

### Emissions and Environmental Calculations
- **[Emissions Calculations](./emissions-calculations.md)** - Greenhouse gas emissions
  - Scope 1, 2, and 3 emissions
  - Location-based and market-based electricity emissions
  - Global Warming Potential (GWP) multipliers
  - Mobile, stationary, fugitive, and process emissions

- **[Carbon Calculations](./carbon-calculations.md)** - Better Climate reporting
  - Carbon footprint calculations
  - Year-over-year carbon tracking

### Reporting and Dashboard Calculations
- **[Better Plants Calculations](./better-plants-calculations.md)** - DOE Better Plants program reports
  - Energy and water performance summaries
  - Primary energy calculations
  - Facility-level performance metrics

- **[Performance Report Calculations](./performance-report-calculations.md)** - Performance reporting
  - Comprehensive facility performance metrics

- **[Savings Report Calculations](./savings-report-calculations.md)** - Energy and cost savings
  - Facility and account-level savings calculations
  - Cost avoidance and savings tracking

- **[Dashboard Calculations](./dashboard-calculations.md)** - Dashboard metrics
  - Account and facility overview calculations
  - Use and cost aggregations
  - Source totals

### Utility Functions
- **[Shared Calculations](./shared-calculations.md)** - Common utility functions
  - Fiscal year calculations
  - Date filtering and manipulation
  - Predictor usage calculations
  - Helper functions used across modules

## Key Concepts

### Hierarchical Data Structure
VERIFI organizes data in a hierarchical structure:
- **Account** - Top level, can contain multiple facilities
- **Facility** - Individual plant or building, contains meters and predictors
- **Group** - Logical grouping of meters for analysis (e.g., "Production Area", "HVAC")
- **Meter** - Individual utility meter tracking energy, water, or other resources

### Analysis Types

VERIFI supports four primary analysis methodologies:

1. **Regression Analysis** - Uses statistical regression models with predictor variables (production, weather, etc.) to model expected energy use
2. **Energy Intensity** - Normalizes energy use by production or other activity metrics
3. **Modified Energy Intensity** - Energy intensity with baseload adjustments
4. **Absolute Energy Consumption** - Direct comparison against baseline without normalization

### Temporal Aggregation

Calculations flow from the most granular level up:

```
Monthly Meter Data → Monthly Group Analysis → Annual Group Summary
                                                      ↓
                                            Annual Facility Summary
                                                      ↓
                                            Annual Account Summary
```

### Baseline and Banking

- **Baseline Year** - Reference year against which improvements are measured
- **Banking** - Mechanism to preserve already-achieved savings when adjusting the baseline forward in time
- **Baseline Adjustments** - Corrections for operational changes, facility modifications, or data quality issues

## Getting Started

For a comprehensive understanding of VERIFI's calculations:

1. Start with **[Analysis Calculations](./analysis-calculations.md)** to understand the core analysis engine
2. Review **[Calanderization](./calanderization.md)** to understand how raw meter data is processed
3. Explore specific topics based on your needs:
   - For emissions tracking: See **[Emissions Calculations](./emissions-calculations.md)**
   - For unit conversions: See **[Conversions](./conversions.md)**
   - For reporting: See the various report calculation documents

## Mathematical Notation

Throughout these documents, we use the following notation conventions:

- `E` - Energy use (actual measured)
- `M` - Modeled energy (predicted/expected)
- `A` - Adjusted baseline energy
- `S` - Savings
- `P` - Predictor variable(s)
- `β` - Regression coefficient
- Subscript `baseline` - Values from baseline year
- Subscript `current` - Values from current period
- Subscript `i` - Index for summation
- `Σ` - Summation operator

## Units

Unless otherwise specified:
- Energy is typically in MMBtu (million British thermal units) or source energy units
- Water is typically in kgal (thousand gallons)
- Emissions are in metric tons CO₂e (carbon dioxide equivalent)
- Time periods are fiscal years (which may differ from calendar years)

## Version and Updates

This documentation reflects the calculation methodology as implemented in the codebase. As VERIFI evolves, these documents should be updated to reflect any changes in calculation methods, formulas, or approaches.

## Questions and Contributions

For questions about these calculations or to contribute improvements to this documentation, please refer to the main VERIFI repository contribution guidelines.
