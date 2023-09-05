import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbFacility, IdbUtilityMeter } from "src/app/models/idb";
import { ConvertValue } from "../conversions/convertValue";
import { EmissionsResults, SubregionEmissions } from "src/app/models/eGridEmissions";
import * as _ from 'lodash';
import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
import { FuelTypeOption, getFuelTypeOptions } from "src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions";

export function setEmissionsForCalanderizedMeters(calanderizedMeterData: Array<CalanderizedMeter>, energyIsSource: boolean, facilities: Array<IdbFacility>, co2Emissions: Array<SubregionEmissions>): Array<CalanderizedMeter> {
    for (let i = 0; i < calanderizedMeterData.length; i++) {
        let cMeter: CalanderizedMeter = calanderizedMeterData[i];
        for (let x = 0; x < cMeter.monthlyData.length; x++) {
            let monthlyData: MonthlyData = cMeter.monthlyData[x];
            let emissions: EmissionsResults = getEmissions(cMeter.meter, monthlyData.energyUse, cMeter.energyUnit, monthlyData.year, energyIsSource, facilities, co2Emissions);
            cMeter.monthlyData[x].RECs = emissions.RECs;
            cMeter.monthlyData[x].locationEmissions = emissions.locationEmissions;
            cMeter.monthlyData[x].marketEmissions = emissions.marketEmissions;
            cMeter.monthlyData[x].excessRECs = emissions.excessRECs;
            cMeter.monthlyData[x].excessRECsEmissions = emissions.excessRECsEmissions;
        }
    }
    return calanderizedMeterData;
}

export function getEmissions(meter: IdbUtilityMeter, energyUse: number, energyUnit: string, year: number, energyIsSource: boolean, facilities: Array<IdbFacility>, co2Emissions: Array<SubregionEmissions>): EmissionsResults {
    let isCompressedAir: boolean = (meter.source == 'Other Energy' && meter.fuel == 'Purchased Compressed Air');
    if (meter.source == 'Electricity' || meter.source == 'Natural Gas' || meter.source == 'Other Fuels' || isCompressedAir) {
        if (energyIsSource && meter.siteToSource != 0) {
            energyUse = energyUse / meter.siteToSource;
        } let convertedEnergyUse: number = energyUse;
        if (meter.source == 'Electricity' || isCompressedAir) {
            //electricty emissions rates in kWh
            convertedEnergyUse = new ConvertValue(energyUse, energyUnit, 'kWh').convertedValue;
        } else {
            //non-electricity emissions rates are in MMBtu
            convertedEnergyUse = new ConvertValue(energyUse, energyUnit, 'MMBtu').convertedValue;
        }
        let locationEmissions: number;
        let marketEmissions: number;

        let marketEmissionsOutputRate: number;
        if (meter.source == 'Electricity' || isCompressedAir) {
            let facility: IdbFacility = facilities.find(facility => { return facility.guid == meter.facilityId });
            let emissionsRates: { marketRate: number, locationRate: number } = getEmissionsRate(facility.eGridSubregion, year, co2Emissions);
            marketEmissionsOutputRate = emissionsRates.marketRate;

            if (meter.includeInEnergy) {
                locationEmissions = convertedEnergyUse * emissionsRates.locationRate * meter.locationGHGMultiplier;
                marketEmissions = convertedEnergyUse * emissionsRates.marketRate * meter.marketGHGMultiplier;
            } else {
                marketEmissions = 0;
                locationEmissions = 0;
            }
        } else {
            marketEmissionsOutputRate = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase);
            locationEmissions = convertedEnergyUse * marketEmissionsOutputRate;
            marketEmissions = convertedEnergyUse * marketEmissionsOutputRate;
        }
        let RECs: number = convertedEnergyUse * meter.recsMultiplier;
        let excessRECs: number;
        let emissionsEnergyUse: number = convertedEnergyUse;
        if (meter.includeInEnergy == false) {
            emissionsEnergyUse = 0;
        }

        if (RECs - emissionsEnergyUse <= 0) {
            excessRECs = 0;
        } else {
            excessRECs = RECs;
        }
        let excessRECsEmissions: number = excessRECs * marketEmissionsOutputRate;
        excessRECs = new ConvertValue(excessRECs, 'kWh', 'MWh').convertedValue;
        RECs = new ConvertValue(RECs, 'kWh', 'MWh').convertedValue;

        //emissions calculated in kg CO2e using emissions factors, converted to tonne CO2e
        locationEmissions = locationEmissions / 1000;
        marketEmissions = marketEmissions / 1000;
        excessRECsEmissions = excessRECsEmissions / 1000;

        return { RECs: RECs, locationEmissions: locationEmissions, marketEmissions: marketEmissions, excessRECs: excessRECs, excessRECsEmissions: excessRECsEmissions };
    } else {
        return { RECs: 0, locationEmissions: 0, marketEmissions: 0, excessRECs: 0, excessRECsEmissions: 0 };
    }
}


export function getEmissionsRate(subregion: string, year: number, co2Emissions: Array<SubregionEmissions>): { marketRate: number, locationRate: number } {
    if (co2Emissions) {
        let subregionEmissions: SubregionEmissions = co2Emissions.find(emissions => { return emissions.subregion == subregion });
        if (subregionEmissions) {
            let marketRate: number = 0;
            let locationRate: number = 0;
            if (subregionEmissions.locationEmissionRates.length != 0) {
                let closestYearRate: { co2Emissions: number, year: number } = _.minBy(subregionEmissions.locationEmissionRates, (emissionRate: { co2Emissions: number, year: number }) => {
                    return Math.abs(emissionRate.year - year);
                });
                locationRate = closestYearRate.co2Emissions;
            }
            if (subregionEmissions.residualEmissionRates.length != 0) {
                let closestYearRate: { co2Emissions: number, year: number } = _.minBy(subregionEmissions.residualEmissionRates, (emissionRate: { co2Emissions: number, year: number }) => {
                    return Math.abs(emissionRate.year - year);
                });
                marketRate = closestYearRate.co2Emissions;
            }
            return { marketRate: marketRate, locationRate: locationRate };
        }
    }
    return { marketRate: 0, locationRate: 0 };
}

export function getFuelEmissionsOutputRate(source: MeterSource, fuel: string, phase: MeterPhase): number {
    //emissions rates in kg/MMBtu
    let emissionsRate: number;
    if (source == 'Natural Gas') {
        emissionsRate = 53.1148;
    } else if (source == 'Other Fuels') {
        let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(source, phase);
        let selectedFuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel })
        if (selectedFuel) {
            emissionsRate = selectedFuel.emissionsOutputRate;
        }
    }
    return emissionsRate;
}

