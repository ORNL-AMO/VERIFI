import { SustainabilityQuestions } from "../sustainabilityQuestions"
import { DataStalenessMonths } from "../../calculations/status-check-calculations/statusCheckModels"

/**
 * Settings for time-based data staleness checks.
 * Controls when meters and predictors are flagged as "outdated".
 */
export interface DataStalenessSettings {
    /** Whether to enable time-based outdated checks */
    enabled: boolean;
    /** Number of months after which data is considered outdated */
    thresholdMonths: DataStalenessMonths;
    /** Whether to use account-level settings (only applicable for facilities) */
    useAccountSettings?: boolean;
}

export interface AccountAndFacility {
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
    contactName: string,
    contactEmail: string,
    contactPhone: string,
    color: string,
    selectedEnergyAnalysisId?: string,
    selectedWaterAnalysisId?: string,
    /** Settings for time-based data staleness checks */
    dataStalenessSettings?: DataStalenessSettings
}