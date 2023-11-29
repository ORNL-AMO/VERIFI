
export interface SubRegionData {
    zip: number,
    state: string,
    co2Emissions?: number,
    subregions?: Array<string>
}

export interface SubregionEmissions {
    subregion: string,
    locationEmissionRates: Array<{ co2Emissions: number, year: number }>,
    residualEmissionRates: Array<{ co2Emissions: number, year: number }>,
    isCustom?: boolean
}

export interface EmissionsResults {
  RECs: number, 
  locationEmissions: number, 
  marketEmissions: number, 
  excessRECs: number, 
  excessRECsEmissions: number,
  mobileCarbonEmissions: number,
  mobileBiogenicEmissions: number,
  mobileOtherEmissions: number,
  mobileTotalEmissions: number,
  fugitiveEmissions: number,
  processEmissions: number
}