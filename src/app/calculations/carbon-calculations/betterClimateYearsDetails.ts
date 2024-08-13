import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { ConvertValue } from "../conversions/convertValue";
import { EmissionsResults } from "src/app/models/eGridEmissions";
import { getZeroEmissionsResults } from "../emissions-calculations/emissions";
import { getEmissionsTotalsFromArray } from "../shared-calculations/calculationsHelpers";
import { IdbFacility } from "src/app/models/idbModels/facility";

export class BetterClimateYearDetails {

    year: number;
    facilityIds: Array<string>;
    totalSquareFeet: number;
    totalElectricity: number;
    fuelTotals: Array<{ fuelType: string, total: number }>;
    vehicleFuelTotals: Array<{ fuelType: string, total: number }>;
    stationaryFuelTotals: Array<{ fuelType: string, total: number }>;
    onSiteGeneratedElectricity: number;
    purchasedElectricity: number;
    gridElectricity: number;
    pppaElectricity: number;
    vppaElectricity: number;
    RECs: number;
    totalStationaryEnergyUse: number;
    totalVehicleEnergyUse: number;
    totalEnergyUse: number;

    emissionsResults: EmissionsResults;
    reductions: EmissionsResults;
    percentReductions: EmissionsResults;
    relativeContribution: EmissionsResults;
    totalContribution: EmissionsResults;
    totalEmissions: number;
    totalEmissionsReduction: number;
    percentEmissionsReduction: number;

    annualPercentImprovement: number;

    scope2EnergyUse: number;
    scope2MarketEmissionsFactor: number;
    scope2LocationEmissionsFactor: number;
    decreaseInScope2EnergyUse: number;
    increaseInOnsiteRenewables: number;
    increaseInOffsiteRenewables: number;
    emissionsReductionChange: number;
    goalForEmissions: number;


    scope2ChangeInEnergyUse: number;
    scope2OnsiteRenewablesReductions: number;
    scope2OffsiteRenewablesReductions: number;
    scope2GreenOfGridReductions: number;
    constructor(year: number,
        calanderizedMeters: Array<CalanderizedMeter>,
        facilities: Array<IdbFacility>,
        emissionsDisplay: 'market' | 'location',
        baselineYearDetails: BetterClimateYearDetails,
        previousYearDetails: BetterClimateYearDetails,
        emissionsGoal: number,
        accountDetails: BetterClimateYearDetails) {
        this.year = year;
        this.setFacilityIds(calanderizedMeters);
        this.setTotalSquareFeet(facilities);
        this.setEmissionsResults(calanderizedMeters, year);

        this.setTotalEmissions(emissionsDisplay);
        this.setTotalEmissionsReduction(baselineYearDetails);
        this.setPercentEmissionsReduction(baselineYearDetails);

        this.setReductions(baselineYearDetails);
        this.setPercentReductions(baselineYearDetails);
        this.setRelativeContribution(accountDetails);
        this.setTotalContribution();

        //electricity
        let electricityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == 'Electricity'
        });
        let electricityMonthlyData: Array<MonthlyData> = electricityMeters.flatMap(eMeter => {
            return eMeter.monthlyData;
        });
        electricityMonthlyData = electricityMonthlyData.filter(mData => {
            return mData.fiscalYear == year;
        });
        // this.setTotalElectricity(electricityMonthlyData);

        this.onSiteGeneratedElectricity = this.getElectricityUse(electricityMeters, year, [2]);
        this.purchasedElectricity = this.getElectricityUse(electricityMeters, year, undefined) - this.onSiteGeneratedElectricity;
        this.totalElectricity = this.purchasedElectricity + this.onSiteGeneratedElectricity;

        this.pppaElectricity = this.getElectricityUse(electricityMeters, year, [3, 5]);
        this.vppaElectricity = this.getElectricityUse(electricityMeters, year, [4]);
        this.RECs = this.getElectricityUse(electricityMeters, year, [6]);
        //update #1666
        this.gridElectricity = this.purchasedElectricity - this.pppaElectricity - this.RECs - this.vppaElectricity;

        //fuel
        this.setStationaryFuelTotals(calanderizedMeters);
        this.setVehicleFuelTotals(calanderizedMeters);
        this.fuelTotals = _.concat(this.stationaryFuelTotals, this.vehicleFuelTotals);
        this.setTotalStationaryEnergyUse();
        this.setVehicleTotalEnergyUse();
        this.totalEnergyUse = this.totalStationaryEnergyUse + this.totalVehicleEnergyUse;

        this.setAnnualPercentImprovement(previousYearDetails);
        this.setScope2EnergyUse(calanderizedMeters, year);
        this.setScope2EmissionsFactors();
        this.setDecreaseInScope2EnergyUse(baselineYearDetails);
        this.setChangeInRenewables(previousYearDetails);
        this.setEmissionsReductionChange(previousYearDetails);
        this.setGoalForEmissions(emissionsGoal);
        this.setScope2ChangeInEnergyUse(baselineYearDetails);
        this.setScope2OnsiteRenewablesReductions(baselineYearDetails);
        this.setScope2OffsiteRenewablesReductions(baselineYearDetails);
        this.setScope2GreenOfTheGridReductions();
    }

    setFacilityIds(calanderizedMeters: Array<CalanderizedMeter>) {
        this.facilityIds = new Array();
        calanderizedMeters.forEach(cMeter => {
            let findMonthlyEntry: MonthlyData = cMeter.monthlyData.find(data => {
                return data.fiscalYear == this.year;
            });
            if (findMonthlyEntry && this.facilityIds.includes(cMeter.meter.facilityId) == false) {
                this.facilityIds.push(cMeter.meter.facilityId);
            }
        })
    }

    setTotalSquareFeet(facilities: Array<IdbFacility>) {
        this.totalSquareFeet = 0;
        this.facilityIds.forEach(facilityId => {
            let facility: IdbFacility = facilities.find(facility => { return facility.guid == facilityId });
            if (facility && facility.size) {
                this.totalSquareFeet += facility.size;
            }
        })
    }

    setEmissionsResults(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => {
            return cMeter.monthlyData;
        });
        let yearData: Array<MonthlyData> = monthlyData.filter(mData => {
            return mData.fiscalYear == year;
        })
        this.emissionsResults = getEmissionsTotalsFromArray(yearData);
    }

    setReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.reductions = {
                RECs: this.calculateReductions(baselineYearDetails.emissionsResults.RECs, this.emissionsResults.RECs),
                locationElectricityEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.locationElectricityEmissions, this.emissionsResults.locationElectricityEmissions),
                marketElectricityEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.marketElectricityEmissions, this.emissionsResults.marketElectricityEmissions),
                otherScope2Emissions: this.calculateReductions(baselineYearDetails.emissionsResults.otherScope2Emissions, this.emissionsResults.otherScope2Emissions),
                scope2LocationEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.scope2LocationEmissions, this.emissionsResults.scope2LocationEmissions),
                scope2MarketEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.scope2MarketEmissions, this.emissionsResults.scope2MarketEmissions),
                excessRECs: this.calculateReductions(baselineYearDetails.emissionsResults.excessRECs, this.emissionsResults.excessRECs),
                excessRECsEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.excessRECsEmissions, this.emissionsResults.excessRECsEmissions),
                mobileCarbonEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.mobileCarbonEmissions, this.emissionsResults.mobileCarbonEmissions),
                mobileBiogenicEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.mobileBiogenicEmissions, this.emissionsResults.mobileBiogenicEmissions),
                mobileOtherEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.mobileOtherEmissions, this.emissionsResults.mobileOtherEmissions),
                mobileTotalEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.mobileTotalEmissions, this.emissionsResults.mobileTotalEmissions),
                fugitiveEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.fugitiveEmissions, this.emissionsResults.fugitiveEmissions),
                processEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.processEmissions, this.emissionsResults.processEmissions),
                stationaryEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.stationaryEmissions, this.emissionsResults.stationaryEmissions),
                totalScope1Emissions: this.calculateReductions(baselineYearDetails.emissionsResults.totalScope1Emissions, this.emissionsResults.totalScope1Emissions),
                totalWithMarketEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.totalWithMarketEmissions, this.emissionsResults.totalWithMarketEmissions),
                totalWithLocationEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.totalWithLocationEmissions, this.emissionsResults.totalWithLocationEmissions),
                totalBiogenicEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.totalBiogenicEmissions, this.emissionsResults.totalBiogenicEmissions),
                stationaryBiogenicEmmissions: this.calculateReductions(baselineYearDetails.emissionsResults.stationaryBiogenicEmmissions, this.emissionsResults.stationaryBiogenicEmmissions),
                stationaryCarbonEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.stationaryCarbonEmissions, this.emissionsResults.stationaryCarbonEmissions),
                stationaryOtherEmissions: this.calculateReductions(baselineYearDetails.emissionsResults.stationaryOtherEmissions, this.emissionsResults.stationaryOtherEmissions),
            }
        } else {
            this.reductions = getZeroEmissionsResults();
        }
    }

    calculateReductions(baselineValue: number, currentYearValue: number): number {
        return baselineValue - currentYearValue;
    }

    setPercentReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.percentReductions = {
                RECs: this.calculatePercentReductions(baselineYearDetails.emissionsResults.RECs, this.reductions.RECs),
                locationElectricityEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.locationElectricityEmissions, this.reductions.locationElectricityEmissions),
                marketElectricityEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.marketElectricityEmissions, this.reductions.marketElectricityEmissions),
                otherScope2Emissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.otherScope2Emissions, this.reductions.otherScope2Emissions),
                scope2LocationEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.scope2LocationEmissions, this.reductions.scope2LocationEmissions),
                scope2MarketEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.scope2MarketEmissions, this.reductions.scope2MarketEmissions),
                excessRECs: this.calculatePercentReductions(baselineYearDetails.emissionsResults.excessRECs, this.reductions.excessRECs),
                excessRECsEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.excessRECsEmissions, this.reductions.excessRECsEmissions),
                mobileCarbonEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.mobileCarbonEmissions, this.reductions.mobileCarbonEmissions),
                mobileBiogenicEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.mobileBiogenicEmissions, this.reductions.mobileBiogenicEmissions),
                mobileOtherEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.mobileOtherEmissions, this.reductions.mobileOtherEmissions),
                mobileTotalEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.mobileTotalEmissions, this.reductions.mobileTotalEmissions),
                fugitiveEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.fugitiveEmissions, this.reductions.fugitiveEmissions),
                processEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.processEmissions, this.reductions.processEmissions),
                stationaryEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.stationaryEmissions, this.reductions.stationaryEmissions),
                totalScope1Emissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.totalScope1Emissions, this.reductions.totalScope1Emissions),
                totalWithMarketEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.totalWithMarketEmissions, this.reductions.totalWithMarketEmissions),
                totalWithLocationEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.totalWithLocationEmissions, this.reductions.totalWithLocationEmissions),
                totalBiogenicEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.totalBiogenicEmissions, this.reductions.totalBiogenicEmissions),
                stationaryBiogenicEmmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.stationaryBiogenicEmmissions, this.reductions.stationaryBiogenicEmmissions),
                stationaryCarbonEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.stationaryCarbonEmissions, this.reductions.stationaryCarbonEmissions),
                stationaryOtherEmissions: this.calculatePercentReductions(baselineYearDetails.emissionsResults.stationaryOtherEmissions, this.reductions.stationaryOtherEmissions),
            }
        } else {
            this.percentReductions = getZeroEmissionsResults();
        }
    }

    calculatePercentReductions(baselineValue: number, currentYearValue: number): number {
        return (currentYearValue / baselineValue) * 100
    }

    setRelativeContribution(accountDetails: BetterClimateYearDetails) {
        if (accountDetails) {
            this.relativeContribution = {
                RECs: this.calculateRelativeContribution(accountDetails.percentReductions.RECs, accountDetails.reductions.RECs, this.reductions.RECs),
                locationElectricityEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.locationElectricityEmissions, accountDetails.reductions.locationElectricityEmissions, this.reductions.locationElectricityEmissions),
                marketElectricityEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.marketElectricityEmissions, accountDetails.reductions.marketElectricityEmissions, this.reductions.marketElectricityEmissions),
                otherScope2Emissions: this.calculateRelativeContribution(accountDetails.percentReductions.otherScope2Emissions, accountDetails.reductions.otherScope2Emissions, this.reductions.otherScope2Emissions),
                scope2LocationEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.scope2LocationEmissions, accountDetails.reductions.scope2LocationEmissions, this.reductions.scope2LocationEmissions),
                scope2MarketEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.scope2MarketEmissions, accountDetails.reductions.scope2MarketEmissions, this.reductions.scope2MarketEmissions),
                excessRECs: this.calculateRelativeContribution(accountDetails.percentReductions.excessRECs, accountDetails.reductions.excessRECs, this.reductions.excessRECs),
                excessRECsEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.excessRECsEmissions, accountDetails.reductions.excessRECsEmissions, this.reductions.excessRECsEmissions),
                mobileCarbonEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.mobileCarbonEmissions, accountDetails.reductions.mobileCarbonEmissions, this.reductions.mobileCarbonEmissions),
                mobileBiogenicEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.mobileBiogenicEmissions, accountDetails.reductions.mobileBiogenicEmissions, this.reductions.mobileBiogenicEmissions),
                mobileOtherEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.mobileOtherEmissions, accountDetails.reductions.mobileOtherEmissions, this.reductions.mobileOtherEmissions),
                mobileTotalEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.mobileTotalEmissions, accountDetails.reductions.mobileTotalEmissions, this.reductions.mobileTotalEmissions),
                fugitiveEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.fugitiveEmissions, accountDetails.reductions.fugitiveEmissions, this.reductions.fugitiveEmissions),
                processEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.processEmissions, accountDetails.reductions.processEmissions, this.reductions.processEmissions),
                stationaryEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.stationaryEmissions, accountDetails.reductions.stationaryEmissions, this.reductions.stationaryEmissions),
                totalScope1Emissions: this.calculateRelativeContribution(accountDetails.percentReductions.totalScope1Emissions, accountDetails.reductions.totalScope1Emissions, this.reductions.totalScope1Emissions),
                totalWithMarketEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.totalWithMarketEmissions, accountDetails.reductions.totalWithMarketEmissions, this.reductions.totalWithMarketEmissions),
                totalWithLocationEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.totalWithLocationEmissions, accountDetails.reductions.totalWithLocationEmissions, this.reductions.totalWithLocationEmissions),
                totalBiogenicEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.totalBiogenicEmissions, accountDetails.reductions.totalBiogenicEmissions, this.reductions.totalBiogenicEmissions),
                stationaryBiogenicEmmissions: this.calculateRelativeContribution(accountDetails.percentReductions.stationaryBiogenicEmmissions, accountDetails.reductions.stationaryBiogenicEmmissions, this.reductions.stationaryBiogenicEmmissions),
                stationaryCarbonEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.stationaryCarbonEmissions, accountDetails.reductions.stationaryCarbonEmissions, this.reductions.stationaryCarbonEmissions),
                stationaryOtherEmissions: this.calculateRelativeContribution(accountDetails.percentReductions.stationaryOtherEmissions, accountDetails.reductions.stationaryOtherEmissions, this.reductions.stationaryOtherEmissions),
            }
        } else {
            this.relativeContribution = getZeroEmissionsResults();
        }
    }

    calculateRelativeContribution(accountDetailsPercentReductions: number, accountReductions: number, yearReductions: number) {
        let relativeContribution: number = (yearReductions * accountDetailsPercentReductions) / accountReductions;
        if (isNaN(relativeContribution)) {
            return 0;
        } else {
            return relativeContribution;
        }
    }

    setTotalContribution() {
        this.totalContribution = {
            RECs: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.RECs),
            locationElectricityEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.locationElectricityEmissions),
            marketElectricityEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.marketElectricityEmissions),
            otherScope2Emissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.otherScope2Emissions),
            scope2LocationEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.scope2LocationEmissions),
            scope2MarketEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.scope2MarketEmissions),
            excessRECs: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.excessRECs),
            excessRECsEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.excessRECsEmissions),
            mobileCarbonEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.mobileCarbonEmissions),
            mobileBiogenicEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.mobileBiogenicEmissions),
            mobileOtherEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.mobileOtherEmissions),
            mobileTotalEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.mobileTotalEmissions),
            fugitiveEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.fugitiveEmissions),
            processEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.processEmissions),
            stationaryEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.stationaryEmissions),
            totalScope1Emissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.totalScope1Emissions),
            totalWithMarketEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.totalWithMarketEmissions),
            totalWithLocationEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.totalWithLocationEmissions),
            totalBiogenicEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.totalBiogenicEmissions),
            stationaryBiogenicEmmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.stationaryBiogenicEmmissions),
            stationaryCarbonEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.stationaryCarbonEmissions),
            stationaryOtherEmissions: this.calculateTotalContribution(this.percentEmissionsReduction, this.totalEmissionsReduction, this.reductions.stationaryOtherEmissions),
        }
    }

    calculateTotalContribution(percentEmissionsReduction: number, totalEmissionsReduction: number, yearReductions: number) {
        let totalContribution: number = (yearReductions * percentEmissionsReduction) / totalEmissionsReduction;
        if (isNaN(totalContribution)) {
            totalContribution = 0;
        }
        return totalContribution;
    }

    // setTotalElectricity(monthlyData: Array<MonthlyData>) {
    //     let sumElectricity: number = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
    //         return monthlyData.energyConsumption;
    //     });
    //     this.totalElectricity = new ConvertValue(sumElectricity, 'MMBtu', 'MWh').convertedValue;
    // }

    setStationaryFuelTotals(calanderizedMeters: Array<CalanderizedMeter>) {
        let fuelTypes: Array<string> = this.getFuelTypes(calanderizedMeters);
        this.stationaryFuelTotals = new Array();
        fuelTypes.forEach(type => {
            let typeCalanderizedMeters: Array<CalanderizedMeter>;
            if (type == 'Natural Gas') {
                typeCalanderizedMeters = calanderizedMeters.filter(cMeter => {
                    return cMeter.meter.source == 'Natural Gas';
                });
            } else {
                typeCalanderizedMeters = calanderizedMeters.filter(cMeter => {
                    return cMeter.meter.fuel == type;
                });
            }
            let monthlyData: Array<MonthlyData> = typeCalanderizedMeters.flatMap(cMeter => {
                return cMeter.monthlyData;
            });
            monthlyData = monthlyData.filter(mData => {
                return mData.fiscalYear == this.year;
            });
            let sumConsumption: number = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
                return monthlyData.energyConsumption;
            });
            this.stationaryFuelTotals.push({
                fuelType: type,
                total: sumConsumption
            });
        });
    }

    getFuelTypes(calanderizedMeters: Array<CalanderizedMeter>): Array<string> {
        let meterTypes: Array<string> = new Array();
        calanderizedMeters.forEach(cMeter => {
            if (cMeter.meter.source == 'Natural Gas') {
                meterTypes.push(cMeter.meter.source);
            } else if (cMeter.meter.source == 'Other Fuels') {
                //non vehicles
                if (cMeter.meter.scope != 2) {
                    meterTypes.push(cMeter.meter.fuel);
                }
            } else if (cMeter.meter.source == 'Other Energy') {
                meterTypes.push(cMeter.meter.fuel);
            }
        });
        let uniqMeterTypes: Array<string> = _.uniq(meterTypes);
        return uniqMeterTypes;
    }

    setTotalStationaryEnergyUse() {
        let convertedElectricityUse: number = new ConvertValue(this.totalElectricity, 'MWh', 'MMBtu').convertedValue;
        let totalFuelUsage: number = _.sumBy(this.stationaryFuelTotals, 'total');
        this.totalStationaryEnergyUse = convertedElectricityUse + totalFuelUsage;
    }

    /**
    * Aggreement types
    * 1: Grid
    * 2: On-site Generation
    * 3: Physical Power Purchase Agreement (PPPA)
    * 4: Virtual Power Purchase Agreement (VPPA)
    * 5: Utility Green Product
    * 6: Renewable Energy Credits (RECs)
     */
    getElectricityUse(electricityMeters: Array<CalanderizedMeter>, year: number, agreementTypes: Array<number>) {
        let includedMeters: Array<CalanderizedMeter> = new Array();
        electricityMeters.forEach(cMeter => {
            if (agreementTypes) {
                if (agreementTypes.includes(cMeter.meter.agreementType)) {
                    includedMeters.push(cMeter);
                }
            } else {
                // if (cMeter.meter.agreementType != 2) {
                //update for #1666..
                if (cMeter.meter.includeInEnergy) {
                    includedMeters.push(cMeter);
                }
            }
        });
        let monthlyData: Array<MonthlyData> = includedMeters.flatMap(eMeter => {
            return eMeter.monthlyData;
        });
        monthlyData = monthlyData.filter(mData => {
            return mData.fiscalYear == year;
        });
        let sumElectricity: number = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
            return monthlyData.energyConsumption;
        });
        return new ConvertValue(sumElectricity, 'MMBtu', 'MWh').convertedValue;
    }

    setVehicleFuelTotals(calanderizedMeters: Array<CalanderizedMeter>) {
        this.vehicleFuelTotals = new Array();
        let vehicleMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.scope == 2;
        });
        let vehicleFuels: Array<string> = vehicleMeters.flatMap(vMeter => {
            return vMeter.meter.vehicleFuel
        });
        vehicleFuels = _.uniq(vehicleFuels);
        vehicleFuels.forEach(vFuel => {
            let typeCalanderizedMeters: Array<CalanderizedMeter> = vehicleMeters.filter(vMeter => {
                return vMeter.meter.vehicleFuel == vFuel;
            });
            let monthlyData: Array<MonthlyData> = typeCalanderizedMeters.flatMap(cMeter => {
                return cMeter.monthlyData;
            });
            monthlyData = monthlyData.filter(mData => {
                return mData.fiscalYear == this.year;
            });
            let sumConsumption: number = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
                return monthlyData.energyUse;
            });
            this.vehicleFuelTotals.push({
                fuelType: vFuel,
                total: sumConsumption
            });
        });

    }

    setVehicleTotalEnergyUse() {
        this.totalVehicleEnergyUse = _.sumBy(this.vehicleFuelTotals, 'total');
    }

    setTotalEmissions(emissionsDisplay: 'market' | 'location') {
        if (emissionsDisplay == 'location') {
            this.totalEmissions = this.emissionsResults.totalWithLocationEmissions;
        } else {
            this.totalEmissions = this.emissionsResults.totalWithMarketEmissions;
        }
    }

    setTotalEmissionsReduction(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.totalEmissionsReduction = baselineYearDetails.totalEmissions - this.totalEmissions;
        } else {
            this.totalEmissionsReduction = 0;
        }
    }

    setPercentEmissionsReduction(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.percentEmissionsReduction = (this.totalEmissionsReduction / baselineYearDetails.totalEmissions) * 100;
        } else {
            this.percentEmissionsReduction = 0;
        }
    }

    setAnnualPercentImprovement(previousYearDetails: BetterClimateYearDetails) {
        if (previousYearDetails) {
            this.annualPercentImprovement = this.percentEmissionsReduction - previousYearDetails.percentEmissionsReduction;
        } else {
            this.annualPercentImprovement = 0;
        }
    }

    setScope2EnergyUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let scope1Meters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.scope == 3 || cMeter.meter.scope == 4
        });
        let monthlyData: Array<MonthlyData> = scope1Meters.flatMap(eMeter => {
            return eMeter.monthlyData;
        });
        monthlyData = monthlyData.filter(mData => {
            return mData.fiscalYear == year;
        });
        this.scope2EnergyUse = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
            return monthlyData.energyConsumption;
        });
    }

    setScope2EmissionsFactors() {
        this.scope2LocationEmissionsFactor = (this.scope2EnergyUse / this.emissionsResults.scope2LocationEmissions) * 1000;
        this.scope2MarketEmissionsFactor = (this.scope2EnergyUse / this.emissionsResults.scope2MarketEmissions) * 1000;
    }

    setDecreaseInScope2EnergyUse(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.decreaseInScope2EnergyUse = baselineYearDetails.scope2EnergyUse - this.scope2EnergyUse;
        } else {
            this.decreaseInScope2EnergyUse = 0;
        }
    }

    setChangeInRenewables(previousYearDetails: BetterClimateYearDetails) {
        if (previousYearDetails) {
            this.increaseInOnsiteRenewables = this.onSiteGeneratedElectricity - previousYearDetails.onSiteGeneratedElectricity;

            let currentYearOffsiteRenewables: number = (this.pppaElectricity + this.vppaElectricity + this.RECs);
            let previousYearOffsiteRenewables: number = (previousYearDetails.pppaElectricity + previousYearDetails.vppaElectricity + previousYearDetails.RECs);
            this.increaseInOffsiteRenewables = currentYearOffsiteRenewables - previousYearOffsiteRenewables;
        } else {
            this.increaseInOnsiteRenewables = 0;
            this.increaseInOffsiteRenewables = 0;
        }
    }

    setEmissionsReductionChange(previousYearDetails: BetterClimateYearDetails) {
        if (previousYearDetails) {
            this.emissionsReductionChange = this.scope2EnergyUse * (previousYearDetails.scope2MarketEmissionsFactor - this.scope2MarketEmissionsFactor) / 1000;
        } else {
            this.emissionsReductionChange = this.scope2EnergyUse * (this.scope2MarketEmissionsFactor - this.scope2MarketEmissionsFactor) / 1000;
        }
    }

    setGoalForEmissions(emissionsGoal: number) {
        this.goalForEmissions = this.totalEmissions * (1 - emissionsGoal);
    }

    setScope2ChangeInEnergyUse(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2ChangeInEnergyUse = baselineYearDetails.scope2MarketEmissionsFactor * this.scope2EnergyUse / 1000
        } else {
            this.scope2ChangeInEnergyUse = 0;
        }
    }

    setScope2OnsiteRenewablesReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2OnsiteRenewablesReductions = baselineYearDetails.emissionsResults.scope2LocationEmissions * this.increaseInOnsiteRenewables / 1000
        } else {
            this.scope2OnsiteRenewablesReductions = 0;
        }
    }

    setScope2OffsiteRenewablesReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2OffsiteRenewablesReductions = baselineYearDetails.emissionsResults.scope2LocationEmissions * this.increaseInOffsiteRenewables / 1000
        } else {
            this.scope2OffsiteRenewablesReductions = 0;
        }
    }

    setScope2GreenOfTheGridReductions() {
        this.scope2GreenOfGridReductions = this.scope2ChangeInEnergyUse + this.scope2OnsiteRenewablesReductions + this.scope2OffsiteRenewablesReductions;
    }

    //(From xcel document) currently two calculations for total reductions. figure out which on to use.
    // setTotalEmissionsReductions() {
    //     this.totalEmissionsReductions = this.stationaryEmissionsReductions + this.mobileEmissionsReductions + this.fugitiveEmissionsReductions + this.scope2ChangeInEnergyUse + this.scope2OnsiteRenewablesReductions + this.scope2OffsiteRenewablesReductions + this.scope2GreenOfGridReductions;
    // }
}