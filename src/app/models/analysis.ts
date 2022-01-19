import { AnalysisGroup } from "./idb";

export interface AnnualGroupSummary {
    year: number,
    totalEnergy: number,
    totalEnergySavings: number,
    annualEnergySavings: number,
    totalProduction: number,
    annualProductionChange: number,
    totalProductionChange: number,
    energyIntensity: number,
    totalEnergyIntensityChange: number,
    annualEnergyIntensityChange: number,
    group: AnalysisGroup
  }
  
  
  export interface MonthlyGroupSummary {
    date: Date,
    energyUse: number,
    production: number,
    energyIntensity: number,
    fiscalYear: number
  }
  
  
  export interface FacilityYearGroupSummary {
    year: number,
    group: AnalysisGroup,
    percentBaseline: number,
    energyIntensity: number,
    annualEnergyIntensityChange: number,
    energyIntensityImprovement: number,
    improvementContribution: number,
    totalEnergySavings: number,
    annualEnergySavings: number,
    totalEnergy: number,
    totalProduction: number
  }
  
  export interface FacilityGroupSummary {
    yearGroupSummaries: Array<FacilityYearGroupSummary>
    totals: {
      year: number,
      improvementContribution: number,
      totalSavings: number,
      newSavings: number,
      energyIntensity: number,
      annualEnergyIntensityChange: number,
      energyIntensityImprovement: number,
      totalEnergy: number,
      totalProduction: number,
      totalEnergySavings: number,
      annualEnergySavings: number
    }
  }