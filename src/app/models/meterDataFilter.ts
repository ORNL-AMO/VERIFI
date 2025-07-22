export interface ElectricityDataFilters {
  emissionsFilters: EmissionsFilters,
  generalInformationFilters: GeneralInformationFilters
}

export interface EmissionsFilters {
  showSection: boolean,
  marketEmissions: boolean,
  locationEmissions: boolean,
  recs: boolean,
}

export interface GeneralInformationFilters {
  showSection: boolean,
  totalCost: boolean,
  realDemand: boolean,
  billedDemand: boolean
}


export interface GeneralUtilityDataFilters{
  totalVolume: boolean,
  totalCost: boolean,
  commodityCharge: boolean,
  deliveryCharge: boolean,
  otherCharge: boolean,
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
  otherCharge: boolean,
}