# Emissions Calculations

## Overview

The emissions calculations module computes greenhouse gas (GHG) emissions from various energy sources based on fuel consumption, electricity use, and other activities. Emissions are categorized by scope and reported in metric tons of carbon dioxide equivalent (CO₂e).

## GHG Protocol Scopes

### Scope 1: Direct Emissions
Emissions from sources owned or controlled by the organization:
- Combustion of fuels in owned equipment
- Company vehicles
- Fugitive emissions (refrigerant leaks, etc.)
- Process emissions from industrial activities

### Scope 2: Indirect Emissions from Purchased Energy
Emissions from generation of purchased electricity, steam, heating, and cooling:
- Purchased electricity
- Purchased steam
- Purchased hot water
- Purchased chilled water

Two methods for Scope 2:
- **Location-based:** Average emissions intensity of regional grid
- **Market-based:** Emissions from specific supplier or contracts (includes RECs)

### Scope 3: Other Indirect Emissions
Emissions from the value chain (not fully implemented in current module):
- Upstream transportation
- Employee commuting
- Waste disposal
- Downstream transportation

## Emissions Categories in VERIFI

### Location-Based Electricity Emissions
```
E_location = Usage_kWh × EF_grid / 1000
```

Where:
- `E_location` = Location-based emissions (metric tons CO₂e)
- `Usage_kWh` = Electricity consumption (kWh)
- `EF_grid` = Grid emission factor (kg CO₂e/MWh)
- Division by 1000 converts kg to metric tons

**Example:**
```
Usage: 100,000 kWh
Grid EF: 450 kg CO₂e/MWh (US average ~400-500)

E_location = 100,000 kWh × 450 kg/MWh / 1000
E_location = (100 MWh × 450 kg/MWh) / 1000
E_location = 45,000 kg / 1000
E_location = 45 metric tons CO₂e
```

### Market-Based Electricity Emissions

**Without RECs (Renewable Energy Certificates):**
```
E_market = E_location
```

**With RECs:**
```
E_market = MAX(0, E_location - REC_credits)
Excess_RECs = MAX(0, REC_credits - E_location)
```

**Example with RECs:**
```
E_location = 45 metric tons CO₂e
REC_credits = 30 metric tons CO₂e worth

E_market = 45 - 30 = 15 metric tons CO₂e
Excess_RECs = 0 (no excess)
```

**Example with excess RECs:**
```
E_location = 45 metric tons CO₂e
REC_credits = 50 metric tons CO₂e worth

E_market = 0 (cannot go negative)
Excess_RECs = 50 - 45 = 5 metric tons CO₂e (can be sold or banked)
```

### Stationary Combustion Emissions

Emissions from fuel burning in boilers, furnaces, generators, etc.

**General formula:**
```
E_stationary = Usage × EF_fuel × (1 + CH4_factor + N2O_factor)
```

Where:
- `Usage` = Fuel consumption (in appropriate units)
- `EF_fuel` = CO₂ emission factor for fuel (kg CO₂/unit)
- `CH4_factor` = Methane emission factor as CO₂e
- `N2O_factor` = Nitrous oxide emission factor as CO₂e

**Detailed calculation:**
```
CO2_emissions = Usage × EF_CO2
CH4_emissions = Usage × EF_CH4 × GWP_CH4
N2O_emissions = Usage × EF_N2O × GWP_N2O
E_stationary = (CO2_emissions + CH4_emissions + N2O_emissions) / 1000
```

### Global Warming Potential (GWP) Multipliers

GWP values vary by IPCC Assessment Report:

**AR4 (Fourth Assessment Report):**
- CO₂: 1
- CH₄ (Methane): 25
- N₂O (Nitrous oxide): 298

**AR5 (Fifth Assessment Report):**
- CO₂: 1
- CH₄ (Methane): 28
- N₂O (Nitrous oxide): 265

VERIFI allows selection of AR4 or AR5 based on reporting requirements.

### Common Fuel Emission Factors

**Natural Gas:**
- CO₂: ~53.06 kg CO₂/MMBtu
- CH₄: ~0.001 kg CH₄/MMBtu
- N₂O: ~0.0001 kg N₂O/MMBtu

**Example calculation (Natural Gas, AR5):**
```
Usage: 1,000 MMBtu
CO₂: 1,000 × 53.06 = 53,060 kg CO₂
CH₄: 1,000 × 0.001 × 28 = 28 kg CO₂e
N₂O: 1,000 × 0.0001 × 265 = 26.5 kg CO₂e
Total: (53,060 + 28 + 26.5) / 1000 = 53.11 metric tons CO₂e
```

**Diesel:**
- CO₂: ~73.96 kg CO₂/MMBtu
- CH₄: ~0.003 kg CH₄/MMBtu
- N₂O: ~0.0006 kg N₂O/MMBtu

**Gasoline:**
- CO₂: ~70.22 kg CO₂/MMBtu
- CH₄: ~0.003 kg CH₄/MMBtu
- N₂O: ~0.0006 kg N₂O/MMBtu

**Coal (bituminous):**
- CO₂: ~93.4 kg CO₂/MMBtu
- CH₄: ~0.011 kg CH₄/MMBtu
- N₂O: ~0.0016 kg N₂O/MMBtu

**Fuel Oil (#2):**
- CO₂: ~73.16 kg CO₂/MMBtu
- CH₄: ~0.003 kg CH₄/MMBtu
- N₂O: ~0.0006 kg N₂O/MMBtu

### Biogenic Emissions

Biogenic CO₂ emissions (from biomass, biofuels) are reported separately:

```
E_biogenic = Usage × EF_CO2_biogenic / 1000
```

Biogenic CO₂ is not included in Scope 1 totals but is reported for transparency.

**Example - Biodiesel B100:**
```
Usage: 100 MMBtu
CO₂ (biogenic): ~75 kg CO₂/MMBtu

E_biogenic = 100 × 75 / 1000 = 7.5 metric tons CO₂
```

This is reported separately and not added to Scope 1.

### Mobile Combustion Emissions

Emissions from vehicles (cars, trucks, forklifts, etc.).

**Distance-based calculation:**
```
E_mobile = Distance × EF_distance × (1 + CH4_factor + N2O_factor)
```

**Fuel-based calculation:**
```
E_mobile = Fuel_volume × EF_fuel × (1 + CH4_factor + N2O_factor)
```

**Example - Gasoline vehicle:**
```
Distance: 10,000 miles
Fuel economy: 25 mpg
Gasoline used: 10,000 / 25 = 400 gallons
Energy: 400 gal × 0.125 MMBtu/gal = 50 MMBtu

CO₂: 50 × 70.22 = 3,511 kg
CH₄: 50 × 0.003 × 28 = 4.2 kg CO₂e (AR5)
N₂O: 50 × 0.0006 × 265 = 7.95 kg CO₂e (AR5)
Total: (3,511 + 4.2 + 7.95) / 1000 = 3.52 metric tons CO₂e
```

### Fugitive Emissions

Emissions from refrigerant leaks, equipment losses, etc.

**Formula:**
```
E_fugitive = Mass_leaked × GWP / 1000
```

**Example - R-134a refrigerant leak:**
```
Mass leaked: 5 kg R-134a
GWP of R-134a: 1,430 (AR5)

E_fugitive = 5 × 1,430 / 1000 = 7.15 metric tons CO₂e
```

**Common refrigerant GWPs (AR5):**
- R-134a: 1,430
- R-410A: 2,088
- R-22: 1,810
- R-404A: 3,922
- Ammonia (R-717): 0 (natural refrigerant)
- CO₂ (R-744): 1

### Process Emissions

Direct emissions from industrial processes (not energy-related).

**Examples:**
- CO₂ from cement production (limestone calcination)
- CO₂ from chemical reactions
- N₂O from nitric acid production
- SF₆ from electrical equipment

**Formula:**
```
E_process = Activity_amount × EF_process / 1000
```

**Example - Cement production:**
```
Limestone consumed: 100 metric tons
EF: ~0.51 metric tons CO₂/ton limestone

E_process = 100 × 0.51 = 51 metric tons CO₂
```

### Other Scope 2 Emissions

For purchased steam, district heating/cooling:

```
E_scope2_other = Usage × EF_source / 1000
```

**Example - Purchased steam:**
```
Usage: 500 MMBtu steam
EF: ~83.6 kg CO₂e/MMBtu (assumes natural gas source)

E_scope2_other = 500 × 83.6 / 1000 = 41.8 metric tons CO₂e
```

## Total Emissions Calculation

### Scope 1 Total (Carbon Emissions)
```
Scope1_carbon = Stationary_carbon + Mobile_carbon + Fugitive + Process
```

### Scope 1 Other (Non-CO₂)
```
Scope1_other = Stationary_CH4_N2O + Mobile_CH4_N2O
```

### Scope 1 Total
```
Scope1_total = Scope1_carbon + Scope1_other
```

### Scope 2 Location-Based
```
Scope2_location = Electricity_location + Scope2_other
```

### Scope 2 Market-Based
```
Scope2_market = Electricity_market + Scope2_other
```

### Total GHG Emissions (Market-Based)
```
Total_GHG = Scope1_total + Scope2_market
```

### Biogenic Emissions (Reported Separately)
```
Biogenic_total = Stationary_biogenic + Mobile_biogenic
```

## Emissions Results Structure

```
{
    locationElectricityEmissions: metric tons CO₂e
    marketElectricityEmissions: metric tons CO₂e
    RECs: metric tons CO₂e (credit applied)
    excessRECs: metric tons CO₂e (excess credits)
    
    scope1Emissions: {
        stationaryCarbonEmissions: metric tons CO₂
        stationaryOtherEmissions: metric tons CO₂e (CH₄, N₂O)
        stationaryBiogenicEmissions: metric tons CO₂ (reported separately)
        stationaryEmissions: total stationary
        
        mobileCarbonEmissions: metric tons CO₂
        mobileOtherEmissions: metric tons CO₂e (CH₄, N₂O)
        mobileBiogenicEmissions: metric tons CO₂ (reported separately)
        mobileEmissions: total mobile
        
        fugitiveEmissions: metric tons CO₂e
        processEmissions: metric tons CO₂e
        
        total: total Scope 1
    }
    
    scope2Emissions: {
        locationBased: metric tons CO₂e
        marketBased: metric tons CO₂e
        otherScope2: metric tons CO₂e (steam, etc.)
    }
    
    totalEmissions: {
        locationBased: Scope 1 + Scope 2 location
        marketBased: Scope 1 + Scope 2 market
    }
    
    biogenicEmissions: total biogenic (reported separately)
}
```

## Emission Factors Data Sources

### Electricity (eGRID)

EPA's Emissions & Generation Resource Integrated Database (eGRID):
- Regional grid emission factors
- Updated periodically (typically every 2-3 years)
- Provides factors by eGRID subregion

**Typical range:** 300-700 kg CO₂e/MWh for US grid

### Stationary and Mobile Combustion

EPA Greenhouse Gas Emission Factors:
- Published in GHG Inventory Guidance documents
- Fuel-specific factors by fuel type
- Updated with each IPCC assessment

### Refrigerants

IPCC Assessment Reports:
- GWP values for each refrigerant type
- AR4 or AR5 values depending on reporting year

## Custom Fuels

For facilities using non-standard fuels:

```
E_custom = Usage × Custom_EF / 1000
```

Where `Custom_EF` is user-provided or calculated from fuel composition.

**Example - Custom coal blend:**
```
Usage: 1,000 short tons
Custom EF: 2,000 kg CO₂/ton (determined by fuel analysis)

E_custom = 1,000 × 2,000 / 1000 = 2,000 metric tons CO₂
```

## Emissions Intensity Metrics

### Emissions per Energy
```
Intensity_energy = Total_emissions / Total_energy
```

**Example:**
```
Total emissions: 1,000 metric tons CO₂e
Total energy: 10,000 MMBtu

Intensity = 1,000 / 10,000 = 0.1 metric tons CO₂e/MMBtu
```

### Emissions per Production
```
Intensity_production = Total_emissions / Production_units
```

**Example:**
```
Total emissions: 1,000 metric tons CO₂e
Production: 5,000 metric tons product

Intensity = 1,000 / 5,000 = 0.2 metric tons CO₂e/metric ton product
```

### Emissions per Revenue
```
Intensity_revenue = Total_emissions / Revenue
```

## Time-Series Emissions Tracking

Monthly emissions are aggregated for tracking:

```
Annual_emissions = Σ(Monthly_emissions_i) for i = 1 to 12
```

Year-over-year comparison:
```
Change = (Current_year - Previous_year) / Previous_year × 100%
```

## Reporting Standards Alignment

### EPA GHG Reporting
- Uses AR4 GWP values (as of 2024)
- Mandatory for facilities >25,000 metric tons CO₂e/year
- Specific calculation methodologies by source category

### ISO 14064
- International standard for GHG accounting
- Requires uncertainty analysis
- Supports both AR4 and AR5

### GHG Protocol
- Most widely used corporate standard
- Scope 1, 2, 3 categorization
- Requires both location and market-based Scope 2

### CDP (Carbon Disclosure Project)
- Uses Scope 1, 2, 3 framework
- Accepts both AR4 and AR5
- Requires detailed disclosure

## Key Considerations

1. **GWP selection:** Align with reporting requirements (AR4 vs AR5)
2. **Boundary definition:** Clearly define organizational boundaries
3. **Data quality:** Emission factors should be current and appropriate
4. **Double counting:** Avoid counting same emissions in multiple categories
5. **RECs:** Only apply to market-based Scope 2, not location-based
6. **Biogenic CO₂:** Report separately, not included in scopes
7. **Verification:** High-emission facilities should verify calculations
8. **Updates:** Update emission factors when new data available

## Common Emission Reduction Strategies

Understanding emissions helps identify reduction opportunities:

1. **Fuel switching:** Natural gas instead of coal (lower EF)
2. **Energy efficiency:** Reduce overall fuel consumption
3. **Renewable energy:** Reduce electricity emissions
4. **Process optimization:** Minimize process emissions
5. **Refrigerant management:** Reduce fugitive emissions
6. **Fleet optimization:** More efficient vehicles, alternative fuels
7. **RECs/PPAs:** Reduce market-based Scope 2 emissions

## Example: Complete Facility Emissions

**Facility data:**
- Electricity: 1,000,000 kWh
- Natural gas: 5,000 MMBtu  
- Diesel (mobile): 200 MMBtu
- Grid EF: 500 kg CO₂e/MWh
- No RECs

**Calculations:**

**Scope 2 - Electricity:**
```
E_elec = 1,000 MWh × 500 kg/MWh / 1000 = 500 metric tons CO₂e
```

**Scope 1 - Natural gas:**
```
CO₂: 5,000 × 53.06 = 265,300 kg
CH₄: 5,000 × 0.001 × 28 = 140 kg CO₂e
N₂O: 5,000 × 0.0001 × 265 = 132.5 kg CO₂e
Total: (265,300 + 140 + 132.5) / 1000 = 265.6 metric tons CO₂e
```

**Scope 1 - Diesel:**
```
CO₂: 200 × 73.96 = 14,792 kg
CH₄: 200 × 0.003 × 28 = 16.8 kg CO₂e
N₂O: 200 × 0.0006 × 265 = 31.8 kg CO₂e
Total: (14,792 + 16.8 + 31.8) / 1000 = 14.8 metric tons CO₂e
```

**Summary:**
```
Scope 1: 265.6 + 14.8 = 280.4 metric tons CO₂e
Scope 2: 500 metric tons CO₂e
Total: 780.4 metric tons CO₂e
```

## References

- EPA Greenhouse Gas Inventory Guidance
- EPA eGRID Database
- IPCC Assessment Reports (AR4, AR5)
- GHG Protocol Corporate Standard
- ISO 14064-1:2018
