

export interface IdbAccount {
    //keys (id primary)
    id: number,
    name: string,
    industry: string,
    naics: string,
    notes: string,
    img: string
}

export interface IdbFacility {
    //keys (id primary)
    id: number,
    accountId: number,
    //data
    name: string,
    country: string,
    state: string,
    address: string,
    type: string,
    tier: number,
    size: number,
    units: string,
    division: string,
    img: string
}

export interface IdbUtilityMeterGroup {
    //keys (id primary)
    id: number,
    facilityId: number,
    accountId: number,
    //data
    groupType: number,
    name: string,
    description: string,
    unit: string,
    dateModified: Date,
    factionOfTotalEnergy: number
}

export interface IdbUtilityMeter {
    //keys (id primary)
    id: number,
    facilityId: number,
    accountId: number,
    groupId: string,
    //data
    meterNumber: number,
    accountNumber: number,
    type: string,
    phase: string,
    unit: string,
    heatCapacity: string,
    siteToSource: string,
    name: string,
    location: number,
    supplier: string,
    notes: string
}

export interface IdbUtilityMeterData {
    //keys (id primary)
    id: number,
    meterId: number,
    facilityId: number,
    accountId: number,
    //data
    readDate: Date,
    unit: string,
    totalEnergyUse: number,
    totalCost: number,
    commodityCharge: number,
    deliveryCharge: number,
    otherCharge: number,
    checked: boolean,
    totalDemand: number,
    basicCharge: number,
    supplyBlockAmount: number,
    supplyBlockCharge: number,
    flatRateAmount: number,
    flatRateCharge: number,
    peakAmount: number,
    peakCharge: number,
    offPeakAmount: number,
    offPeakCharge: number,
    demandBlockAmount: number,
    demandBlockCharge: number,
    //trans?
    generalTransCharge: number,
    transCharge: number,
    powerFactorCharge: number,
    businessCharge: number,
    utilityTax: number,
    latePayment: number
}

export interface IdbPredictors {
    //keys (id primary)
    id: number,
    facilityId: number,
    accountId: number,
    //data
    name: string,
    unit: string,
    month: string,
    year: number,
    amount: number
}