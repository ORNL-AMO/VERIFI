import { ElectricityDataFilters } from './electricityFilter';
import { SustainabilityQuestions } from './sustainabilityQuestions';

export interface IdbAccount {
    //keys (id primary)
    id?: number,
    name: string,
    country: string,
    city: string,
    state: string,
    zip: number,
    address: string,
    size: number,
    naics: string,
    notes: string,
    img: string
    unitsOfMeasure: string,
    energyUnit: string,
    massUnit: string,
    volumeLiquidUnit: string,
    volumeGasUnit: string,
    chilledWaterUnit: string,
    sustainabilityQuestions: SustainabilityQuestions,
    fiscalYear: string,
    fiscalYearMonth: string,
    fiscalYearCalendarEnd: boolean,
    setupWizard: boolean,
    setupWizardComplete: boolean,
    numberOfFacilities?: string
}

export interface IdbFacility {
    //keys (id primary)
    id?: number,
    accountId: number,
    //data
    name: string,
    country: string,
    city: string,
    state: string,
    zip: number,
    address: string,
    naics: string,
    type: string,
    size: number,
    units: string,
    notes: string,
    img: string,
    tableElectricityFilters?: ElectricityDataFilters,
    electricityInputFilters?: ElectricityDataFilters,
    //units
    unitsOfMeasure: string,
    energyUnit: string,
    massUnit: string,
    volumeLiquidUnit: string,
    volumeGasUnit: string,
    chilledWaterUnit: string,
    sustainabilityQuestions: SustainabilityQuestions,
    fiscalYear: string,
    fiscalYearMonth: string,
    fiscalYearCalendarEnd: boolean,
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
    dateModified: Date,
    factionOfTotalEnergy: number,
    totalEnergyUse?: number,
    totalConsumption?: number,
    groupData?: Array<IdbUtilityMeter>,
    visible?: boolean
}

export interface IdbUtilityMeter {
    //keys (id primary)
    id?: number,
    facilityId: number,
    accountId: number,
    groupId: number,
    //data
    meterNumber: string,
    accountNumber: number,
    phase: string,
    heatCapacity: number,
    siteToSource: number,
    name: string,
    location: string,
    supplier: string,
    notes: string,
    source: string,
    //group = groupName
    group: string

    startingUnit: string,
    energyUnit: string,
    fuel:string
    visible?: boolean
    importWizardName?: string
}

export interface IdbUtilityMeterData {
    //keys (id primary)
    id?: number,
    meterId: number,
    facilityId: number,
    accountId: number,
    //data
    readDate: Date,
    totalVolume: number,
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
    latePayment: number,
    meterNumber?: string,
    totalImportConsumption?: number
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
    id: string,
    importWizardName?: string
}

