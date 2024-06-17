export interface ElectricityDataFilters {
  detailedCharges: DetailedChargesFilters,
  additionalCharges: AdditionalChargesFilters,
  emissionsFilters: EmissionsFilters,
  generalInformationFilters: GeneralInformationFilters
}

export interface DetailedChargesFilters {
  showSection: boolean,
  block1: boolean,
  block2: boolean,
  block3: boolean,
  other: boolean,
  onPeak: boolean,
  offPeak: boolean,
  powerFactor: boolean
}

export interface AdditionalChargesFilters {
  showSection: boolean,
  nonEnergyCharge: boolean,
  transmissionAndDelivery: boolean,
  localSalesTax: boolean,
  stateSalesTax: boolean,
  latePayment: boolean,
  otherCharge: boolean,
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