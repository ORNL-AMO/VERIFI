import { ConvertValue } from "../conversions/convertValue";
import { EmissionsRate, EmissionsResults, SubregionEmissions } from "src/app/models/eGridEmissions";
import * as _ from 'lodash';
import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
import { FuelTypeOption } from "src/app/shared/fuel-options/fuelTypeOption";
import { getFuelTypeOptions, getMobileFuelTypes } from "src/app/shared/fuel-options/getFuelTypeOptions";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbCustomFuel } from "src/app/models/idbModels/customFuel";

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
    vehicleDistanceUnit: string,
    hhvOrFuelEfficiency: number,
    assessmentReportVersion: 'AR24' | 'AR25'): EmissionsResults {
    let isCompressedAir: boolean = (meter.source == 'Other Energy' && meter.fuel == 'Purchased Compressed Air');

    let CH4_Multiplier: number = 25;
    let N2O_Multiplier: number = 298;
    if (assessmentReportVersion == 'AR25') {
        CH4_Multiplier = 28;
        N2O_Multiplier = 265;
    }


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
    let stationaryBiogenicEmmissions: number = 0;
    let stationaryCarbonEmissions: number = 0;
    let stationaryOtherEmissions: number = 0;

    if (meter.source == 'Electricity' || isCompressedAir) {
        if (energyIsSource && meter.siteToSource != 0) {
            energyUse = energyUse / meter.siteToSource;
        }
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'kWh').convertedValue;
        let facility: IdbFacility = facilities.find(facility => { return facility.guid == meter.facilityId });
        let emissionsRates: { marketRate: EmissionsRate, locationRate: EmissionsRate } = getEmissionsRate(facility.eGridSubregion, year, co2Emissions, CH4_Multiplier, N2O_Multiplier);
        // let marketEmissionsOutputRate: number = emissionsRates.marketRate;
        if (!isCompressedAir) {
            if (meter.includeInEnergy) {


                locationElectricityEmissions = calculateTotalEmissions(convertedEnergyUse, emissionsRates.locationRate, CH4_Multiplier, N2O_Multiplier, meter.locationGHGMultiplier) / 1000;
                marketElectricityEmissions = calculateTotalEmissions(convertedEnergyUse, emissionsRates.locationRate, CH4_Multiplier, N2O_Multiplier, meter.marketGHGMultiplier)/ 1000;
            } else {
                marketElectricityEmissions = 0;
                locationElectricityEmissions = 0;
            }
        } else {
            //Purchased Compressed Air
            marketElectricityEmissions = 0;
            locationElectricityEmissions = 0;
            // scope2Other = (convertedEnergyUse * emissionsRates.locationRate * meter.locationGHGMultiplier) / 1000;
            scope2Other = calculateTotalEmissions(convertedEnergyUse, emissionsRates.locationRate, CH4_Multiplier, N2O_Multiplier, meter.locationGHGMultiplier) / 1000;
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
        // excessRECsEmissions = excessRECs * marketEmissionsOutputRate;
        excessRECsEmissions = calculateTotalEmissions(excessRECs, emissionsRates.marketRate, CH4_Multiplier, N2O_Multiplier);
        excessRECs = new ConvertValue(excessRECs, 'kWh', 'MWh').convertedValue;
        RECs = new ConvertValue(RECs, 'kWh', 'MWh').convertedValue;
        excessRECsEmissions = excessRECsEmissions / 1000;
        marketElectricityEmissions = marketElectricityEmissions - excessRECsEmissions;
    }

    //NG or non mobile
    if (meter.source == 'Natural Gas' || (meter.source == 'Other Fuels' && meter.scope != 2)) {
        if (energyIsSource && meter.siteToSource != 0) {
            energyUse = energyUse / meter.siteToSource;
        }
        //non-electricity emissions rates are in MMBtu
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'MMBtu').convertedValue;
        let fuelOutputRate: {
            CO2: number,
            CH4: number,
            N2O: number,
            outputRate: number,
            isBiogenic: boolean
        } = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, customFuels, meter.scope, meter.vehicleCategory, meter.vehicleType);
        //emissions calculated in kg CO2e using emissions factors, converted to tonne CO2e
        if (fuelOutputRate.isBiogenic) {
            stationaryBiogenicEmmissions = convertedEnergyUse * fuelOutputRate.CO2;
            stationaryCarbonEmissions = 0;
        } else {
            stationaryCarbonEmissions = (convertedEnergyUse * fuelOutputRate.CO2) / 1000;
            stationaryBiogenicEmmissions = 0;
        }
        //stationary other
        let totalCH4 = convertedEnergyUse * CH4_Multiplier * fuelOutputRate.CH4;
        let totalN2O = convertedEnergyUse * N2O_Multiplier * fuelOutputRate.N2O;
        stationaryOtherEmissions = ((totalCH4 + totalN2O) / 1000) / 1000;
        stationaryEmissions = (stationaryCarbonEmissions + stationaryOtherEmissions);

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
                mobileCarbonEmissions = (totalVolume * meterFuel.CO2) / 1000;
                mobileBiogenicEmissions = 0;
            }
            //miles = gal * mpg 
            let miles = (totalVolume * hhvOrFuelEfficiency);
            let totalCH4 = miles * CH4_Multiplier * meterFuel.CH4;
            let totalN2O = miles * N2O_Multiplier * meterFuel.N2O;
            mobileOtherEmissions = ((totalCH4 + totalN2O) / 1000) / 1000;

        } else {
            //TOTAL VOLUME IS IN MILES
            if (vehicleDistanceUnit != 'mi') {
                //convert to miles
                totalVolume = new ConvertValue(totalVolume, vehicleDistanceUnit, 'mi').convertedValue;
            }
            //On Road calculated by mile
            if (meterFuel.isBiofuel) {
                mobileBiogenicEmissions = (totalVolume * (1 / hhvOrFuelEfficiency) * meterFuel.CO2) / 1000;
                mobileCarbonEmissions = 0;
            } else {
                mobileCarbonEmissions = (totalVolume * (1 / hhvOrFuelEfficiency) * meterFuel.CO2) / 1000;
                mobileBiogenicEmissions = 0;
            }
            let totalCH4 = ((CH4_Multiplier * totalVolume * meterFuel.CH4) / 1000) / 1000;
            let totalN2O = ((N2O_Multiplier * totalVolume * meterFuel.N2O) / 1000) / 1000;
            mobileOtherEmissions = (totalCH4 + totalN2O);
        }
        mobileTotalEmissions = mobileOtherEmissions + mobileCarbonEmissions;
    } else if (meter.source == 'Other') {
        //Fugitive or process
        if (meter.scope == 5) {
            //fugitive emissions
            fugitiveEmissions = totalVolume * meter.globalWarmingPotential / 1000;
        } else if (meter.scope == 6) {
            //process emissions
            processEmissions = totalVolume * meter.globalWarmingPotential / 1000;
        }
    } else if (meter.source == 'Other Energy') {
        let convertedEnergyUse: number = new ConvertValue(energyUse, energyUnit, 'MMBtu').convertedValue;
        let outputRate: number = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, customFuels, meter.scope, meter.vehicleCategory, meter.vehicleType).outputRate;
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
        stationaryEmissions: stationaryEmissions,
        stationaryBiogenicEmmissions: stationaryBiogenicEmmissions,
        totalBiogenicEmissions: stationaryBiogenicEmmissions + mobileBiogenicEmissions,
        stationaryCarbonEmissions: stationaryCarbonEmissions,
        stationaryOtherEmissions: stationaryOtherEmissions
    };
}


export function getEmissionsRate(subregion: string, year: number, co2Emissions: Array<SubregionEmissions>, CH4_Multiplier: number, N2O_Multiplier: number): { marketRate: EmissionsRate, locationRate: EmissionsRate } {
    if (co2Emissions) {
        let subregionEmissions: SubregionEmissions = co2Emissions.find(emissions => { return emissions.subregion == subregion });
        if (subregionEmissions) {
            let marketRate: EmissionsRate = { CO2: 0, N2O: 0, CH4: 0, year: year };
            let locationRate: EmissionsRate = { CO2: 0, N2O: 0, CH4: 0, year: year };
            if (subregionEmissions.locationEmissionRates.length != 0) {
                let closestYearRate: EmissionsRate = _.minBy(subregionEmissions.locationEmissionRates, (emissionRate: EmissionsRate) => {
                    return Math.abs(emissionRate.year - year);
                });
                locationRate = closestYearRate;
            }
            if (subregionEmissions.residualEmissionRates.length != 0) {
                let closestYearRate: EmissionsRate = _.minBy(subregionEmissions.residualEmissionRates, (emissionRate: EmissionsRate) => {
                    return Math.abs(emissionRate.year - year);
                });
                marketRate = closestYearRate;
            }
            return { marketRate: marketRate, locationRate: locationRate };
        }
    }
    return { marketRate: { CO2: 0, N2O: 0, CH4: 0, year: year }, locationRate: { CO2: 0, N2O: 0, CH4: 0, year: year } };
}

export function getFuelEmissionsOutputRate(source: MeterSource, fuel: string, phase: MeterPhase, customFuels: Array<IdbCustomFuel>, scope: number, vehicleCategory: number, vehicleType: number): {
    CO2: number,
    CH4: number,
    N2O: number,
    outputRate: number,
    isBiogenic: boolean
} {
    //emissions rates in kg/MMBtu
    let emissionsRate: number;
    let CO2: number = 0;
    let CH4: number = 0
    let N2O: number = 0;
    let isBiogenic: boolean = false;
    if (source == 'Natural Gas') {
        emissionsRate = 53.1148;
        CO2 = 53.06;
        CH4 = 1;
        N2O = .1;

    } else if (source == 'Other Fuels' || source == 'Other Energy') {
        let fuelTypeOptions: Array<FuelTypeOption> = getFuelTypeOptions(source, phase, customFuels, scope, vehicleCategory, vehicleType);
        let selectedFuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel })
        if (selectedFuel) {
            emissionsRate = selectedFuel.emissionsOutputRate;
            CO2 = selectedFuel.CO2;
            CH4 = selectedFuel.CH4;
            N2O = selectedFuel.N2O;
            isBiogenic = selectedFuel.isBiofuel;
        }
    }
    return {
        outputRate: emissionsRate,
        isBiogenic: isBiogenic,
        N2O: N2O,
        CH4: CH4,
        CO2: CO2
    };
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
        totalWithLocationEmissions: 0,
        totalBiogenicEmissions: 0,
        stationaryBiogenicEmmissions: 0,
        stationaryCarbonEmissions: 0,
        stationaryOtherEmissions: 0
    }
}


export function combineEmissionsResults(results: Array<EmissionsResults>): EmissionsResults {
    return {
        RECs: _.sumBy(results, (result: EmissionsResults) => { return result.RECs }),
        locationElectricityEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.locationElectricityEmissions }),
        marketElectricityEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.marketElectricityEmissions }),
        otherScope2Emissions: _.sumBy(results, (result: EmissionsResults) => { return result.otherScope2Emissions }),
        scope2LocationEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.scope2LocationEmissions }),
        scope2MarketEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.scope2MarketEmissions }),
        excessRECs: _.sumBy(results, (result: EmissionsResults) => { return result.excessRECs }),
        excessRECsEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.excessRECsEmissions }),
        mobileCarbonEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.mobileCarbonEmissions }),
        mobileBiogenicEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.mobileBiogenicEmissions }),
        mobileOtherEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.mobileOtherEmissions }),
        mobileTotalEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.mobileTotalEmissions }),
        fugitiveEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.fugitiveEmissions }),
        processEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.processEmissions }),
        stationaryEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.stationaryEmissions }),
        totalScope1Emissions: _.sumBy(results, (result: EmissionsResults) => { return result.totalScope1Emissions }),
        totalWithMarketEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.totalWithMarketEmissions }),
        totalWithLocationEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.totalWithLocationEmissions }),
        stationaryBiogenicEmmissions: _.sumBy(results, (result: EmissionsResults) => { return result.stationaryBiogenicEmmissions }),
        totalBiogenicEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.totalBiogenicEmissions }),
        stationaryCarbonEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.stationaryCarbonEmissions }),
        stationaryOtherEmissions: _.sumBy(results, (result: EmissionsResults) => { return result.stationaryOtherEmissions })
    }
}

export function setUtilityDataEmissionsValues(utilityData: IdbUtilityMeterData, emissionsResults: EmissionsResults): IdbUtilityMeterData {
    utilityData.RECs = emissionsResults.RECs;
    utilityData.locationElectricityEmissions = emissionsResults.locationElectricityEmissions;
    utilityData.marketElectricityEmissions = emissionsResults.marketElectricityEmissions;
    utilityData.otherScope2Emissions = emissionsResults.otherScope2Emissions;
    utilityData.scope2LocationEmissions = emissionsResults.scope2LocationEmissions;
    utilityData.scope2MarketEmissions = emissionsResults.scope2MarketEmissions;
    utilityData.excessRECs = emissionsResults.excessRECs;
    utilityData.excessRECsEmissions = emissionsResults.excessRECsEmissions;
    utilityData.mobileCarbonEmissions = emissionsResults.mobileCarbonEmissions;
    utilityData.mobileBiogenicEmissions = emissionsResults.mobileBiogenicEmissions;
    utilityData.mobileOtherEmissions = emissionsResults.mobileOtherEmissions;
    utilityData.mobileTotalEmissions = emissionsResults.mobileTotalEmissions;
    utilityData.fugitiveEmissions = emissionsResults.fugitiveEmissions;
    utilityData.processEmissions = emissionsResults.processEmissions;
    utilityData.stationaryEmissions = emissionsResults.stationaryEmissions;
    utilityData.totalScope1Emissions = emissionsResults.totalScope1Emissions;
    utilityData.totalWithMarketEmissions = emissionsResults.totalWithMarketEmissions;
    utilityData.totalWithLocationEmissions = emissionsResults.totalWithLocationEmissions;
    utilityData.totalBiogenicEmissions = emissionsResults.totalBiogenicEmissions;
    utilityData.stationaryBiogenicEmmissions = emissionsResults.stationaryBiogenicEmmissions;
    utilityData.stationaryCarbonEmissions = emissionsResults.stationaryCarbonEmissions;
    utilityData.stationaryOtherEmissions = emissionsResults.stationaryOtherEmissions;
    return utilityData;
}

export function calculateTotalEmissions(energyUse: number, emissionsRate: EmissionsRate, CH4_Multiplier: number, N2O_Multiplier: number, ghgMultiplier: number = 1): number {
    let co2Emissions: number = (energyUse * emissionsRate.CO2) / 1000;
    //stationary other
    let totalCH4 = energyUse * CH4_Multiplier * emissionsRate.CH4;
    let totalN2O = energyUse * N2O_Multiplier * emissionsRate.N2O;
    return (co2Emissions + totalCH4 + totalN2O) * ghgMultiplier;
}