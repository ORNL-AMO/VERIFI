# Unit Conversions

## Overview

The conversions module provides comprehensive unit conversion capabilities across a wide range of measurement types. This ensures that data from different sources, meters, and facilities can be normalized to consistent units for analysis and reporting.

## Core Conversion Functionality

### ConvertValue Class

The `ConvertValue` class is the primary interface for unit conversions:

```typescript
new ConvertValue(value, fromUnit, toUnit)
```

**Example:**
```
Convert 1000 kWh to MMBtu:
new ConvertValue(1000, 'kWh', 'MMBtu')
// Returns: 3.412 MMBtu (approximately)
```

### Conversion Process

The conversion process uses a two-step approach:

1. **Convert from source unit to base SI unit** (e.g., BTU → joule)
2. **Convert from base SI unit to target unit** (e.g., joule → kWh)

**Formula:**
```
Value_target = Value_source × (Conversion_source_to_base / Conversion_target_to_base)
```

**Example - Converting 100 BTU to kWh:**
```
BTU to joule: 1 BTU = 1055.06 J
kWh to joule: 1 kWh = 3,600,000 J

100 BTU to kWh:
= 100 × (1055.06 / 3,600,000)
= 100 × 0.0002930722
= 0.02931 kWh
```

## Supported Measurement Types

### Energy

Base unit: **Joule (J)**

Common conversions:
- **BTU** (British Thermal Unit): 1 BTU = 1,055.06 J
- **kWh** (Kilowatt-hour): 1 kWh = 3,600,000 J = 3.6 MJ
- **MMBtu** (Million BTU): 1 MMBtu = 1,055,060,000 J = 1.05506 GJ
- **GJ** (Gigajoule): 1 GJ = 1,000,000,000 J
- **MJ** (Megajoule): 1 MJ = 1,000,000 J
- **therms**: 1 therm = 105,506,000 J = 100,000 BTU
- **kcal** (kilocalorie): 1 kcal = 4,184 J

**Natural Gas Energy Content:**
- **ccf** (hundred cubic feet): 1 ccf ≈ 1,037,000 J (varies by gas composition)
- **mcf** (thousand cubic feet): 1 mcf ≈ 10,370,000 J
- **cf** (cubic foot): 1 cf ≈ 1,037 J

**Metric Natural Gas:**
- **m³** (cubic meter): 1 m³ ≈ 36,650,000 J

**Liquid Fuels (energy content per volume):**
- Gasoline: ~115,000 BTU/gallon = ~121,300,000 J/gal
- Diesel: ~138,700 BTU/gallon = ~146,300,000 J/gal
- Fuel oil: varies by grade, ~138,000-150,000 BTU/gallon

### Power

Base unit: **Watt (W)**

Common conversions:
- **kW** (Kilowatt): 1 kW = 1,000 W
- **MW** (Megawatt): 1 MW = 1,000,000 W
- **HP** (Horsepower): 1 HP = 745.7 W
- **BTU/hr**: 1 BTU/hr = 0.293071 W
- **ton** (refrigeration): 1 ton = 3,516.85 W = 12,000 BTU/hr

**Relationship between Power and Energy:**
```
Energy = Power × Time
1 kW × 1 hour = 1 kWh
```

### Volume

Base unit: **Cubic meter (m³)**

**Liquid volumes:**
- **gallon (US)**: 1 gal = 0.00378541 m³ = 3.78541 L
- **kgal** (thousand gallons): 1 kgal = 3.78541 m³
- **liter (L)**: 1 L = 0.001 m³
- **barrel (oil)**: 1 bbl = 0.158987 m³ = 42 gal
- **cubic foot (cf)**: 1 cf = 0.0283168 m³

**Gas volumes:**
- **ccf** (hundred cubic feet): 1 ccf = 2.83168 m³
- **mcf** (thousand cubic feet): 1 mcf = 28.3168 m³
- **scf** (standard cubic foot): 1 scf = 0.0283168 m³ (at standard conditions)

**Example - Converting 5 kgal to m³:**
```
5 kgal × 3.78541 m³/kgal = 18.927 m³
```

### Mass

Base unit: **Kilogram (kg)**

Common conversions:
- **lb** (pound): 1 lb = 0.453592 kg
- **ton (short)**: 1 ton = 907.185 kg = 2,000 lb
- **tonne (metric ton)**: 1 tonne = 1,000 kg
- **oz** (ounce): 1 oz = 0.0283495 kg
- **g** (gram): 1 g = 0.001 kg
- **klb** (thousand pounds): 1 klb = 453.592 kg

**Example - Converting 2,500 lb to metric tonnes:**
```
2,500 lb × 0.453592 kg/lb = 1,133.98 kg
1,133.98 kg ÷ 1,000 kg/tonne = 1.134 tonnes
```

### Temperature

**Special handling required** - Temperature conversions require different formulas than multiplicative conversions.

**Formulas:**

**Celsius ↔ Fahrenheit:**
```
°F = (°C × 9/5) + 32
°C = (°F - 32) × 5/9
```

**Celsius ↔ Kelvin:**
```
K = °C + 273.15
°C = K - 273.15
```

**Fahrenheit ↔ Kelvin:**
```
K = (°F - 32) × 5/9 + 273.15
°F = (K - 273.15) × 9/5 + 32
```

**Examples:**
```
100°C to °F: (100 × 9/5) + 32 = 212°F
75°F to °C: (75 - 32) × 5/9 = 23.89°C
300 K to °C: 300 - 273.15 = 26.85°C
```

### Pressure

Base unit: **Pascal (Pa)**

Common conversions:
- **psi** (pounds per square inch): 1 psi = 6,894.76 Pa
- **kPa** (kilopascal): 1 kPa = 1,000 Pa
- **bar**: 1 bar = 100,000 Pa
- **atm** (atmosphere): 1 atm = 101,325 Pa
- **mmHg** (millimeters of mercury): 1 mmHg = 133.322 Pa
- **inHg** (inches of mercury): 1 inHg = 3,386.39 Pa
- **inH2O** (inches of water): 1 inH2O = 249.089 Pa

**Example - Converting 50 psi to bar:**
```
50 psi × 6,894.76 Pa/psi = 344,738 Pa
344,738 Pa ÷ 100,000 Pa/bar = 3.447 bar
```

### Area

Base unit: **Square meter (m²)**

Common conversions:
- **ft²** (square foot): 1 ft² = 0.092903 m²
- **acre**: 1 acre = 4,046.86 m²
- **hectare**: 1 hectare = 10,000 m²
- **in²** (square inch): 1 in² = 0.00064516 m²
- **km²** (square kilometer): 1 km² = 1,000,000 m²

### Length

Base unit: **Meter (m)**

Common conversions:
- **ft** (foot): 1 ft = 0.3048 m
- **in** (inch): 1 in = 0.0254 m
- **mi** (mile): 1 mi = 1,609.34 m
- **km** (kilometer): 1 km = 1,000 m
- **cm** (centimeter): 1 cm = 0.01 m
- **mm** (millimeter): 1 mm = 0.001 m
- **yd** (yard): 1 yd = 0.9144 m

### Volume Flow Rate

Base unit: **Cubic meter per second (m³/s)**

Common conversions:
- **gpm** (gallons per minute): 1 gpm = 0.0000630902 m³/s
- **cfm** (cubic feet per minute): 1 cfm = 0.000471947 m³/s
- **L/s** (liters per second): 1 L/s = 0.001 m³/s
- **gph** (gallons per hour): 1 gph = 0.00000105150 m³/s

**Example - Converting 500 gpm to cfm:**
```
500 gpm × 0.0000630902 m³/s per gpm = 0.0315451 m³/s
0.0315451 m³/s ÷ 0.000471947 m³/s per cfm = 66.84 cfm
```

### Specific Energy (Energy per Mass)

Base unit: **Joule per kilogram (J/kg)**

Common conversions:
- **BTU/lb**: 1 BTU/lb = 2,326 J/kg
- **kWh/kg**: 1 kWh/kg = 3,600,000 J/kg
- **MJ/kg**: 1 MJ/kg = 1,000,000 J/kg
- **kcal/kg**: 1 kcal/kg = 4,184 J/kg

### Volumetric Energy (Energy per Volume)

Base unit: **Joule per cubic meter (J/m³)**

Used for expressing energy density of fuels:
- **BTU/gal**: 1 BTU/gal = 278,716 J/m³
- **BTU/cf**: 1 BTU/cf = 37,259 J/m³
- **MJ/m³**: 1 MJ/m³ = 1,000,000 J/m³

### Density

Base unit: **Kilogram per cubic meter (kg/m³)**

Common conversions:
- **lb/gal**: 1 lb/gal = 119.826 kg/m³
- **lb/ft³**: 1 lb/ft³ = 16.0185 kg/m³
- **g/cm³**: 1 g/cm³ = 1,000 kg/m³
- **kg/L**: 1 kg/L = 1,000 kg/m³

### Electrical Units

**Current:**
- Base unit: **Ampere (A)**
- **mA** (milliampere): 1 mA = 0.001 A
- **kA** (kiloampere): 1 kA = 1,000 A

**Voltage:**
- Base unit: **Volt (V)**
- **mV** (millivolt): 1 mV = 0.001 V
- **kV** (kilovolt): 1 kV = 1,000 V

**Apparent Power:**
- Base unit: **Volt-ampere (VA)**
- **kVA**: 1 kVA = 1,000 VA
- **MVA**: 1 MVA = 1,000,000 VA

**Reactive Power:**
- Base unit: **Volt-ampere reactive (VAR)**
- **kVAR**: 1 kVAR = 1,000 VAR
- **MVAR**: 1 MVAR = 1,000,000 VAR

**Reactive Energy:**
- Base unit: **Volt-ampere reactive hour (VARh)**
- **kVARh**: 1 kVARh = 1,000 VARh

## Meter Data Conversion

### Source Energy vs. Site Energy

**Site Energy:** Energy consumed at the facility boundary (as measured by meters)

**Source Energy:** Total energy required to deliver site energy, including generation, transmission, and distribution losses

**Electricity Source Energy Conversion:**
```
Source Energy = Site Energy × Source Factor
```

Common source factors:
- **Electricity (US average)**: ~3.14
- **Natural gas**: ~1.05
- **Fuel oil**: ~1.01
- **Purchased steam**: ~1.45 (varies by production method)

**Example:**
```
Site electricity use: 1,000 kWh = 3.412 MMBtu site
Source energy: 3.412 MMBtu × 3.14 = 10.714 MMBtu source
```

### Energy vs. Consumption (Non-Electric)

For non-electric utilities, there's a distinction between:
- **Energy Use:** The energy content of the fuel
- **Energy Consumption:** The volume or mass of fuel consumed

**Natural Gas Example:**
```
Consumption: 100 ccf (hundred cubic feet)
Energy content: ~1.037 MMBtu/ccf
Energy use: 100 ccf × 1.037 MMBtu/ccf = 103.7 MMBtu
```

The heating value can vary:
- **HHV** (Higher Heating Value): Includes latent heat of water vapor
- **LHV** (Lower Heating Value): Excludes latent heat

VERIFI typically uses HHV for natural gas (approximately 1,037 BTU/cf).

## Conversion Utilities

### convertMeterData

Converts all meter data entries for a meter to the specified energy units.

**Process:**
1. Determine if meter measures energy directly or by proxy (volume/mass)
2. If by proxy, apply heating value to convert consumption to energy
3. Convert to target unit system
4. Apply source energy factors if specified

**Example - Natural Gas Meter:**
```
Meter reading: 150 mcf
Heating value: 1,037 BTU/cf = 1.037 MMBtu/ccf
Target units: MMBtu

Energy: 1,500 cf × 0.001037 MMBtu/cf = 1.556 MMBtu
(Note: 150 mcf = 1,500 ccf = 150,000 cf)
```

### getNeededUnits

Determines the appropriate common unit for analysis based on analysis category:
- **Energy analysis**: MMBtu (million BTU)
- **Water analysis**: kgal (thousand gallons)

## Practical Conversion Examples

### Example 1: Multi-Fuel Facility Energy Totals

Facility uses:
- Electricity: 500,000 kWh
- Natural gas: 2,000 mcf
- Fuel oil: 1,000 gallons

Convert all to MMBtu:

**Electricity:**
```
500,000 kWh × 0.003412 MMBtu/kWh = 1,706 MMBtu
```

**Natural gas:**
```
2,000 mcf = 2,000,000 cf
2,000,000 cf × 0.001037 MMBtu/cf = 2,074 MMBtu
```

**Fuel oil (#2):**
```
1,000 gal × 0.1387 MMBtu/gal = 138.7 MMBtu
```

**Total:** 1,706 + 2,074 + 138.7 = **3,918.7 MMBtu**

### Example 2: Energy Intensity Calculation

Production facility:
- Energy use: 10,000 MMBtu
- Production: 5,000 tons of product

**Energy Intensity:**
```
10,000 MMBtu / 5,000 tons = 2.0 MMBtu/ton
```

Or converting to kWh/ton:
```
10,000 MMBtu × 293.071 kWh/MMBtu = 2,930,710 kWh
2,930,710 kWh / 5,000 tons = 586.14 kWh/ton
```

### Example 3: Water Usage Conversion

Water consumption:
- Meter A: 500,000 gallons
- Meter B: 750 ccf
- Meter C: 300 m³

Convert all to kgal:

**Meter A:**
```
500,000 gal = 500 kgal
```

**Meter B:**
```
750 ccf × 100 cf/ccf = 75,000 cf
75,000 cf × 7.48052 gal/cf = 561,039 gal = 561.04 kgal
```

**Meter C:**
```
300 m³ × 264.172 gal/m³ = 79,251.6 gal = 79.25 kgal
```

**Total:** 500 + 561.04 + 79.25 = **1,140.29 kgal**

## Key Considerations

1. **Precision:** Conversion factors are maintained to sufficient precision to minimize rounding errors
2. **Chaining:** When possible, avoid chaining multiple conversions; convert directly from source to target
3. **Temperature:** Temperature conversions use additive/multiplicative formulas, not simple factors
4. **Context matters:** Source vs. site energy, HHV vs. LHV affect conversion results
5. **Consistency:** Always use the same unit system within a given analysis
6. **Regional variations:** Some conversion factors (especially for natural gas) may vary by region or supplier

## References

- NIST (National Institute of Standards and Technology) conversion factors
- EPA Energy Star Portfolio Manager technical documentation
- ASHRAE (American Society of Heating, Refrigerating and Air-Conditioning Engineers) standards
- DOE (Department of Energy) source energy factors
