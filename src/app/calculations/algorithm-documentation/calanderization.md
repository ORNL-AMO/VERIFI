# Calanderization (Meter Data Normalization)

## Overview

Calanderization is the process of converting utility billing data from variable billing periods to standardized calendar months. Utility meters often have billing cycles that don't align with calendar months, and billing periods can vary in length. Calanderization normalizes this data to enable consistent month-to-month comparisons and accurate analysis.

## The Problem

**Typical billing challenges:**
- Billing periods span across calendar months (e.g., Jan 15 - Feb 14)
- Billing period lengths vary (28-35 days)
- Multiple meters may have different billing cycles
- Analysis requires consistent monthly data

**Example:**
```
Electric meter bill: Jan 15 - Feb 14 (31 days)
Usage: 10,000 kWh
Cost: $1,200

This spans two calendar months:
- January: 17 days (Jan 15-31)
- February: 14 days (Feb 1-14)
```

## Calanderization Methodology

### Basic Approach

Calanderization distributes utility usage, cost, and other metrics across calendar months proportionally based on the number of days in each month.

**Formula:**
```
Usage_month = Usage_bill × (Days_in_month / Days_in_bill)
```

### Daily Rate Calculation

**Step 1: Calculate daily rate for the billing period**
```
Daily_rate = Usage_bill / Days_bill
```

**Step 2: Allocate to calendar months**
```
Usage_month_i = Daily_rate × Days_overlap_i
```

Where `Days_overlap_i` is the number of days in month i that overlap with the billing period.

### Detailed Example

**Billing period:** January 15 - February 14 (31 days)
- **Usage:** 10,000 kWh
- **Cost:** $1,200

**Step 1: Calculate daily rates**
```
Daily_usage = 10,000 kWh / 31 days = 322.58 kWh/day
Daily_cost = $1,200 / 31 days = $38.71/day
```

**Step 2: Allocate to January**
```
Days in January (Jan 15-31): 17 days
January_usage = 322.58 kWh/day × 17 days = 5,484 kWh
January_cost = $38.71/day × 17 days = $658
```

**Step 3: Allocate to February**
```
Days in February (Feb 1-14): 14 days
February_usage = 322.58 kWh/day × 14 days = 4,516 kWh
February_cost = $38.71/day × 14 days = $542
```

**Verification:**
```
Total: 5,484 + 4,516 = 10,000 kWh ✓
Total cost: $658 + $542 = $1,200 ✓
```

## Calanderization Process

### Step 1: Identify Billing Period Boundaries

Parse bill start and end dates:
```
Start: readDate of current bill
End: readDate of next bill (or current bill readDate if it's the last bill)
```

### Step 2: Determine Overlapping Months

Identify which calendar months the billing period touches:
```
if (bill_start.month == bill_end.month):
    Single month bill
else:
    Multi-month bill spanning bill_start.month to bill_end.month
```

### Step 3: Calculate Days in Each Month

For each overlapping month:
```
if (month == bill_start.month):
    days = days_remaining_in_month(bill_start)
else if (month == bill_end.month):
    days = day_of_month(bill_end)
else:
    days = days_in_month(month)
```

### Step 4: Calculate Total Days in Bill

```
Total_days_bill = (bill_end_date - bill_start_date) + 1
```
Note: Add 1 to include both start and end dates.

### Step 5: Distribute Values Proportionally

For each month and each metric (usage, cost, demand, etc.):
```
Month_value = Bill_value × (Days_in_month / Total_days_bill)
```

## Handling Different Meter Types

### Electric Meters

**Key metrics to calanderize:**
- **Energy use (kWh):** Distributed proportionally by days
- **Demand (kW):** Typically kept as-is for each month (peak demand is not averaged)
- **Cost ($):** Distributed proportionally by days
- **Power factor:** Averaged across touched months

**Special handling for demand:**
```
Monthly_demand = MAX(Bill_demand for all bills touching that month)
```

Demand represents the peak, so we use the maximum value, not a proportional allocation.

### Natural Gas Meters

**Key metrics:**
- **Consumption (ccf, mcf, therms):** Distributed proportionally
- **Energy use (MMBtu):** Calculated from consumption using heating value
- **Cost:** Distributed proportionally

**Heating value application:**
```
Energy_use = Consumption × Heating_value
```

Applied after calanderization if heating value is known.

### Water Meters

**Key metrics:**
- **Consumption (gallons, kgal):** Distributed proportionally
- **Cost:** Distributed proportionally
- **Sewer charges:** Often based on water consumption, distributed similarly

### Steam and Other Meters

Follow similar proportional distribution for:
- Volume/mass consumed
- Energy content
- Cost

## Complex Calanderization Scenarios

### Scenario 1: Bill Spanning Three Months

**Billing period:** January 20 - March 15 (55 days)
- **Usage:** 16,500 kWh
- **Cost:** $1,980

**Calculation:**

**Daily rates:**
```
Daily_usage = 16,500 / 55 = 300 kWh/day
Daily_cost = $1,980 / 55 = $36/day
```

**January (Jan 20-31):** 12 days
```
Usage = 300 × 12 = 3,600 kWh
Cost = $36 × 12 = $432
```

**February (Feb 1-28):** 28 days
```
Usage = 300 × 28 = 8,400 kWh
Cost = $36 × 28 = $1,008
```

**March (Mar 1-15):** 15 days
```
Usage = 300 × 15 = 4,500 kWh
Cost = $36 × 15 = $540
```

**Verification:**
```
Total: 3,600 + 8,400 + 4,500 = 16,500 kWh ✓
Total cost: $432 + $1,008 + $540 = $1,980 ✓
```

### Scenario 2: Multiple Bills in One Month

When multiple bills fall entirely within a single calendar month, sum them:

**January bills:**
- Bill 1 (Jan 1-15): 5,000 kWh
- Bill 2 (Jan 16-31): 6,000 kWh

**January total:** 11,000 kWh

### Scenario 3: Missing Bill Data

If a bill is missing:
1. **Interpolation:** Estimate based on adjacent periods
2. **Previous year:** Use same month from previous year if available
3. **Average:** Use average of available surrounding months

**Linear interpolation formula:**
```
Missing_usage = (Previous_usage + Next_usage) / 2
```

Adjust for different period lengths if necessary.

### Scenario 4: Estimated Bills

Utility companies sometimes provide estimated readings. Handle these by:
1. Marking data as estimated in the system
2. When actual bill arrives, retroactively adjust previous months
3. Apply "wash" adjustment to correct the estimation error

**Wash adjustment:**
```
Adjustment = Actual_bill - Sum(Estimated_bills)
Distribute adjustment proportionally across estimated months
```

## Special Considerations

### Leap Years

February has 29 days in leap years:
```
if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)):
    February_days = 29
else:
    February_days = 28
```

### Fiscal Years

When facility uses a fiscal year different from calendar year:
1. Calanderize to calendar months first
2. Then aggregate calendar months into fiscal year periods

**Example: October-September fiscal year**
```
FY 2024: Oct 2023 through Sep 2024
Aggregate calanderized data for these 12 calendar months
```

### Time Zones and Daylight Saving

Use UTC dates to avoid daylight saving time complications:
```
All dates stored as UTC midnight
Calculations use UTC to avoid time zone issues
```

### Read Dates vs. Bill Dates

**Read date:** Date meter was actually read
**Bill date:** Date bill was issued (may be days later)

**Use read dates for calanderization:**
```
Start: Current bill read date
End: Next bill read date
```

## Data Quality Checks

### Validation Rules

**1. Date continuity:**
```
Next_bill_start == Current_bill_end + 1 day
```

If gap exists, data may be missing.

**2. Reasonable bill length:**
```
25 days ≤ Bill_length ≤ 35 days (for monthly bills)
```

Flag bills outside this range for review.

**3. Usage reasonableness:**
```
if (Bill_usage > 2 × Average_usage or Bill_usage < 0.5 × Average_usage):
    Flag for review
```

**4. Cost per unit check:**
```
Cost_per_unit = Bill_cost / Bill_usage
if (Cost_per_unit outside expected range):
    Flag for review
```

### Handling Data Gaps

**Gap between bills:**
```
Bill 1 end: January 15
Bill 2 start: January 25
Gap: 9 days
```

**Options:**
1. Assume zero usage during gap (conservative)
2. Interpolate linearly between bills
3. Flag and request actual data

### Overlapping Bills (Data Error)

If bills overlap:
```
Bill 1 end: January 25
Bill 2 start: January 20
Overlap: 5 days
```

This indicates a data entry error. Resolution:
1. Review source documents
2. Correct dates
3. If unable to resolve, prioritize more recent entry

## Performance Optimization

### Caching

Pre-calculate and cache:
- Days in each month for each year
- Month boundaries for fiscal years
- Daily rates for each bill

### Batch Processing

Process multiple meters simultaneously:
```
For each facility:
    For each meter in facility:
        Calanderize all bills for meter
    Aggregate calanderized data
```

## Output Format

### MonthlyData Structure

Each calanderized month produces:
```
{
    date: Date (first day of month)
    year: Fiscal year
    fiscalYear: Fiscal year number
    energyUse: Number (in consistent units)
    energyConsumption: Number (volume/mass if different from energy)
    energyCost: Number
    demandUsage: Number (peak demand)
    demandCost: Number
    totalCost: Number
    emissions: EmissionsResults (calculated separately)
}
```

## Integration with Analysis

After calanderization:
1. **Monthly data is normalized** to calendar months
2. **Consistent time boundaries** enable month-to-month comparison
3. **Aggregation to fiscal years** maintains accuracy
4. **Analysis calculations** can proceed with standardized monthly data

**Fiscal year aggregation:**
```
FY_total = Σ(Calanderized_monthly_data for months in FY)
```

## Example: Complete Calanderization

**Scenario:** Electric meter with quarterly bills

**Bills:**
- Q1: Oct 1 - Dec 31 (92 days), 27,600 kWh, $3,312
- Q2: Jan 1 - Mar 31 (90 days), 27,000 kWh, $3,240

**Calanderize Q1:**

Daily rate: 27,600 / 92 = 300 kWh/day, $3,312 / 92 = $36/day

- **October (31 days):** 300 × 31 = 9,300 kWh, $36 × 31 = $1,116
- **November (30 days):** 300 × 30 = 9,000 kWh, $36 × 30 = $1,080
- **December (31 days):** 300 × 31 = 9,300 kWh, $36 × 31 = $1,116

Verify: 9,300 + 9,000 + 9,300 = 27,600 kWh ✓

**Calanderize Q2:**

Daily rate: 27,000 / 90 = 300 kWh/day, $3,240 / 90 = $36/day

- **January (31 days):** 300 × 31 = 9,300 kWh, $36 × 31 = $1,116
- **February (28 days):** 300 × 28 = 8,400 kWh, $36 × 28 = $1,008
- **March (31 days):** 300 × 31 = 9,300 kWh, $36 × 31 = $1,116

Verify: 9,300 + 8,400 + 9,300 = 27,000 kWh ✓

**Result:** Six months of normalized calendar month data ready for analysis.

## Key Takeaways

1. **Proportional distribution** by days is the fundamental principle
2. **Demand values** are treated differently (maximum, not proportional)
3. **Data quality checks** are essential before calanderization
4. **Fiscal year alignment** happens after calanderization
5. **Edge cases** (gaps, overlaps, estimates) require special handling
6. **Validation** ensures accurate results and identifies data issues
7. **Calanderization is a prerequisite** for all subsequent analysis calculations
