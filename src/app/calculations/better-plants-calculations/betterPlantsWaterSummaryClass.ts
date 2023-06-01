import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { WaterIntakeType } from "src/app/models/constantsAndTypes";
import * as _ from 'lodash';
import { BetterPlantsWaterSummary } from "src/app/models/overview-report";

export class BetterPlantsWaterSummaryClass {

    numberOfFacilities: number;
    waterUtilityUse: number;
    surfaceFreshwaterUse: number;
    groundFreshwaterUse: number;
    otherFreshwaterUse: number;
    salineWaterIntake: number;
    rainwater: number;
    externallySuppliedRecycled: number;
    totalWaterIntake: number;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, year: number){
        this.setWaterUtilityUse(calanderizedMeters, year);



        this.setTotalWater();
        this.setNumberOfFacilities(calanderizedMeters, year);
    }

    setWaterUtilityUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Municipal (Potable)'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.waterUtilityUse = _.sumBy(yearData, 'energyConsumption');
    }

    getYearData(filteredMeters: Array<CalanderizedMeter>, year: number): Array<MonthlyData> {
        let meterMonthlyData: Array<MonthlyData> = filteredMeters.flatMap(sourceMeter => {
            return sourceMeter.monthlyData;
        });
        let yearData: Array<MonthlyData> = meterMonthlyData.filter(meter => {
            return meter.fiscalYear == year;
        });
        return yearData;
    }


    setTotalWater() {
        this.totalWaterIntake = (
            this.waterUtilityUse +
            this.surfaceFreshwaterUse +
            this.groundFreshwaterUse +
            this.otherFreshwaterUse +
            this.salineWaterIntake +
            this.rainwater +
            this.externallySuppliedRecycled
        );
    }


    setNumberOfFacilities(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let facilityIds: Array<string> = new Array();
        calanderizedMeters.forEach(cMeter => {
            let yearData: Array<MonthlyData> = cMeter.monthlyData.filter(data => {
                return data.year == year;
            });
            if (yearData.length != 0) {
                facilityIds.push(cMeter.meter.facilityId);
            }
        });
        let uniqFacilityIds: Array<string> = _.uniq(facilityIds);
        this.numberOfFacilities = uniqFacilityIds.length;
    }


    getBetterPlantsWaterSummary(): BetterPlantsWaterSummary {
        return {
            numberOfFacilities: this.numberOfFacilities,
            waterUtilityUse: this.waterUtilityUse,
            surfaceFreshwaterUse: this.surfaceFreshwaterUse,
            groundFreshwaterUse: this.groundFreshwaterUse,
            otherFreshwaterUse: this.otherFreshwaterUse,
            salineWaterIntake: this.salineWaterIntake,
            rainwater: this.rainwater,
            externallySuppliedRecycled: this.externallySuppliedRecycled,
            totalWaterIntake: this.totalWaterIntake
        }
    }
}