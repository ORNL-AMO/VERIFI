
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

export type EmissionsTypes = 'Mobile' | 'Fugitive' | 'Process' | 'Location' | 'Market';


export function getEmissionsTypeColor(emissionsType: EmissionsTypes): string {
  if (emissionsType == 'Fugitive') {
    return '#AB0005';
  } else if (emissionsType == 'Location') {
    return '#4A235A';
  } else if (emissionsType == 'Market') {
    return '#A04000';
  } else if (emissionsType == 'Mobile') {
    return '#99A3A4';
  } else if (emissionsType == 'Process') {
    return '#9A7D0A';
  }
}