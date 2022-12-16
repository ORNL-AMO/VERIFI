import { JStatRegressionModel } from './analysis';
import { CalanderizedMeter, MonthlyData } from './calanderization';
import { ElectricityDataFilters, GeneralUtilityDataFilters } from './meterDataFilter';
import { ReportOptions } from './overview-report';
import { SustainabilityQuestions } from './sustainabilityQuestions';

export interface IdbAccount {
    //keys (id primary)
    id?: number,
    guid: string,
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
    electricityUnit: string,
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
    eGridSubregion?: string,
    color?: string,
    contactName: string,
    contactEmail: string,
    contactPhone: string
}

export interface IdbFacility {
    //keys (id primary)
    id?: number,
    guid: string,
    accountId: string,
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
    tableGeneralUtilityFilters?: GeneralUtilityDataFilters,
    //units
    unitsOfMeasure: string,
    energyUnit: string,
    electricityUnit: string,
    massUnit: string,
    volumeLiquidUnit: string,
    volumeGasUnit: string,
    sustainabilityQuestions: SustainabilityQuestions,
    fiscalYear: "calendarYear" | "nonCalendarYear",
    fiscalYearMonth: number,
    fiscalYearCalendarEnd: boolean,
    energyIsSource: boolean,
    eGridSubregion?: string,
    color?: string,
    selected?: boolean,
    wizardId?: string,
    contactName: string,
    contactEmail: string,
    contactPhone: string,
    modifiedDate?: Date,
    facilityOrder?: number
}

export interface IdbUtilityMeterGroup {
    //keys (id primary)
    id?: number,
    guid: string,
    facilityId: string,
    accountId: string,
    //data
    groupType: 'Energy' | 'Water' | 'Other',
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
    guid: string,
    facilityId: string,
    accountId: string,
    groupId: string,
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
    group?: string

    startingUnit: string,
    energyUnit: string,
    fuel?: string
    visible?: boolean
    importWizardName?: string
    meterReadingDataApplication?: "backward" | "fullMonth",
    unitsDifferent?: boolean,
    ignoreDuplicateMonths?: boolean,
    ignoreMissingMonths?: boolean,
    scope: number,
    agreementType: number,
    includeInEnergy: boolean,
    retainRECs: boolean,
    directConnection: boolean,
    // GHGMultiplier: number,
    recsMultiplier: number,
    greenPurchaseFraction: number,
    marketGHGMultiplier: number,
    locationGHGMultiplier: number,
    isValid?: boolean,
    skipImport?: boolean
}

export interface IdbUtilityMeterData {
    //keys (id primary)
    id?: number,
    guid: string,
    meterId: string,
    facilityId: string,
    accountId: string,
    //data
    readDate: Date,
    dbDate?: Date,
    totalVolume?: number,
    totalEnergyUse: number,
    totalCost: number,
    commodityCharge?: number,
    deliveryCharge?: number,
    checked: boolean,
    meterNumber?: string,
    totalImportConsumption?: number
    totalMarketEmissions?: number,
    totalLocationEmissions?: number,
    RECs?: number,
    excessRECs?: number,
    excessRECsEmissions?: number


    //electricity
    totalRealDemand?: number,
    totalBilledDemand? :number,
    nonEnergyCharge?: number,
    block1Consumption?: number,
    block1ConsumptionCharge?: number,
    block2Consumption?: number,
    block2ConsumptionCharge?: number,
    block3Consumption?: number,
    block3ConsumptionCharge?: number,
    otherConsumption?: number,
    otherConsumptionCharge?: number,
    onPeakAmount?: number,
    onPeakCharge?: number,
    offPeakAmount?: number,
    offPeakCharge?: number,
    transmissionAndDeliveryCharge?: number,
    powerFactor?: number,
    powerFactorCharge?: number,
    localSalesTax?: number,
    stateSalesTax?: number,
    latePayment?: number,
    otherCharge?: number
    //non-electricity
    demandUsage?: number,
    demandCharge?: number
}

export interface IdbPredictorEntry {
    //keys (id primary)
    id?: number,
    guid: string,
    facilityId: string,
    accountId: string,
    //data
    // name: string,
    // description: string,
    // unit: string,
    // amount: number,
    date: Date,
    predictors: Array<PredictorData>,
    checked?: boolean,
    dbDate?: Date
}


export interface PredictorData {
    name: string,
    amount: number,
    unit?: string,
    description?: string,
    id: string,
    importWizardName?: string,
    production?: boolean,
    productionInAnalysis?: boolean,
    regressionCoefficient?: number
}


export interface IdbOverviewReportOptions {
    id?: number,
    guid: string,
    accountId: string,
    reportOptions: ReportOptions,
    date: Date,
    type: 'report' | 'template',
    name: string,
    baselineYear?: number,
    targetYear?: number,
    title?: string,
    reportOptionsType?: 'betterPlants' | 'data'
}

export interface IdbAnalysisItem {
    id?: number,
    guid: string,
    accountId: string,
    facilityId: string,
    date: Date,
    name: string,
    energyIsSource: boolean,
    reportYear: number,
    energyUnit: string,
    setupErrors: AnalysisSetupErrors,
    groups: Array<AnalysisGroup>,
    selectedYearAnalysis?: boolean
}

export interface AnalysisSetupErrors{
    hasError: boolean,
    missingName: boolean,
    noGroups: boolean,
    missingReportYear: boolean,
    reportYearBeforeBaselineYear: boolean,
    groupsHaveErrors: boolean
}

export interface AnalysisGroup {
    idbGroupId: string,
    analysisType: AnalysisType,
    predictorVariables: Array<PredictorData>,
    productionUnits: string,
    regressionModelYear: number,
    regressionConstant: number,
    groupErrors: GroupErrors,
    specifiedMonthlyPercentBaseload: boolean,
    averagePercentBaseload: number,
    monthlyPercentBaseload: Array<{
        monthNum: number,
        percent: number
    }>,
    hasBaselineAdjustement: boolean,
    baselineAdjustments: Array<{
        year: number,
        amount: number
    }>,
    userDefinedModel: boolean,
    models?: Array<JStatRegressionModel>,
    selectedModelId?: string,
    dateModelsGenerated?: Date,
    regressionModelNotes?: string
}

export interface GroupErrors {
    hasErrors: boolean,
    missingProductionVariables: boolean,
    missingRegressionConstant: boolean,
    missingRegressionModelYear: boolean,
    missingRegressionModelSelection: boolean,
    missingRegressionPredictorCoef: boolean,
    noProductionVariables: boolean,
    invalidAverageBaseload: boolean,
    invalidMonthlyBaseload: boolean,
    missingGroupMeters: boolean,
    hasInvalidRegressionModel: boolean
}

export interface IdbAccountAnalysisItem {
    id?: number,
    guid: string,
    accountId: string,
    date: Date,
    name: string,
    energyIsSource: boolean,
    reportYear: number,
    energyUnit: string,
    facilityAnalysisItems: Array<{
        facilityId: string,
        analysisItemId: string
    }>,
    hasBaselineAdjustement: boolean,
    baselineAdjustments: Array<{
        year: number,
        amount: number
    }>,
    selectedYearAnalysis?: boolean
}


export interface IdbCustomEmissionsItem {
    id?: number,
    accountId: string,
    date: Date,
    guid: string,
    subregion: string,
    locationEmissionRates: Array<{ co2Emissions: number, year: number }>,
    residualEmissionRates: Array<{ co2Emissions: number, year: number }>,
}



export type AnalysisType = 'absoluteEnergyConsumption' | 'energyIntensity' | 'modifiedEnergyIntensity' | 'regression';
export type MeterSource = "Electricity" | "Natural Gas" | "Other Fuels" | "Other Energy" | "Water" | "Waste Water" | "Other Utility";
export type MeterPhase = "Solid" | "Liquid" | "Gas";