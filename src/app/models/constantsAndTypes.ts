
export type MeterSource = "Electricity" | "Natural Gas" | "Other Fuels" | "Other Energy" | "Water Intake" | "Water Discharge" | "Other Utility";
export type MeterPhase = "Solid" | "Liquid" | "Gas";
export type ReportType = "betterPlants" | 'dataOverview';
export type WaterIntakeType = "Municipal (Potable)" | "Municipal (Non-potable)" | "River/Lake" | "Ocean/Tide" | "Ground" | "Other";
export type WaterDischargeType = "Municipal Sewer" | "Industrial Sewer" | "Third-party disposal" | "River/Lake" | "Ocean/Tide" | "Groundwater" | "Onsite Disposal" | "Stormwater to Sewer";


export const EnergySources: Array<MeterSource> = ["Electricity", "Natural Gas", "Other Fuels", "Other Energy"];
export const AllSources: Array<MeterSource> = ["Electricity", "Natural Gas", "Other Fuels", "Other Energy", "Water Intake", "Water Discharge", "Other Utility"];
export const WaterSources: Array<MeterSource> = ["Water Intake", "Water Discharge"];
export const WaterIntakeTypes: Array<WaterIntakeType> = ["Municipal (Potable)", "Municipal (Non-potable)", "River/Lake", "Ocean/Tide", "Ground", "Other"];
export const WaterDischargeTypes: Array<WaterDischargeType> = ["Municipal Sewer", "Industrial Sewer", "Third-party disposal", "River/Lake", "Ocean/Tide", "Groundwater", "Onsite Disposal", "Stormwater to Sewer"];