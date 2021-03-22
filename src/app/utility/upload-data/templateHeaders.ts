/*
    Header values for .csv templates
    Order matters
*/


export const MeterHeaders: Array<string> = [
    "Meter Number",
    "Account Number",
    "Source",
    "Meter Name",
    "Utility Supplier",
    "Notes",
    "Building / Location",
    "Meter Group",
    "Collection Unit",
    "Phase",
    "Fuel",
    "Heat Capacity",
    "Site To Source"
];

export const ElectricityMeterDataHeaders: Array<string> = [
    "Meter Number",
    "Read Date",
    "Total Energy",
    "Total Demand",
    "Total Cost",
    "Basic Charge",
    "Supply Block Amount",
    "Supply Block Charge",
    "Flat Rate Amount",
    "Flat Rate Charge",
    "Peak Amount",
    "Peak Charge",
    "Off Peak Amount",
    "Off Peak Charge",
    "Demand Block Amount",
    "Demand Block Charge",
    "Generation and Transmission Charge",
    "Delivery Charge",
    "Transmission Charge",
    "Power Factor Charge",
    "Local Business Charge",
    "Local Utility Tax",
    "Late Payment",
    "Other Charge"
];

export const NonElectricityMeterDataHeaders: Array<string> = [
    "Meter Number",
    "Read Date",
    "Total Consumption",
    "Total Cost",
    "Commodity Charge",
    "Delivery Charge",
    "Other Charge"
];