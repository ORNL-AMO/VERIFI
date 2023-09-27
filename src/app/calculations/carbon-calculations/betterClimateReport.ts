import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import * as _ from 'lodash';
import { ConvertValue } from "../conversions/convertValue";
import { setEmissionsForCalanderizedMeters } from "../emissions-calculations/emissions";
import { SubregionEmissions } from "src/app/models/eGridEmissions";

export class BetterClimateReport {

    baselineYear: number;
    reportYear: number;
    yearDetails: Array<BetterClimateYearDetails>;
    constructor(account: IdbAccount, facilities: Array<IdbFacility>, meters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number,
        co2Emissions: Array<SubregionEmissions>, emissionsDisplay: 'market' | 'location') {
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' });
        calanderizedMeters = setEmissionsForCalanderizedMeters(calanderizedMeters, false, facilities, co2Emissions);

        
        this.setYearDetails(calanderizedMeters, facilities, emissionsDisplay);
    }

    setYearDetails(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, emissionsDisplay: 'market' | 'location') {
        this.yearDetails = new Array();
        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let betterClimateYearDetails: BetterClimateYearDetails = new BetterClimateYearDetails(year, calanderizedMeters, facilities, emissionsDisplay);
            this.yearDetails.push(betterClimateYearDetails);
        }
    }

}

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

    totalScope1Emissions: number;
    stationaryEmissions: number;
    mobileEmissions: number;
    fugitiveEmissions: number;
    processEmissions: number;

    scope2MarketEmissions: number;
    scope2LocationEmissions: number;

    totalEmissions: number;

    constructor(year: number, calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, emissionsDisplay: 'market' | 'location') {
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
        this.totalScope1Emissions = this.getEmissionsTotal(calanderizedMeters, year, [1, 2], false);
        this.stationaryEmissions = this.getEmissionsTotal(calanderizedMeters, year, [1], false);
        this.mobileEmissions = this.getEmissionsTotal(calanderizedMeters, year, [2], false);
        //TODO: fugitive and process coming soon
        this.fugitiveEmissions = 0;
        this.processEmissions = 0;


        this.scope2MarketEmissions = this.getEmissionsTotal(calanderizedMeters, year, [3, 4], true);
        this.scope2LocationEmissions = this.getEmissionsTotal(calanderizedMeters, year, [3, 4], false);

        this.setTotalEmissions(emissionsDisplay);
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

    getEmissionsTotal(calanderizedMeters: Array<CalanderizedMeter>, year: number, includedScope: Array<number>, isMarketEmissions: boolean): number{
        let scope1Meters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return includedScope.includes(cMeter.meter.scope)
        });
        let monthlyData: Array<MonthlyData> = scope1Meters.flatMap(eMeter => {
            return eMeter.monthlyData;
        });
        monthlyData = monthlyData.filter(mData => {
            return mData.fiscalYear == year;
        });
        if(isMarketEmissions){
            return _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
                return monthlyData.marketEmissions;
            });
        }else{
            return _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
                return monthlyData.locationEmissions;
            });
        }
    }

    setTotalEmissions(emissionsDisplay: 'market' | 'location'){
        if(emissionsDisplay == 'location'){
            this.totalEmissions = this.totalScope1Emissions + this.scope2LocationEmissions;
        }else{
            this.totalEmissions = this.totalScope1Emissions + this.scope2MarketEmissions;
        }
    }
}