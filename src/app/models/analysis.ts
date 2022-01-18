import { AnalysisGroup } from "./idb";

export interface AnnualGroupSummary {
    year: number,
    totalEnergy: number,
    totalEnergySavings: number,
    newEnergySavings: number,
    totalProduction: number,
    productionChange: number,
    energyIntensity: number,
    cumulativeEnergyIntensityChange: number,
    annualEnergyIntensityChange: number,
    group: AnalysisGroup
  }
  
  
  export interface MonthlyGroupSummary {
    date: Date,
    energyUse: number,
    production: number,
    energyIntensity: number
  }
  
  
  export interface FacilityYearGroupSummary {
    year: number,
    group: AnalysisGroup,
    percentBaseline: number,
    energyIntensityImprovement: number,
    improvementContribution: number,
    totalSavings: number,
    newSavings: number
  }
  
  export interface FacilityGroupSummary {
    yearGroupSummaries: Array<FacilityYearGroupSummary>
    totals: {
      improvementContribution: number,
      totalSavings: number,
      newSavings: number,
      energyIntensityImprovement: number
    }
  }