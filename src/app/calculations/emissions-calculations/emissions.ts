import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbCustomFuel, IdbFacility, IdbUtilityMeter } from "src/app/models/idb";
import { ConvertValue } from "../conversions/convertValue";
import { EmissionsResults, SubregionEmissions } from "src/app/models/eGridEmissions";
import * as _ from 'lodash';
import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
import { FuelTypeOption } from "src/app/shared/fuel-options/fuelTypeOption";
import { getFuelTypeOptions, getMobileFuelTypes } from "src/app/shared/fuel-options/getFuelTypeOptions";

export function setEmissionsForCalanderizedMeters(calanderizedMeterData: Array<CalanderizedMeter>, energyIsSource: boolean, facilities: Array<IdbFacility>, co2Emissions: Array<SubregionEmissions>, customFuels: Array<IdbCustomFuel>): Array<CalanderizedMeter> {
    for (let i = 0; i < calanderizedMeterData.length; i++) {
        let cMeter: CalanderizedMeter = calanderizedMeterData[i];
        for (let x = 0; x < cMeter.monthlyData.length; x++) {
            let monthlyData: MonthlyData = cMeter.monthlyData[x];
            let emissions: EmissionsResults = getEmissions(cMeter.meter, monthlyData.energyUse, cMeter.energyUnit, monthlyData.year, energyIsSource, facilities, co2Emissions, customFuels, monthlyData.energyConsumption, cMeter.consumptionUnit, cMeter.meter.vehicleDistanceUnit);
            cMeter.monthlyData[x].RECs = emissions.RECs;
            cMeter.monthlyData[x].locationElectricityEmissions = emissions.locationElectricityEmissions;
            cMeter.monthlyData[x].marketElectricityEmissions = emissions.marketElectricityEmissions;
            cMeter.monthlyData[x].otherScope2Emissions = emissions.otherScope2Emissions;
            cMeter.monthlyData[x].scope2LocationEmissions = emissions.scope2LocationEmissions;
            cMeter.monthlyData[x].scope2MarketEmissions = emissions.scope2MarketEmissions;
            cMeter.monthlyData[x].excessRECs = emissions.excessRECs;
            cMeter.monthlyData[x].excessRECsEmissions = emissions.excessRECsEmissions;
            cMeter.monthlyData[x].mobileCarbonEmissions = emissions.mobileCarbonEmissions;
            cMeter.monthlyData[x].mobileBiogenicEmissions = emissions.mobileBiogenicEmissions;
            cMeter.monthlyData[x].mobileOtherEmissions = emissions.mobileOtherEmissions;
            cMeter.monthlyData[x].mobileTotalEmissions = emissions.mobileTotalEmissions;
            cMeter.monthlyData[x].fugitiveEmissions = emissions.fugitiveEmissions;
            cMeter.monthlyData[x].processEmissions = emissions.processEmissions;
            cMeter.monthlyData[x].stationaryEmissions = emissions.stationaryEmissions;
            cMeter.monthlyData[x].totalScope1Emissions = emissions.totalScope1Emissions;
            cMeter.monthlyData[x].totalWithMarketEmissions = emissions.totalWithMarketEmissions;
            cMeter.monthlyData[x].totalWithLocationEmissions = emissions.totalWithLocationEmissions;
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


    let locationElectricityEmissions: number = 0;
    let marketElectricityEmissions: number = 0
    let RECs: number = 0;
    let excessRECs: number = 0;
    let excessRECsEmissions: number = 0;
    let mobileBiogenicEmissions: number = 0;
    let mobileCarbonEmissions: number = 0;
    let mobileOtherEmissions: number = 0;
    let mobileTotalEmissions: number = 0;
    let fugitiveEmissions: number = 0;
    let processEmissions: number = 0;
    let stationaryEmissions: number = 0;
    let scope2Other: number = 0;

    if (meter.source == 'Electricity' || isCompressedAir) {
        if (energyIsSource && meter.siteToSource != 0) {
            energyUse = energyUse / meter.siteToSource;
        }
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'kWh').convertedValue;
        let facility: IdbFacility = facilities.find(facility => { return facility.guid == meter.facilityId });
        let emissionsRates: { marketRate: number, locationRate: number } = getEmissionsRate(facility.eGridSubregion, year, co2Emissions);
        let marketEmissionsOutputRate: number = emissionsRates.marketRate;
        if (!isCompressedAir) {
            if (meter.includeInEnergy) {
                locationElectricityEmissions = convertedEnergyUse * emissionsRates.locationRate * meter.locationGHGMultiplier;
                marketElectricityEmissions = convertedEnergyUse * emissionsRates.marketRate * meter.marketGHGMultiplier;
            } else {
                marketElectricityEmissions = 0;
                locationElectricityEmissions = 0;
            }
        } else {
            //Purchased Compressed Air
            marketElectricityEmissions = 0;
            locationElectricityEmissions = 0;
            scope2Other = convertedEnergyUse * emissionsRates.locationRate * meter.locationGHGMultiplier;
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
        let outputRate: number = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, customFuels, meter.scope, meter.vehicleCategory, meter.vehicleType);
        //emissions calculated in kg CO2e using emissions factors, converted to tonne CO2e
        stationaryEmissions = (convertedEnergyUse * outputRate) / 1000;
    } else if (meter.source == 'Other Fuels' && meter.scope == 2) {
        //Mobile emissions
        let fuelOptions: Array<FuelTypeOption> = getMobileFuelTypes(meter.vehicleCategory, meter.vehicleType, customFuels);
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
            let miles = (totalVolume * meter.vehicleFuelEfficiency);
            let totalCH4 = miles * 25 * meterFuel.CH4;
            let totalN2O = miles * 298 * meterFuel.N2O;
            mobileOtherEmissions = totalCH4 + totalN2O;

        } else {
            //TOTAL VOLUME IS IN MILES
            if (vehicleDistanceUnit != 'mi') {
                //convert to miles
                totalVolume = new ConvertValue(totalVolume, vehicleDistanceUnit, 'mi').convertedValue;
            }
            //On Road calculated by mile
            if (meterFuel.isBiofuel) {
                mobileBiogenicEmissions = (totalVolume * (1 / meter.vehicleFuelEfficiency) * meterFuel.CO2) / 1000;
                mobileCarbonEmissions = 0;
            } else {
                // console.log('volume: ' + totalVolume);
                // console.log('Fuel CO2: ' + meterFuel.CO2);
                mobileCarbonEmissions = (totalVolume * (1 / meter.vehicleFuelEfficiency) * meterFuel.CO2) / 1000;
                // console.log('Carbon Emissions: ' +mobileCarbonEmissions);
                mobileBiogenicEmissions = 0;
            }
            let totalCH4 = ((25 * totalVolume * meterFuel.CH4) / 1000) / 1000;
            let totalN2O = ((298 * totalVolume * meterFuel.N2O) / 1000) / 1000;
            // console.log('totalCH4: ' +totalCH4);
            // console.log('totalN2O: ' +totalN2O);
            mobileOtherEmissions = (totalCH4 + totalN2O);
            // console.log('mobileOtherEmissions: ' +mobileOtherEmissions);
        }
        mobileTotalEmissions = mobileOtherEmissions + mobileCarbonEmissions;
        // console.log('mobileTotalEmissions: ' +mobileTotalEmissions);
        // console.log('=====');
    } else if (meter.source == 'Other') {
        //Fugitive or process
        if (meter.scope == 5) {
            //fugitive emissions
            fugitiveEmissions = totalVolume * meter.globalWarmingPotential;
        } else if (meter.scope == 6) {
            //process emissions
            processEmissions = totalVolume * meter.globalWarmingPotential;
        }
    } else if (meter.source == 'Other Energy') {
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'MMBtu').convertedValue;
        let outputRate: number = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, customFuels, meter.scope, meter.vehicleCategory, meter.vehicleType);
        //emissions calculated in kg CO2e using emissions factors, converted to tonne CO2e
        scope2Other = (convertedEnergyUse * outputRate) / 1000;
    }
    let totalScope1Emissions: number = mobileTotalEmissions + fugitiveEmissions + processEmissions + stationaryEmissions;

    let scope2LocationEmissions: number = locationElectricityEmissions + scope2Other;
    let scope2MarketEmissions: number = marketElectricityEmissions + scope2Other;


    return {
        RECs: RECs,
        marketElectricityEmissions: marketElectricityEmissions,
        locationElectricityEmissions: locationElectricityEmissions,
        scope2LocationEmissions: scope2LocationEmissions,
        scope2MarketEmissions: scope2MarketEmissions,
        excessRECs: excessRECs,
        excessRECsEmissions: excessRECsEmissions,
        mobileBiogenicEmissions: mobileBiogenicEmissions,
        mobileCarbonEmissions: mobileCarbonEmissions,
        mobileOtherEmissions: mobileOtherEmissions,
        mobileTotalEmissions: mobileTotalEmissions,
        fugitiveEmissions: fugitiveEmissions,
        processEmissions: processEmissions,
        totalWithLocationEmissions: totalScope1Emissions + scope2LocationEmissions,
        totalWithMarketEmissions: totalScope1Emissions + scope2MarketEmissions,
        otherScope2Emissions: scope2Other,
        totalScope1Emissions: totalScope1Emissions,
        stationaryEmissions: stationaryEmissions
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

export function getFuelEmissionsOutputRate(source: MeterSource, fuel: string, phase: MeterPhase, customFuels: Array<IdbCustomFuel>, scope: number, vehicleCategory: number, vehicleType: number): number {
    //emissions rates in kg/MMBtu
    let emissionsRate: number;
    if (source == 'Natural Gas') {
        emissionsRate = 53.1148;
    } else if (source == 'Other Fuels' || source == 'Other Energy') {
        let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(source, phase, customFuels, scope, vehicleCategory, vehicleType);
        let selectedFuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel })
        if (selectedFuel) {
            emissionsRate = selectedFuel.emissionsOutputRate;
        }
    }
    return emissionsRate;
}


export function getZeroEmissionsResults(): EmissionsResults {
    return {
        RECs: 0,
        locationElectricityEmissions: 0,
        marketElectricityEmissions: 0,
        otherScope2Emissions: 0,
        scope2LocationEmissions: 0,
        scope2MarketEmissions: 0,
        excessRECs: 0,
        excessRECsEmissions: 0,
        mobileCarbonEmissions: 0,
        mobileBiogenicEmissions: 0,
        mobileOtherEmissions: 0,
        mobileTotalEmissions: 0,
        fugitiveEmissions: 0,
        processEmissions: 0,
        stationaryEmissions: 0,
        totalScope1Emissions: 0,
        totalWithMarketEmissions: 0,
        totalWithLocationEmissions: 0
    }
}
