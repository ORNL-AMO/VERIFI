import { AccountAndFacility } from "./accountAndFacility"
import { getNewIdbEntry, IdbEntry } from "./idbEntry";



export interface IdbAccount extends IdbEntry, AccountAndFacility {
    name: string,
    numberOfFacilities?: string,
    lastBackup?: Date,
    dataBackupFilePath?: string,
    dataBackupId?: string,
    archiveOption: 'always' | 'never' | 'justOnce' | 'skip',
    isSharedBackupFile?: boolean,
    sharedFileAuthor?: string
    deleteAccount?: boolean,
    isBetterPlantsPartner?: boolean
}

export function getNewIdbAccount(): IdbAccount {
    let idbEntry: IdbEntry = getNewIdbEntry();
    let baselineYear: number = new Date().getUTCFullYear();
    let targetYear: number = baselineYear + 10;
    return {
        ...idbEntry,
        name: 'New Account',
        city: '',
        state: '',
        zip: undefined,
        country: 'US',
        address: '',
        size: 0,
        naics1: undefined,
        naics2: undefined,
        naics3: undefined,
        notes: '',
        // id: undefined,            
        unitsOfMeasure: 'Imperial',
        energyUnit: 'MMBtu',
        electricityUnit: 'kWh',
        volumeLiquidUnit: 'gal',
        volumeGasUnit: 'SCF',
        massUnit: 'lb',
        sustainabilityQuestions: {
            energyReductionGoal: true,
            energyReductionPercent: 25,
            energyReductionBaselineYear: baselineYear,
            energyReductionTargetYear: targetYear,
            energyIsAbsolute: false,
            greenhouseReductionGoal: false,
            greenhouseReductionPercent: 0,
            greenhouseReductionBaselineYear: baselineYear,
            greenhouseReductionTargetYear: targetYear,
            greenhouseIsAbsolute: true,
            renewableEnergyGoal: false,
            renewableEnergyPercent: 0,
            renewableEnergyBaselineYear: baselineYear,
            renewableEnergyTargetYear: targetYear,
            wasteReductionGoal: false,
            wasteReductionPercent: 0,
            wasteReductionBaselineYear: baselineYear,
            wasteReductionTargetYear: targetYear,
            wasteIsAbsolute: true,
            waterReductionGoal: false,
            waterReductionPercent: 0,
            waterReductionBaselineYear: baselineYear,
            waterReductionTargetYear: targetYear,
            waterIsAbsolute: false
        },
        fiscalYear: 'calendarYear',
        fiscalYearMonth: 0,
        fiscalYearCalendarEnd: true,
        energyIsSource: true,
        contactName: undefined,
        contactEmail: undefined,
        contactPhone: undefined,
        archiveOption: 'skip',
        isSharedBackupFile: false,
        color: undefined
    }
}