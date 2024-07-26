import { SustainabilityQuestions } from "../sustainabilityQuestions"


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
    color: string
}