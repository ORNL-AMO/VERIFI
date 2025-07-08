import { AgreementType, AgreementTypes } from "../../../models/agreementType";
import { AllSources, MeterPhase, MeterSource } from "../../../models/constantsAndTypes";
import { ScopeOption, ScopeOptions } from "../../../models/scopeOption";
import { Countries, Country } from "../../../shared/form-data/countries";
import { State, States } from "../../../shared/form-data/states";
import { FuelTypeOption } from "../../../shared/fuel-options/fuelTypeOption";
import { getFuelTypeOptions } from "../../../shared/fuel-options/getFuelTypeOptions";
import { getStartingUnitOptions } from "../../../shared/sharedHelperFuntions";
import { UnitOption } from "../../../shared/unitOptions";

export function getCountryCode(country: string): string {
    if (country) {
        let findCountry: Country = Countries.find(countryOption => { return countryOption.name == country });
        if (findCountry) {
            return findCountry.code
        }
    }
    return;
}



export function getState(stateStr: string): string {
    if (stateStr) {
        let state: State = States.find(state => {
            return stateStr.toLocaleLowerCase() == state.abbreviation.toLocaleLowerCase() || stateStr.toLocaleLowerCase() == state.name.toLocaleLowerCase();
        });
        if (state) {
            return state.name;
        }
    }
    return;
}

export function getZip(zip: string): string {
    if (zip) {
        if (zip.length == 5) {
            return zip;
        } else if(zip.length > 5) {
            // If the zip code is longer than 5 characters, we will return the first 5 characters
            // ETH Form format xxxxx-xxxx
            return zip.slice(0, 5);
        } else {
            let neededZeros: number = 5 - zip.length;
            for (let i = 0; i < neededZeros; i++) {
                zip = '0' + zip;
            }
            return zip;
        }
    }
    return;
}


export function getMeterSource(source: string): MeterSource {
    let selectedSource: MeterSource = AllSources.find(sourceOption => { return sourceOption == source });
    return selectedSource;
}

export function getPhase(phase: string): MeterPhase {
    if (phase == 'Gas' || phase == 'Liquid' || phase == 'Solid') {
        return phase;
    }
    return undefined;
}

export function getFuelEnum(fuel: string, source: MeterSource, phase: MeterPhase, scope: number, vehicleCategory: number, vehicleType: number): string {
    let fuelTypeOptions = getFuelTypeOptions(source, phase, [], scope, vehicleCategory, vehicleType);
    let selectedEnergyOption: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel });
    if (selectedEnergyOption) {
        return selectedEnergyOption.value;
    }
    return undefined;
}


export function getMeterReadingDataApplication(yesOrNo: 'Yes' | 'No'): 'backward' | 'fullMonth' {
    if (yesOrNo == 'Yes') {
        return 'backward'
    } else if (yesOrNo == 'No') {
        return 'fullMonth';
    } else {
        return;
    }
}


export function checkImportCellNumber(value: any): number {
    if (value != undefined && value != null) {
        return Number(value);
    }
    return;
}


export function checkSameDay(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth() && date1.getUTCDate() == date2.getUTCDate();
}

export function checkSameMonth(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth();
}

export function getScope(formScope: string): number {
    let scopeOption: ScopeOption = ScopeOptions.find(option => { return (option.scope + ': ' + option.optionLabel) == formScope });
    if (scopeOption) {
        return scopeOption.value;
    } else {
        return undefined
    }
}

export function getYesNoBool(val: string): boolean {
    if (val == 'Yes') {
        return true;
    } else if (val == 'No') {
        return false;
    }
}

export function getAgreementType(formAgreementType: string): number {
    let agreementType: AgreementType = AgreementTypes.find(type => { return type.typeLabel == formAgreementType });
    if (agreementType) {
        return agreementType.value;
    } else {
        return undefined;
    }
}

export function checkImportStartingUnit(importUnit: string, source: MeterSource, phase: MeterPhase, fuel: string, scope: number): string {
    if (source) {
        let startingUnitOptions: Array<UnitOption> = getStartingUnitOptions(source, phase, fuel, scope);
        let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
        if (selectedUnitOption) {
            return selectedUnitOption.value;
        }
    }
    return undefined;
}