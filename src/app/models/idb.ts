import { ElectricityDataFilter } from './electricityFilter';


export interface IdbAccount {
    //keys (id primary)
    id?: number,
    name: string,
    industry: string,
    naics: string,
    notes: string,
    img: string
}

export interface IdbFacility {
    //keys (id primary)
    id?: number,
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
    img: string,
    tableElectricityFilters?: Array<ElectricityDataFilter>,
    electricityInputFilters?: Array<ElectricityDataFilter>
    
}

export interface IdbUtilityMeterGroup {
    //keys (id primary)
    id?: number,
    facilityId: number,
    accountId: number,
    //data
    groupType: string,
    name: string,
    description: string,
    unit: string,
    dateModified: Date,
    factionOfTotalEnergy: number,
    totalEnergyUse?: number,
    groupData?: Array<IdbUtilityMeter>
}

export interface IdbUtilityMeter {
    //keys (id primary)
    id?: number,
    facilityId: number,
    accountId: number,
    groupId: number,
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
    notes: string,
    source: string,
    //group = groupName
    group: string

    startingUnit: string
    fuel:string
}

export interface IdbUtilityMeterData {
    //keys (id primary)
    id?: number,
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
    generationTransmissionCharge: number,
    transmissionCharge: number,
    powerFactorCharge: number,
    businessCharge: number,
    utilityTax: number,
    latePayment: number
}

export interface IdbPredictorEntry {
    //keys (id primary)
    id?: number,
    facilityId: number,
    accountId: number,
    //data
    // name: string,
    // description: string,
    // unit: string,
    // amount: number,
    date: Date,
    predictors: Array<PredictorData>
}


export interface PredictorData {
    name: string,
    amount: number,
    unit: string,
    description: string,
    id: string
}

