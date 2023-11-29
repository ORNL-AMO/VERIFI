import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbCustomFuel, IdbFacility, IdbUtilityMeter } from "src/app/models/idb";
import { ConvertValue } from "../conversions/convertValue";
import { EmissionsResults, SubregionEmissions } from "src/app/models/eGridEmissions";
import * as _ from 'lodash';
import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
import { FuelTypeOption } from "src/app/shared/fuel-options/fuelTypeOption";
import { getAllMobileFuelTypes, getFuelTypeOptions } from "src/app/shared/fuel-options/getFuelTypeOptions";

export function setEmissionsForCalanderizedMeters(calanderizedMeterData: Array<CalanderizedMeter>, energyIsSource: boolean, facilities: Array<IdbFacility>, co2Emissions: Array<SubregionEmissions>, customFuels: Array<IdbCustomFuel>): Array<CalanderizedMeter> {
    for (let i = 0; i < calanderizedMeterData.length; i++) {
        let cMeter: CalanderizedMeter = calanderizedMeterData[i];
        for (let x = 0; x < cMeter.monthlyData.length; x++) {
            let monthlyData: MonthlyData = cMeter.monthlyData[x];
            let emissions: EmissionsResults = getEmissions(cMeter.meter, monthlyData.energyUse, cMeter.energyUnit, monthlyData.year, energyIsSource, facilities, co2Emissions, customFuels, monthlyData.energyConsumption, cMeter.meter.vehicleCollectionUnit, cMeter.meter.vehicleDistanceUnit);
            cMeter.monthlyData[x].RECs = emissions.RECs;
            cMeter.monthlyData[x].locationEmissions = emissions.locationEmissions;
            cMeter.monthlyData[x].marketEmissions = emissions.marketEmissions;
            cMeter.monthlyData[x].excessRECs = emissions.excessRECs;
            cMeter.monthlyData[x].excessRECsEmissions = emissions.excessRECsEmissions;
        }
    }
    return calanderizedMeterData;
}

export function getEmissions(meter: IdbUtilityMeter,
    energyUse: number,
    energyUnit: string,
    year: number,
    energyIsSource: boolean,
    facilities: Array<IdbFacility>,
    co2Emissions: Array<SubregionEmissions>,
    customFuels: Array<IdbCustomFuel>,
    totalVolume: number,
    vehicleCollectionUnit: string,
    vehicleDistanceUnit: string): EmissionsResults {
    let isCompressedAir: boolean = (meter.source == 'Other Energy' && meter.fuel == 'Purchased Compressed Air');

    let locationEmissions: number = 0;
    let marketEmissions: number = 0;
    let RECs: number = 0;
    let excessRECs: number = 0;
    let excessRECsEmissions: number = 0;
    let mobileBiogenicEmissions: number = 0;
    let mobileCarbonEmissions: number = 0;
    let mobileOtherEmissions: number = 0;
    let mobileTotalEmissions: number = 0;
    let fugitiveEmissions: number = 0;

    if (meter.source == 'Electricity' || isCompressedAir) {
        if (energyIsSource && meter.siteToSource != 0) {
            energyUse = energyUse / meter.siteToSource;
        }
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'kWh').convertedValue;
        let facility: IdbFacility = facilities.find(facility => { return facility.guid == meter.facilityId });
        let emissionsRates: { marketRate: number, locationRate: number } = getEmissionsRate(facility.eGridSubregion, year, co2Emissions);
        let marketEmissionsOutputRate: number = emissionsRates.marketRate;

        if (meter.includeInEnergy) {
            locationEmissions = convertedEnergyUse * emissionsRates.locationRate * meter.locationGHGMultiplier;
            marketEmissions = convertedEnergyUse * emissionsRates.marketRate * meter.marketGHGMultiplier;
        } else {
            marketEmissions = 0;
            locationEmissions = 0;
        }
        RECs = convertedEnergyUse * meter.recsMultiplier;
        let emissionsEnergyUse: number = convertedEnergyUse;
        if (meter.includeInEnergy == false) {
            emissionsEnergyUse = 0;
        }

        if (RECs - emissionsEnergyUse <= 0) {
            excessRECs = 0;
        } else {
            excessRECs = RECs;
        }
        excessRECsEmissions = excessRECs * marketEmissionsOutputRate;
        excessRECs = new ConvertValue(excessRECs, 'kWh', 'MWh').convertedValue;
        RECs = new ConvertValue(RECs, 'kWh', 'MWh').convertedValue;
        excessRECsEmissions = excessRECsEmissions / 1000;
    }

    //NG or non mobile
    if (meter.source == 'Natural Gas' || (meter.source == 'Other Fuels' && meter.scope != 2)) {
        if (energyIsSource && meter.siteToSource != 0) {
            energyUse = energyUse / meter.siteToSource;
        }
        //non-electricity emissions rates are in MMBtu
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'MMBtu').convertedValue;
        let marketEmissionsOutputRate: number = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, customFuels, meter.scope);
        //emissions calculated in kg CO2e using emissions factors, converted to tonne CO2e
        locationEmissions = (convertedEnergyUse * marketEmissionsOutputRate) / 1000;
        marketEmissions = (convertedEnergyUse * marketEmissionsOutputRate) / 1000;
    } else if (meter.source == 'Other Fuels' && meter.scope == 2) {
        let fuelOptions: Array<FuelTypeOption> = getAllMobileFuelTypes();
        let meterFuel: FuelTypeOption = fuelOptions.find(option => {
            return option.value == meter.vehicleFuel
        });

        //not On Road Vehicle or On Road Calcuatated by consumption
        if (meter.vehicleCategory != 2 || meter.vehicleCollectionType == 1) {
            //TOTAL VOLUME IS IN gal
            if (vehicleCollectionUnit != 'gal') {
                //convert to gal
                totalVolume = new ConvertValue(totalVolume, vehicleCollectionUnit, 'gal').convertedValue;
            }
            if (meterFuel.isBiofuel) {
                mobileBiogenicEmissions = totalVolume * meterFuel.CO2;
                mobileCarbonEmissions = 0;
            } else {
                mobileCarbonEmissions = totalVolume * meterFuel.CO2;
                mobileBiogenicEmissions = 0;
            }
            //miles = gal * mpg 
            let miles = (totalVolume * meter.vehicleFuelEfficiency)
            let totalCH4 = miles * 25 * meterFuel.CH4;
            let totalN20 = miles * 298 * meterFuel.N2O;
            mobileOtherEmissions = totalCH4 + totalN20;

        } else {
            //TOTAL VOLUME IS IN MILES
            if (vehicleDistanceUnit != 'mi') {
                //convert to miles
                totalVolume = new ConvertValue(totalVolume, vehicleDistanceUnit, 'mi').convertedValue;
            }
            //On Road calculated by mile
            if (meterFuel.isBiofuel) {
                mobileBiogenicEmissions = totalVolume * meter.vehicleFuelEfficiency * meterFuel.CO2;
                mobileCarbonEmissions = 0;
            } else {
                mobileCarbonEmissions = totalVolume * meter.vehicleFuelEfficiency * meterFuel.CO2;
                mobileBiogenicEmissions = 0;
            }
            mobileOtherEmissions = (25 * totalVolume * meterFuel.CH4) + (298 * totalVolume * meterFuel.N2O);
        }
        mobileTotalEmissions = mobileOtherEmissions + mobileCarbonEmissions;
    } else if(meter.source == 'Other' && (meter.scope == 5 || meter.scope == 6)){
        //fugitive emissions
        fugitiveEmissions = totalVolume * meter.globalWarmingPotential;
    }


    return {
        RECs: RECs,
        locationEmissions: locationEmissions,
        marketEmissions: marketEmissions,
        excessRECs: excessRECs,
        excessRECsEmissions: excessRECsEmissions,
        mobileBiogenicEmissions: mobileBiogenicEmissions,
        mobileCarbonEmissions: mobileCarbonEmissions,
        mobileOtherEmissions: mobileOtherEmissions,
        mobileTotalEmissions: mobileTotalEmissions,
        fugitiveEmissions: fugitiveEmissions
    };
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

export function getFuelEmissionsOutputRate(source: MeterSource, fuel: string, phase: MeterPhase, customFuels: Array<IdbCustomFuel>, scope: number): number {
    //emissions rates in kg/MMBtu
    let emissionsRate: number;
    if (source == 'Natural Gas') {
        emissionsRate = 53.1148;
    } else if (source == 'Other Fuels') {
        let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(source, phase, customFuels, scope);
        let selectedFuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel })
        if (selectedFuel) {
            emissionsRate = selectedFuel.emissionsOutputRate;
        }
    }
    return emissionsRate;
}

