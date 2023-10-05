import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbFacility } from "src/app/models/idb";
import * as _ from 'lodash';
import { ConvertValue } from "../conversions/convertValue";

export class BetterClimateYearDetails {

    year: number;
    facilityIds: Array<string>;
    totalSquareFeet: number;
    totalElectricity: number;
    fuelTotals: Array<{ fuelType: string, total: number }>;
    onSiteGeneratedElectricity: number;
    purchasedElectricity: number;
    gridElectricity: number;
    pppaElectricity: number;
    vppaElectricity: number;
    RECs: number;
    totalEnergyUse: number;


    //TODO: Reduction Percentages based on total emssion (+scope 2) and relative to emission Type
    scope1Emissions: number;
    scope1Reductions: number;
    scope1PercentReductions: number;
    scope1ReductionContribution: number;

    stationaryEmissions: number;
    stationaryEmissionsReductions: number;
    stationaryEmissionsPercentReductions: number;
    stationaryEmissionsReductionContribution: number;

    mobileEmissions: number;
    mobileEmissionsReductions: number;
    mobileEmissionsPercentReductions: number;
    mobileEmissionsReductionContribution: number;

    fugitiveEmissions: number;
    fugitiveEmissionsReductions: number;
    fugitiveEmissionsPercentReductions: number;
    fugitiveEmissionsReductionContribution: number;

    processEmissions: number;
    processEmissionsReductions: number;
    processEmissionsPercentReductions: number;
    processEmissionsReductionContribution: number;

    scope2MarketEmissions: number;
    scope2MarketReductions: number;
    scope2MarketPercentReductions: number;
    scope2MarketReductionContribution: number;

    scope2LocationEmissions: number;
    scope2LocationReductions: number;
    scope2LocationPercentReductions: number;
    scope2LocationReductionContribution: number;


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
    totalEmissionsReductions: number;
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
        this.setTotalElectricity(electricityMonthlyData);

        this.onSiteGeneratedElectricity = this.getElectricityUse(electricityMeters, year, 2);
        this.purchasedElectricity = this.getElectricityUse(electricityMeters, year, undefined);
        this.gridElectricity = this.getElectricityUse(electricityMeters, year, 1);
        this.pppaElectricity = this.getElectricityUse(electricityMeters, year, 3);
        this.vppaElectricity = this.getElectricityUse(electricityMeters, year, 4);
        this.RECs = this.getElectricityUse(electricityMeters, year, 6);
        //fuel
        let fuelTypes: Array<string> = this.getFuelTypes(calanderizedMeters);
        this.setFuelTotals(fuelTypes, calanderizedMeters);
        this.setTotalEnergyUse();
        //emissions
        this.scope1Emissions = this.getEmissionsTotal(calanderizedMeters, year, [1, 2], false);

        this.stationaryEmissions = this.getEmissionsTotal(calanderizedMeters, year, [1], false);
        this.setStationaryEmissionsReductions(baselineYearDetails);
        this.setStationaryEmissionsPercentReductions(baselineYearDetails);
        this.setStationaryEmissionsReductionContribution(baselineYearDetails);

        this.mobileEmissions = this.getEmissionsTotal(calanderizedMeters, year, [2], false);
        //TODO: fugitive and process coming soon
        this.fugitiveEmissions = 0;
        this.processEmissions = 0;

        this.scope2MarketEmissions = this.getEmissionsTotal(calanderizedMeters, year, [3, 4], true);
        this.scope2LocationEmissions = this.getEmissionsTotal(calanderizedMeters, year, [3, 4], false);

        this.setTotalEmissions(emissionsDisplay);
        this.setTotalEmissionsReduction(baselineYearDetails);
        this.setPercentEmissionsReduction(baselineYearDetails);
        this.setAnnualPercentImprovement(previousYearDetails);
        this.setScope2EnergyUse(calanderizedMeters, year);
        this.setScope2EmissionsFactors();
        this.setDecreaseInScope2EnergyUse(baselineYearDetails);
        this.setChangeInRenewables(previousYearDetails);
        this.setEmissionsReductionChange(previousYearDetails);
        this.setGoalForEmissions(emissionsGoal);

        this.setScope1MobileReductions(baselineYearDetails);
        this.setScope1FugitiveReductions(baselineYearDetails);
        this.setScope1Reductions(baselineYearDetails);
        this.setScope1PercentReductions(baselineYearDetails);
        this.setScope2ChangeInEnergyUse(baselineYearDetails);
        this.setScope2OnsiteRenewablesReductions(baselineYearDetails);
        this.setScope2OffsiteRenewablesReductions(baselineYearDetails);
        this.setScope2GreenOfTheGridReductions();
        this.setTotalEmissionsReductions();


        this.setScope2MarketReductions(baselineYearDetails);
        this.setScope2MarketPercentReductions(baselineYearDetails);
        this.setScope2LocationReductions(baselineYearDetails);
        this.setScope2LocationPercentReductions(baselineYearDetails);
        if (accountDetails) {
            this.setScope1ReductionContribution(accountDetails);
            this.setScope2MarketReductionContribution(accountDetails);
            this.setScope2LocationReductionContribution(accountDetails);
        }
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

    setTotalElectricity(monthlyData: Array<MonthlyData>) {
        let sumElectricity: number = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
            return monthlyData.energyConsumption;
        });
        this.totalElectricity = new ConvertValue(sumElectricity, 'MMBtu', 'MWh').convertedValue;
    }

    setFuelTotals(meterTypes: Array<string>, calanderizedMeters: Array<CalanderizedMeter>) {
        this.fuelTotals = new Array();
        meterTypes.forEach(type => {
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
            this.fuelTotals.push({
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
                meterTypes.push(cMeter.meter.fuel);
            } else if (cMeter.meter.source == 'Other Energy') {
                meterTypes.push(cMeter.meter.fuel);
            }
        });
        let uniqMeterTypes: Array<string> = _.uniq(meterTypes);
        return uniqMeterTypes;
    }

    setTotalEnergyUse() {
        let convertedElectricityUse: number = new ConvertValue(this.totalElectricity, 'MWh', 'MMBtu').convertedValue;
        let totalFuelUsage: number = _.sumBy(this.fuelTotals, 'total');
        this.totalEnergyUse = convertedElectricityUse + totalFuelUsage;
    }

    getElectricityUse(electricityMeters: Array<CalanderizedMeter>, year: number, agreementType: number) {
        let includedMeters: Array<CalanderizedMeter> = new Array();
        electricityMeters.forEach(cMeter => {
            if (agreementType) {
                if (cMeter.meter.agreementType == agreementType) {
                    includedMeters.push(cMeter);
                }
            } else {
                if (cMeter.meter.agreementType != 2) {
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

    getEmissionsTotal(calanderizedMeters: Array<CalanderizedMeter>, year: number, includedScope: Array<number>, isMarketEmissions: boolean): number {
        let scope1Meters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return includedScope.includes(cMeter.meter.scope)
        });
        let monthlyData: Array<MonthlyData> = scope1Meters.flatMap(eMeter => {
            return eMeter.monthlyData;
        });
        monthlyData = monthlyData.filter(mData => {
            return mData.fiscalYear == year;
        });
        if (isMarketEmissions) {
            return _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
                return monthlyData.marketEmissions;
            });
        } else {
            return _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
                return monthlyData.locationEmissions;
            });
        }
    }

    setTotalEmissions(emissionsDisplay: 'market' | 'location') {
        if (emissionsDisplay == 'location') {
            this.totalEmissions = this.scope1Emissions + this.scope2LocationEmissions;
        } else {
            this.totalEmissions = this.scope1Emissions + this.scope2MarketEmissions;
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
        this.scope2LocationEmissionsFactor = (this.scope2EnergyUse / this.scope2LocationEmissions) * 1000;
        this.scope2MarketEmissionsFactor = (this.scope2EnergyUse / this.scope2MarketEmissions) * 1000;
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

    setStationaryEmissionsReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.stationaryEmissionsReductions = baselineYearDetails.stationaryEmissions - this.stationaryEmissions;
        } else {
            this.stationaryEmissionsReductions = 0;
        }
    }
    setScope1MobileReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.mobileEmissionsReductions = baselineYearDetails.mobileEmissions - this.mobileEmissions;
        } else {
            this.mobileEmissionsReductions = 0;
        }
    }

    setScope1FugitiveReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.fugitiveEmissionsReductions = baselineYearDetails.fugitiveEmissions - this.fugitiveEmissions;
        } else {
            this.fugitiveEmissionsReductions = 0;
        }
    }

    setScope1Reductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope1Reductions = baselineYearDetails.scope1Emissions - this.scope1Emissions;
        } else {
            this.scope1Reductions = 0;
        }
    }

    setScope1PercentReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope1PercentReductions = (this.scope1Reductions / baselineYearDetails.scope1Emissions) * 100;
        } else {
            this.scope1PercentReductions = 0;
        }
    }

    setScope1ReductionContribution(accountDetails: BetterClimateYearDetails) {
        if (accountDetails) {
            this.scope1ReductionContribution = (this.scope1Reductions * accountDetails.scope1PercentReductions) / accountDetails.scope1Reductions;
            if (isNaN(this.scope1ReductionContribution)) {
                this.scope1ReductionContribution = 0;
            }
        } else {
            this.scope1ReductionContribution = 0;
        }
    }

    setStationaryEmissionsPercentReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.stationaryEmissionsPercentReductions = (this.stationaryEmissionsReductions / baselineYearDetails.stationaryEmissions) * 100;
        } else {
            this.stationaryEmissionsPercentReductions = 0;
        }
    }

    setStationaryEmissionsReductionContribution(accountDetails: BetterClimateYearDetails) {
        if (accountDetails) {
            this.stationaryEmissionsReductionContribution = (this.stationaryEmissions * accountDetails.stationaryEmissionsPercentReductions) / accountDetails.stationaryEmissions;
            if (isNaN(this.stationaryEmissionsReductionContribution)) {
                this.stationaryEmissionsReductionContribution = 0;
            }
        } else {
            this.stationaryEmissionsReductionContribution = 0;
        }
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
            this.scope2OnsiteRenewablesReductions = baselineYearDetails.scope2LocationEmissions * this.increaseInOnsiteRenewables / 1000
        } else {
            this.scope2OnsiteRenewablesReductions = 0;
        }
    }

    setScope2OffsiteRenewablesReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2OffsiteRenewablesReductions = baselineYearDetails.scope2LocationEmissions * this.increaseInOffsiteRenewables / 1000
        } else {
            this.scope2OffsiteRenewablesReductions = 0;
        }
    }

    setScope2GreenOfTheGridReductions() {
        this.scope2GreenOfGridReductions = this.scope2ChangeInEnergyUse + this.scope2OnsiteRenewablesReductions + this.scope2OffsiteRenewablesReductions;
    }

    //currently two calculations for total reductions. figure out which on to use.
    setTotalEmissionsReductions() {
        this.totalEmissionsReductions = this.stationaryEmissionsReductions + this.mobileEmissionsReductions + this.fugitiveEmissionsReductions + this.scope2ChangeInEnergyUse + this.scope2OnsiteRenewablesReductions + this.scope2OffsiteRenewablesReductions + this.scope2GreenOfGridReductions;
    }


    setScope2MarketReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2MarketReductions = baselineYearDetails.scope2MarketEmissions - this.scope2MarketEmissions;
        } else {
            this.scope2MarketReductions = 0;
        }
    }

    setScope2MarketPercentReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2MarketPercentReductions = (this.scope2MarketReductions / baselineYearDetails.scope2MarketEmissions) * 100;
        } else {
            this.scope2MarketPercentReductions = 0;
        }
    }

    setScope2MarketReductionContribution(accountDetails: BetterClimateYearDetails) {
        if (accountDetails) {
            this.scope2MarketReductionContribution = (this.scope2MarketReductions * accountDetails.scope2MarketPercentReductions) / accountDetails.scope2MarketReductions;
            if (isNaN(this.scope2MarketReductionContribution)) {
                this.scope2MarketReductionContribution = 0;
            }
        } else {
            this.scope2MarketReductionContribution = 0;
        }
    }


    setScope2LocationReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2LocationReductions = baselineYearDetails.scope2LocationEmissions - this.scope2LocationEmissions;
        } else {
            this.scope2LocationReductions = 0;
        }
    }

    setScope2LocationPercentReductions(baselineYearDetails: BetterClimateYearDetails) {
        if (baselineYearDetails) {
            this.scope2LocationPercentReductions = (this.scope2LocationReductions / baselineYearDetails.scope2LocationEmissions) * 100;
        } else {
            this.scope2LocationPercentReductions = 0;
        }
    }

    setScope2LocationReductionContribution(accountDetails: BetterClimateYearDetails) {
        if (accountDetails) {
            this.scope2LocationReductionContribution = (this.scope2LocationReductions * accountDetails.scope2LocationPercentReductions) / accountDetails.scope2LocationReductions;
            if (isNaN(this.scope2LocationReductionContribution)) {
                this.scope2LocationReductionContribution = 0;
            }
        } else {
            this.scope2LocationReductionContribution = 0;
        }
    }
}