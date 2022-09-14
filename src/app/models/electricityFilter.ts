export interface ElectricityDataFilters {
  detailedCharges: DetailedChargesFilters,
  additionalCharges: AdditionalChargesFilters
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
