
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
  locationElectricityEmissions: number,
  marketElectricityEmissions: number,
  otherScope2Emissions: number,
  scope2LocationEmissions: number,
  scope2MarketEmissions: number,
  excessRECs: number,
  excessRECsEmissions: number,
  mobileCarbonEmissions: number,
  mobileBiogenicEmissions: number,
  mobileOtherEmissions: number,
  mobileTotalEmissions: number,
  fugitiveEmissions: number,
  processEmissions: number,
  stationaryEmissions: number,
  totalScope1Emissions: number,
  totalWithMarketEmissions: number,
  totalWithLocationEmissions: number,
}



export type EmissionsTypes = 'Scope 1: Stationary' | 'Scope 1: Mobile' | 'Scope 1: Fugitive' | 'Scope 1: Process' | 'Scope 2: Electricity (Location)' | 'Scope 2: Electricity (Market)' | 'Scope 2: Other';

export function getEmissionsTypeColor(emissionsType: EmissionsTypes): string {
  if (emissionsType == 'Scope 1: Fugitive') {
    return '#AB0005';
  } else if (emissionsType == 'Scope 2: Electricity (Location)') {
    return '#B9770E';
  } else if (emissionsType == 'Scope 2: Electricity (Market)') {
    return '#9A7D0A';
  } else if (emissionsType == 'Scope 1: Mobile') {
    return '#99A3A4';
  } else if (emissionsType == 'Scope 1: Process') {
    return '#8E44AD';
  } else if (emissionsType == 'Scope 1: Stationary') {
    return '#515A5A';
  } else if (emissionsType == 'Scope 2: Other') {
    return '#A04000';
  } 
}

export function getEmissionsTypes(emissionsDisplay: 'location' | 'market'): Array<EmissionsTypes> {
  let emissionsTypes: Array<EmissionsTypes> = ['Scope 1: Stationary', 'Scope 1: Mobile', 'Scope 1: Fugitive', 'Scope 1: Process', 'Scope 2: Other'];
  if (emissionsDisplay == 'location') {
    emissionsTypes.push('Scope 2: Electricity (Location)');
  } else {
    emissionsTypes.push('Scope 2: Electricity (Market)');
  }
  return emissionsTypes;
}