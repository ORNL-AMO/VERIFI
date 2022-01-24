import { CalanderizedMeter, MonthlyData } from './calanderization';
import { ElectricityDataFilters } from './electricityFilter';
import { ReportOptions } from './overview-report';
import { SustainabilityQuestions } from './sustainabilityQuestions';

export interface IdbAccount {
    //keys (id primary)
    id?: number,
    name: string,
    country: string,
    city: string,
    state: string,
    zip: string,
    address: string,
    size?: number,
    naics1: string,
    naics2: string,
    naics3: string,
    notes: string,
    img: string
    unitsOfMeasure: string,
    energyUnit: string,
    massUnit: string,
    volumeLiquidUnit: string,
    volumeGasUnit: string,
    sustainabilityQuestions: SustainabilityQuestions,
    fiscalYear: "calendarYear" | "nonCalendarYear",
    fiscalYearMonth: number,
    fiscalYearCalendarEnd: boolean,
    setupWizard: boolean,
    setupWizardComplete: boolean,
    numberOfFacilities?: string,
    energyIsSource: boolean,
    lastBackup?: Date,
    emissionsOutputRate?: number,
    eGridSubregion?: string,
    customEmissionsRate?: boolean,
    color?: string
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
    zip: string,
    address: string,
    naics1: string,
    naics2: string,
    naics3: string,
    type?: string,
    size?: number,
    units?: string,
    notes: string,
    img?: string,
    tableElectricityFilters?: ElectricityDataFilters,
    electricityInputFilters?: ElectricityDataFilters,
    //units
    unitsOfMeasure: string,
    energyUnit: string,
    massUnit: string,
    volumeLiquidUnit: string,
    volumeGasUnit: string,
    sustainabilityQuestions: SustainabilityQuestions,
    fiscalYear: "calendarYear" | "nonCalendarYear",
    fiscalYearMonth: number,
    fiscalYearCalendarEnd: boolean,
    energyIsSource: boolean,
    emissionsOutputRate?: number,
    eGridSubregion?: string,
    customEmissionsRate?: boolean
    color?: string,
    selected?: boolean
}

export interface IdbUtilityMeterGroup {
    //keys (id primary)
    id?: number,
    facilityId: number,
    accountId: number,
    //data
    groupType: string,
    name: string,
    description?: string,
    dateModified?: Date,
    factionOfTotalEnergy?: number,
    totalEnergyUse?: number,
    totalConsumption?: number,
    groupData?: Array<IdbUtilityMeter>,
    combinedMonthlyData?: Array<MonthlyData>,
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
    phase?: MeterPhase,
    heatCapacity?: number,
    siteToSource: number,
    name: string,
    location?: string,
    supplier: string,
    notes?: string,
    source: MeterSource,
    //group = groupName
    group: string

    startingUnit: string,
    energyUnit: string,
    fuel?: string
    visible?: boolean
    importWizardName?: string
    meterReadingDataApplication?: "backward" | "fullMonth",
    emissionsOutputRate?: number,
    unitsDifferent?: boolean,
    ignoreDuplicateMonths?: boolean,
    ignoreMissingMonths?: boolean
}

export interface IdbUtilityMeterData {
    //keys (id primary)
    id?: number,
    meterId: number,
    facilityId: number,
    accountId: number,
    //data
    readDate: Date,
    totalVolume?: number,
    totalEnergyUse: number,
    totalCost: number,
    commodityCharge?: number,
    deliveryCharge?: number,
    otherCharge?: number,
    checked: boolean,
    totalDemand?: number,
    basicCharge?: number,
    supplyBlockAmount?: number,
    supplyBlockCharge?: number,
    flatRateAmount?: number,
    flatRateCharge?: number,
    peakAmount?: number,
    peakCharge?: number,
    offPeakAmount?: number,
    offPeakCharge?: number,
    demandBlockAmount?: number,
    demandBlockCharge?: number,
    //trans?
    generationTransmissionCharge?: number,
    transmissionCharge?: number,
    powerFactorCharge?: number,
    businessCharge?: number,
    utilityTax?: number,
    latePayment?: number,
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
    predictors: Array<PredictorData>,
    checked?: boolean
}


export interface PredictorData {
    name: string,
    amount: number,
    unit?: string,
    description?: string,
    id: string,
    importWizardName?: string,
    production?: boolean,
    productionInAnalysis?: boolean
}


export interface IdbOverviewReportOptions {
    id?: number,
    accountId: number,
    reportOptions: ReportOptions,
    date: Date,
    type: 'report' | 'template',
    name: string,
    baselineYear?: number,
    targetYear?: number,
    title?: string,
}

export interface IdbAnalysisItem {
    id?: number,
    accountId: number,
    facilityId: number,
    date: Date,
    name: string,
    energyIsSource: boolean,
    reportYear: number,
    energyUnit: string,
    groups: Array<AnalysisGroup>
}

export interface AnalysisGroup {
    idbGroupId: number,
    analysisType: AnalysisType,
    predictorVariables: Array<PredictorData>,
    productionUnits: string
}

export type AnalysisType = 'absoluteEnergyIntensity' | 'energyIntensity' | 'modifiedEnergyIntensity' | 'regression';
export type MeterSource = "Electricity" | "Natural Gas" | "Other Fuels" | "Other Energy" | "Water" | "Waste Water" | "Other Utility";
export type MeterPhase = "Solid" | "Liquid" | "Gas";