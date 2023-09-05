import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import * as _ from 'lodash';
import { ConvertValue } from "../conversions/convertValue";

export class BetterClimateReport {

    baselineYear: number;
    reportYear: number;
    yearDetails: Array<BetterClimateYearDetails>;
    constructor(account: IdbAccount, facilities: Array<IdbFacility>, meters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number) {
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: 'MMBtu' });
        this.setYearDetails(calanderizedMeters, facilities);
    }

    setYearDetails(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>) {
        this.yearDetails = new Array();
        for (let year = this.baselineYear; year <= this.reportYear; year++) {
            let betterClimateYearDetails: BetterClimateYearDetails = new BetterClimateYearDetails(year, calanderizedMeters, facilities);
            this.yearDetails.push(betterClimateYearDetails);
        }
    }

}

export class BetterClimateYearDetails {

    year: number;
    facilityIds: Array<string>;
    totalSquareFeet: number;
    totalElectricity: number;
    fuelTotals: Array<{fuelType: string, total: number}>;
    totalEnergyUse: number;
    constructor(year: number, calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>) {
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

        //fuel
        let fuelTypes: Array<string> = this.getFuelTypes(calanderizedMeters);
        this.setFuelTotals(fuelTypes, calanderizedMeters);
        this.setTotalEnergyUse();
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

    setFuelTotals(meterTypes: Array<string>, calanderizedMeters: Array<CalanderizedMeter>){
        this.fuelTotals = new Array();
        meterTypes.forEach(type => {
            let typeCalanderizedMeters: Array<CalanderizedMeter>;
            if(type == 'Natural Gas'){
                typeCalanderizedMeters = calanderizedMeters.filter(cMeter => {
                    return cMeter.meter.source == 'Natural Gas';
                });
            }else{
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

    setTotalEnergyUse(){
        let convertedElectricityUse: number = new ConvertValue(this.totalElectricity, 'MWh', 'MMBtu').convertedValue;
        let totalFuelUsage: number = _.sumBy(this.fuelTotals, 'total');
        this.totalEnergyUse = convertedElectricityUse + totalFuelUsage;
    }
}