import { DBConfig } from "ngx-indexed-db";

export const dbConfig: DBConfig = {
  name: 'verifi',
  version: 11,
  objectStoresMeta: [{
    store: 'accounts',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'industry', keypath: 'industry', options: { unique: false } },
      { name: 'naics', keypath: 'naics', options: { unique: false } },
      { name: 'notes', keypath: 'notes', options: { unique: false } },
      { name: 'img', keypath: 'img', options: { unique: false } }
    ]
  },
  {
    store: 'facilities',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      // { name: 'facilityId', keypath: 'facilityId', options: { unique: true} },
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'country', keypath: 'country', options: { unique: false } },
      { name: 'state', keypath: 'state', options: { unique: false } },
      { name: 'address', keypath: 'address', options: { unique: false } },
      { name: 'type', keypath: 'type', options: { unique: false } },
      { name: 'tier', keypath: 'tier', options: { unique: false } },
      { name: 'size', keypath: 'size', options: { unique: false } },
      { name: 'units', keypath: 'units', options: { unique: false } },
      { name: 'division', keypath: 'division', options: { unique: false } },
      { name: 'img', keypath: 'img', options: { unique: false } }
    ]
  },
  {
    store: 'utilityMeter',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      // { name: 'meterid', keypath: 'meterid', options: { unique: true} },
      { name: 'facilityId', keypath: 'facilityId', options: { unique: false } },
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
      { name: 'groupId', keypath: 'groupId', options: { unique: false } },
      { name: 'meterNumber', keypath: 'meterNumber', options: { unique: false } },
      { name: 'accountNumber', keypath: 'accountNumber', options: { unique: false } },
      { name: 'type', keypath: 'type', options: { unique: false } },
      { name: 'phase', keypath: 'phase', options: { unique: false } },
      { name: 'unit', keypath: 'unit', options: { unique: false } },
      { name: 'heatCapacity', keypath: 'heatCapacity', options: { unique: false } },
      { name: 'siteToSource', keypath: 'siteToSource', options: { unique: false } },
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'location', keypath: 'notes', options: { unique: false } },
      { name: 'supplier', keypath: 'supplier', options: { unique: false } },
      { name: 'notes', keypath: 'notes', options: { unique: false } }
    ]
  },
  {
    store: 'utilityMeterData',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'meterId', keypath: 'meterId', options: { unique: false } },
      { name: 'facilityId', keypath: 'facilityId', options: { unique: false } },
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
      { name: 'readDate', keypath: 'readDate', options: { unique: false } },
      { name: 'unit', keypath: 'unit', options: { unique: false } },
      { name: 'totalEnergyUse', keypath: 'totalEnergyUse', options: { unique: false } },
      { name: 'totalCost', keypath: 'totalCost', options: { unique: false } },
      { name: 'commodityCharge', keypath: 'commodityCharge', options: { unique: false } },
      { name: 'deliveryCharge', keypath: 'deliveryCharge', options: { unique: false } },
      { name: 'otherCharge', keypath: 'otherCharge', options: { unique: false } },
      { name: 'checked', keypath: 'checked', options: { unique: false } },
      // Electricity Use Only
      { name: 'totalDemand', keypath: 'totalDemand', options: { unique: false } },
      { name: 'basicCharge', keypath: 'basicCharge', options: { unique: false } },
      { name: 'supplyBlockAmount', keypath: 'supplyBlockAmount', options: { unique: false } },
      { name: 'supplyBlockCharge', keypath: 'supplyBlockCharge', options: { unique: false } },
      { name: 'flatRateAmount', keypath: 'flatRateAmount', options: { unique: false } },
      { name: 'flatRateCharge', keypath: 'flatRateCharge', options: { unique: false } },
      { name: 'peakAmount', keypath: 'peakAmount', options: { unique: false } },
      { name: 'peakCharge', keypath: 'peakCharge', options: { unique: false } },
      { name: 'offPeakAmount', keypath: 'offPeakAmount', options: { unique: false } },
      { name: 'offPeakCharge', keypath: 'offPeakCharge', options: { unique: false } },
      { name: 'demandBlockAmount', keypath: 'demandBlockAmount', options: { unique: false } },
      { name: 'demandBlockCharge', keypath: 'demandBlockCharge', options: { unique: false } },
      { name: 'generalTransCharge', keypath: 'generalTransCharge', options: { unique: false } },
      { name: 'transCharge', keypath: 'transCharge', options: { unique: false } },
      { name: 'powerFactorCharge', keypath: 'powerFactorCharge', options: { unique: false } },
      { name: 'businessCharge', keypath: 'businessCharge', options: { unique: false } },
      { name: 'utilityTax', keypath: 'utilityTax', options: { unique: false } },
      { name: 'latePayment', keypath: 'latePayment', options: { unique: false } }
    ]
  },
  {
    store: 'utilityMeterGroups',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      // { name: 'groupid', keypath: 'groupid', options: { unique: false } },
      { name: 'facilityId', keypath: 'facilityId', options: { unique: false } },
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
      { name: 'groupType', keypath: 'groupType', options: { unique: false } },
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'description', keypath: 'description', options: { unique: false } },
      { name: 'unit', keypath: 'unit', options: { unique: false } },
      // { name: 'data', keypath: 'data', options: { unique: false } },
      { name: 'dateModified', keypath: 'dateModified', options: { unique: false } },
      { name: 'factionOfTotalEnergy', keypath: 'factionOfTotalEnergy', options: { unique: false } }
    ]
  },
  {
    store: 'predictors',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'facilityId', keypath: 'facilityId', options: { unique: false } },
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'description', keypath: 'description', options: { unique: false } },
      { name: 'unit', keypath: 'unit', options: { unique: false } },
      { name: 'date', keypath: 'date', options: { unique: false } },
      { name: 'amount', keypath: 'amount', options: { unique: false } }
    ]
  },
  {
    store: 'overviewReportOptions',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
    ]
  },
  {
    store: 'analysisItems',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
      { name: 'facilityId', keypath: 'facilityId', options: { unique: false } },
    ]
  },
  {
    store: 'accountAnalysisItems',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
    ]
  },
  {
    store: 'customEmissionsItems',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'accountId', keypath: 'accountId', options: { unique: false } },
    ]
  }]
};