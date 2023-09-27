import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbFacility } from "src/app/models/idb";
import * as _ from 'lodash';

export class BetterClimateFacility {

    facility: IdbFacility;
    scope1Emissions: number;
    scope2LocationEmissions: number;
    scope2MarketEmissions: number;
    constructor(facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, reportYear: number) {
        this.facility = facility;
        let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.facilityId == facility.guid;
        });
        this.setScope1Emissions(facilityCalanderizedMeters, reportYear);
        this.setScope2Emissions(facilityCalanderizedMeters, reportYear);
    }

    setScope1Emissions(facilityCalanderizedMeters: Array<CalanderizedMeter>, reportYear: number) {
        let scope1CalanderizedMeters: Array<CalanderizedMeter> = facilityCalanderizedMeters.filter(cMeter => {
            return cMeter.meter.scope == 1 || cMeter.meter.scope == 2;
        });
        let monthlyData: Array<MonthlyData> = scope1CalanderizedMeters.flatMap(cMeter => {
            return cMeter.monthlyData;
        });
        monthlyData = monthlyData.filter(mData => {
            return mData.fiscalYear == reportYear;
        });
        this.scope1Emissions = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
            return monthlyData.marketEmissions;
        });
    }

    setScope2Emissions(facilityCalanderizedMeters: Array<CalanderizedMeter>, reportYear: number) {
        let scope1CalanderizedMeters: Array<CalanderizedMeter> = facilityCalanderizedMeters.filter(cMeter => {
            return cMeter.meter.scope == 3 || cMeter.meter.scope == 4;
        });
        let monthlyData: Array<MonthlyData> = scope1CalanderizedMeters.flatMap(cMeter => {
            return cMeter.monthlyData;
        });
        monthlyData = monthlyData.filter(mData => {
            return mData.fiscalYear == reportYear;
        });
        this.scope2LocationEmissions = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
            return monthlyData.locationEmissions;
        });

        this.scope2MarketEmissions = _.sumBy(monthlyData, (monthlyData: MonthlyData) => {
            return monthlyData.marketEmissions;
        });
    }
}