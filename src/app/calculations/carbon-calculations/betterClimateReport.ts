import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getCalanderizedMeterData } from "../calanderization/calanderizeMeters";
import * as _ from 'lodash';

export class BetterClimateReport {

    baselineYear: number;
    reportYear: number;
    yearDetails: Array<BetterClimateYearDetails>;
    constructor(account: IdbAccount, facilities: Array<IdbFacility>, meters: Array<IdbUtilityMeter>, meterData: Array<IdbUtilityMeterData>, baselineYear: number, reportYear: number){
        this.baselineYear = baselineYear;
        this.reportYear = reportYear;
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, { energyIsSource: false, neededUnits: undefined });
        this.setYearDetails(calanderizedMeters, facilities);
    }

    setYearDetails(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>){
        this.yearDetails = new Array();
        for(let year = this.baselineYear; year <= this.reportYear; year++){
            let betterClimateYearDetails: BetterClimateYearDetails = new BetterClimateYearDetails(year, calanderizedMeters, facilities);
            this.yearDetails.push(betterClimateYearDetails);
        }
    }

}

export class BetterClimateYearDetails {

    year: number;
    facilityIds: Array<string>;
    totalSquareFeet: number;
    constructor(year: number, calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>){
        this.year = year;
        this.setFacilityIds(calanderizedMeters);
        this.setTotalSquareFeet(facilities);
    }

    setFacilityIds(calanderizedMeters: Array<CalanderizedMeter>){
        this.facilityIds = new Array();
        calanderizedMeters.forEach(cMeter => {
            let findMonthlyEntry: MonthlyData = cMeter.monthlyData.find(data => {
                return data.fiscalYear == this.year;
            });
            if(findMonthlyEntry && this.facilityIds.includes(cMeter.meter.facilityId) == false){
                this.facilityIds.push(cMeter.meter.facilityId);
            }
        })
    }
    
    setTotalSquareFeet(facilities: Array<IdbFacility>){
        this.totalSquareFeet = 0;
        this.facilityIds.forEach(facilityId => {
            let facility: IdbFacility = facilities.find(facility => {return facility.guid == facilityId});
            if(facility && facility.size){
                this.totalSquareFeet += facility.size;
            }
        })
    }
}