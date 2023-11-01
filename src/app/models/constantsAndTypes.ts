
export type MeterSource = "Electricity" | "Natural Gas" | "Other Fuels" | "Other Energy" | "Water Intake" | "Water Discharge" | "Other Utility";
export type MeterPhase = "Solid" | "Liquid" | "Gas";
export type ReportType = "betterPlants" | 'dataOverview' | 'performance' | 'betterClimate';
export type WaterIntakeType = "Municipal (Potable)" | "Municipal (Non-potable)" | "Surface Freshwater" | "Ground Freshwater" | "Salt Water" | "Other Freshwater" | "Rainwater" | "Externally Recycled Water" | "Other";
export type WaterDischargeType = "Municipal Sewer" | "Industrial Sewer" | "Third-party disposal" | "River/Lake" | "Ocean/Tide" | "Groundwater" | "Onsite Disposal" | "Stormwater to Sewer";
export type FacilityClassification = "Manufacturing" | "Warehouse" | "Office" | "Labs / R&D" | "Storefront" | "Hospital";

export const EnergySources: Array<MeterSource> = ["Electricity", "Natural Gas", "Other Fuels", "Other Energy"];
export const AllSources: Array<MeterSource> = ["Electricity", "Natural Gas", "Other Fuels", "Other Energy", "Water Intake", "Water Discharge", "Other Utility"];
export const WaterSources: Array<MeterSource> = ["Water Intake", "Water Discharge"];
export const WaterIntakeTypes: Array<WaterIntakeType> = ["Municipal (Potable)", "Municipal (Non-potable)", "Surface Freshwater", "Ground Freshwater", "Salt Water", "Other Freshwater", "Rainwater", "Externally Recycled Water", "Other"];
export const WaterDischargeTypes: Array<WaterDischargeType> = ["Municipal Sewer", "Industrial Sewer", "Third-party disposal", "River/Lake", "Ocean/Tide", "Groundwater", "Onsite Disposal", "Stormwater to Sewer"];
export const FacilityClassifications: Array<FacilityClassification> = ["Manufacturing", "Warehouse", "Office", "Labs / R&D", "Storefront", "Hospital"];
