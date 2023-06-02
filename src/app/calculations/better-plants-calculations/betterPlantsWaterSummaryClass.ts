import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { BetterPlantsWaterSummary } from "src/app/models/overview-report";
import { IdbFacility } from "src/app/models/idb";

export class BetterPlantsWaterSummaryClass {

    numberOfFacilities: number;
    numberOfManufacturingFacilities: number;
    waterUtilityUse: number;
    surfaceFreshwaterUse: number;
    groundFreshwaterUse: number;
    otherFreshwaterUse: number;
    salineWaterIntake: number;
    rainwater: number;
    externallySuppliedRecycled: number;
    totalWaterIntake: number;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, year: number, facilities: Array<IdbFacility>) {
        this.setWaterUtilityUse(calanderizedMeters, year);
        this.setSurfaceFreshwaterUse(calanderizedMeters, year);
        this.setGroundFreshwaterUse(calanderizedMeters, year);
        this.setOtherFreshwaterUse(calanderizedMeters, year);
        this.setSalineWaterIntake(calanderizedMeters, year);
        this.setRainwater(calanderizedMeters, year);
        this.setExternallySuppliedRecycled(calanderizedMeters, year);
        this.setTotalWater();
        this.setNumberOfFacilities(calanderizedMeters, year, facilities);
    }

    setWaterUtilityUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Municipal (Potable)'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.waterUtilityUse = _.sumBy(yearData, 'energyConsumption');
    }

    setSurfaceFreshwaterUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Surface Freshwater'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.surfaceFreshwaterUse = _.sumBy(yearData, 'energyConsumption');
    }

    setGroundFreshwaterUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Ground Freshwater'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.groundFreshwaterUse = _.sumBy(yearData, 'energyConsumption');
    }

    setOtherFreshwaterUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Other Freshwater'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.otherFreshwaterUse = _.sumBy(yearData, 'energyConsumption');
    }

    setSalineWaterIntake(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Salt Water'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.salineWaterIntake = _.sumBy(yearData, 'energyConsumption');
    }

    setRainwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Rainwater'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.rainwater = _.sumBy(yearData, 'energyConsumption');
    }

    setExternallySuppliedRecycled(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == 'Externally Recycled Water'
        });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.externallySuppliedRecycled = _.sumBy(yearData, 'energyConsumption');
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


    setNumberOfFacilities(calanderizedMeters: Array<CalanderizedMeter>, year: number, facilities: Array<IdbFacility>) {
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
        this.numberOfManufacturingFacilities = 0;
        uniqFacilityIds.forEach(facilityId => {
            let findFacility: IdbFacility = facilities.find(facility => {
                return facility.guid == facilityId;
            });
            if (findFacility && findFacility.classification == 'Manufacturing') {
                this.numberOfManufacturingFacilities++;
            }
        });
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
            totalWaterIntake: this.totalWaterIntake,
            numberOfManufacturingFacilities: this.numberOfManufacturingFacilities
        }
    }
}