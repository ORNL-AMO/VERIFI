import { FacilityClassification } from "../constantsAndTypes";
import { ElectricityDataFilters, GeneralUtilityDataFilters, VehicleDataFilters } from "../meterDataFilter";
import { IdbAccount } from "./account";
import { AccountAndFacility } from "./accountAndFacility";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";


export interface IdbFacility extends IdbEntry, AccountAndFacility {
    accountId: string,
    //TODO: remove wizardID when deleting wizard
    wizardId?: string,
    size?: number,
    tableElectricityFilters?: ElectricityDataFilters,
    electricityInputFilters?: ElectricityDataFilters,
    tableGeneralUtilityFilters?: GeneralUtilityDataFilters,
    tableVehicleDataFilters?: VehicleDataFilters,
    selected?: boolean,
    facilityOrder?: number,
    isNewFacility?: boolean,
    classification?: FacilityClassification
}

export function getNewIdbFacility(account: IdbAccount): IdbFacility {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: account.guid,
        name: 'New Facility',
        country: 'US',
        color: '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'),
        city: account.city,
        state: account.state,
        zip: account.zip,
        address: account.address,
        naics1: account.naics1,
        naics2: account.naics2,
        naics3: account.naics3,
        size: undefined,
        notes: undefined,
        // id: undefined
        unitsOfMeasure: account.unitsOfMeasure,
        energyUnit: account.energyUnit,
        electricityUnit: account.electricityUnit,
        volumeLiquidUnit: account.volumeLiquidUnit,
        volumeGasUnit: account.volumeGasUnit,
        massUnit: account.massUnit,
        sustainabilityQuestions: account.sustainabilityQuestions,
        fiscalYear: account.fiscalYear,
        fiscalYearMonth: account.fiscalYearMonth,
        fiscalYearCalendarEnd: account.fiscalYearCalendarEnd,
        energyIsSource: account.energyIsSource,
        contactName: undefined,
        contactEmail: undefined,
        contactPhone: undefined,
        facilityOrder: undefined,
        classification: 'Manufacturing'
    }
}