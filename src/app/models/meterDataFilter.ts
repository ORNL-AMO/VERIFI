export interface ElectricityDataFilters {
  emissionsFilters: EmissionsFilters,
  generalInformationFilters: GeneralInformationFilters
}

export interface EmissionsFilters {
  showSection: boolean,
  marketEmissions: boolean,
  locationEmissions: boolean,
  recs: boolean,
  excessRECs: boolean,
  excessRECsEmissions: boolean
}

export interface GeneralInformationFilters {
  showSection: boolean,
  totalCost: boolean,
  realDemand: boolean,
  billedDemand: boolean
  powerFactor: boolean
}


export interface GeneralUtilityDataFilters{
  totalVolume: boolean,
  totalCost: boolean,
  stationaryBiogenicEmmissions: boolean,
  stationaryCarbonEmissions: boolean,
  stationaryOtherEmissions: boolean,
  totalEmissions: boolean,
}


export interface VehicleDataFilters{
  totalEnergy: boolean,
  totalCost: boolean,
  mobileBiogenicEmissions: boolean,
  mobileCarbonEmissions: boolean,
  mobileOtherEmissions: boolean,
  mobileTotalEmissions: boolean,
}