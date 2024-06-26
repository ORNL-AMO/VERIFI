import { FuelTypeOption } from '../shared/fuel-options/fuelTypeOption';
import { AccountAnalysisSetupErrors } from './accountAnalysis';
import { AnalysisCategory, AnalysisGroup, AnalysisSetupErrors } from './analysis';
import { MonthlyData } from './calanderization';
import { FacilityClassification, MeterPhase, MeterSource, ReportType, WaterDischargeType, WaterIntakeType } from './constantsAndTypes';
import { EmissionsResults } from './eGridEmissions';
import { GlobalWarmingPotential } from './globalWarmingPotentials';
import { ElectricityDataFilters, GeneralUtilityDataFilters, VehicleDataFilters } from './meterDataFilter';
import { BetterClimateReportSetup, BetterPlantsReportSetup, DataOverviewReportSetup, PerformanceReportSetup } from './overview-report';
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
    contactPhone: string,
    dataBackupFilePath?: string,
    dataBackupId?: string,
    archiveOption: 'always' | 'never' | 'justOnce' | 'skip',
    isSharedBackupFile?: boolean,
    sharedFileAuthor?: string
    deleteAccount?: boolean
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
    tableVehicleDataFilters?: VehicleDataFilters,
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
    facilityOrder?: number,
    isNewFacility?: boolean,
    classification?: FacilityClassification
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
    meterReadingDataApplication?: MeterReadingDataApplication,
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
    skipImport?: boolean,
    waterIntakeType?: WaterIntakeType,
    waterDischargeType?: WaterDischargeType,
    vehicleCategory?: number,
    vehicleType?: number,
    vehicleCollectionType?: number,
    vehicleCollectionUnit?: string,
    vehicleFuel?: string,
    vehicleFuelEfficiency?: number,
    vehicleDistanceUnit?: string
    globalWarmingPotentialOption?: number,
    globalWarmingPotential?: number

}

export interface IdbUtilityMeterData extends Partial<EmissionsResults> {
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

    //TODO: Check emissions usage for meters...
    isEstimated?: boolean,

    //electricity
    totalRealDemand?: number,
    totalBilledDemand?: number,
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
    demandCharge?: number,

    heatCapacity?: number,
    vehicleFuelEfficiency?: number,

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
    regressionCoefficient?: number,
    predictorType: PredictorType,
    referencePredictorId?: string,
    conversionType?: string,
    convertFrom?: string,
    convertTo?: string,
    weatherDataType?: WeatherDataType,
    weatherStationId?: string,
    weatherStationName?: string,
    heatingBaseTemperature?: number,
    coolingBaseTemperature?: number,
    weatherDataWarning?: boolean,
    weatherOverride?: boolean
}

export type PredictorType = 'Standard' | 'Conversion' | 'Math' | 'Weather';
export type WeatherDataType = 'HDD' | 'CDD';
export type MeterReadingDataApplication = "backward" | "fullMonth" | "fullYear";

export interface IdbAccountReport {
    id?: number,
    guid: string,
    accountId: string,
    overviewReportId?: string,
    baselineYear: number,
    reportYear: number,
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number,
    date: Date,
    name: string,
    reportType: ReportType,
    betterPlantsReportSetup: BetterPlantsReportSetup,
    dataOverviewReportSetup: DataOverviewReportSetup,
    performanceReportSetup: PerformanceReportSetup,
    betterClimateReportSetup: BetterClimateReportSetup
}



export interface IdbAnalysisItem {
    id?: number,
    guid: string,
    accountId: string,
    facilityId: string,
    date: Date,
    name: string,
    analysisCategory: AnalysisCategory,
    energyIsSource: boolean,
    reportYear: number,
    energyUnit: string,
    waterUnit: string,
    setupErrors: AnalysisSetupErrors,
    groups: Array<AnalysisGroup>,
    selectedYearAnalysis?: boolean,
    baselineYear: number
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
    selectedYearAnalysis?: boolean,
    analysisCategory: AnalysisCategory,
    waterUnit: string,
    baselineYear: number,
    setupErrors: AccountAnalysisSetupErrors,
    facilityItemsInitialized?: boolean
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

export interface IdbCustomFuel extends FuelTypeOption {
    id?: number,
    accountId: string,
    date: Date,
    guid: string,
    phase: MeterPhase,
    directEmissionsRate: boolean
}

export interface IdbElectronBackup {
    id?: number,
    accountId: string,
    guid: string,
    dataBackupId: string,
    timeStamp: Date
}

export interface IdbCustomGWP extends GlobalWarmingPotential {
    id?: number,
    accountId: string,
    date: Date,
    guid: string
}