export interface ElectricityDataFilters {
  showTotalDemand: boolean,
  supplyDemandCharge: SupplyDemandChargeFilters,
  taxAndOther: TaxAndOtherFilters
}

export interface SupplyDemandChargeFilters {
  showSection: boolean,
  supplyBlockAmount: boolean,
  supplyBlockCharge: boolean,
  flatRateAmount: boolean,
  flatRateCharge: boolean,
  peakAmount: boolean,
  peakCharge: boolean,
  offPeakAmount: boolean,
  offPeakCharge: boolean,
  demandBlockAmount: boolean,
  demandBlockCharge: boolean,

}

export interface TaxAndOtherFilters {
  showSection: boolean,
  utilityTax: boolean,
  latePayment: boolean,
  otherCharge: boolean,
  basicCharge: boolean,
  generationTransmissionCharge: boolean,
  deliveryCharge: boolean,
  transmissionCharge: boolean,
  powerFactorCharge: boolean,
  businessCharge: boolean
}