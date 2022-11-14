import { JStatRegressionModel } from "./analysis"


export interface HeatMapData {
  resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number>, monthlyEmissions: Array<number> }>,
  months: Array<string>,
  years: Array<number>,
  facilityName: string
}


export interface PlotDataItem {
  label: string,
  values: Array<number>,
  valueDates: Array<Date>,
  isMeter: boolean
}

export interface RegressionTableDataItem {
  optionOne: string,
  optionTwo: string,
  r2Value: number,
  //result from regression library
  pValue: number,
  jstatModel: JStatRegressionModel
}


export interface FacilityBarChartData {
  time: string, 
  energyUse: number, 
  energyCost: number, 
  marketEmissions: number,
  locationEmissions: number,
  consumption: number,
  year: number,
  fiscalYear: number
}