import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { BetterPlantsWaterSummary, WaterSummaryItem } from "src/app/models/overview-report";
import { IdbFacility } from "src/app/models/idb";
import { WaterIntakeType } from "src/app/models/constantsAndTypes";

export class BetterPlantsWaterSummaryClass {

    numberOfFacilities: number;
    numberOfManufacturingFacilities: number;
    waterUtility: WaterSummaryItem;
    surfaceFreshwater: WaterSummaryItem;
    groundFreshwater: WaterSummaryItem;
    otherFreshwater: WaterSummaryItem;
    salineWaterIntake: WaterSummaryItem;
    rainwater: WaterSummaryItem;
    externallySuppliedRecycled: WaterSummaryItem;
    totalWaterIntake: number;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, year: number, facilities: Array<IdbFacility>) {
        this.setWaterUtility(calanderizedMeters, year);
        this.setSurfaceFreshwater(calanderizedMeters, year);
        this.setGroundFreshwater(calanderizedMeters, year);
        this.setOtherFreshwater(calanderizedMeters, year);
        this.setSalineWaterIntake(calanderizedMeters, year);
        this.setRainwater(calanderizedMeters, year);
        this.setExternallySuppliedRecycled(calanderizedMeters, year);
        this.setTotalWater();
        this.setNumberOfFacilities(calanderizedMeters, year, facilities);
    }

    setWaterUtility(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.waterUtility = this.getUtilityResults(calanderizedMeters, year, 'Municipal (Potable)');
    }

    setSurfaceFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.surfaceFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Surface Freshwater');
    }
    setGroundFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.groundFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Ground Freshwater');
    }

    setOtherFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.otherFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Other Freshwater');
    }

    setSalineWaterIntake(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.salineWaterIntake = this.getUtilityResults(calanderizedMeters, year, 'Salt Water');
    }

    setRainwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.rainwater = this.getUtilityResults(calanderizedMeters, year, 'Rainwater');
    }

    setExternallySuppliedRecycled(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.externallySuppliedRecycled = this.getUtilityResults(calanderizedMeters, year, 'Externally Recycled Water');
    }

    getUtilityResults(calanderizedMeters: Array<CalanderizedMeter>, year: number, intakeType: WaterIntakeType): WaterSummaryItem {
        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == intakeType
        });
        if (filteredMeters.length > 0) {
            let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
            let use: number = _.sumBy(yearData, 'energyConsumption');
            let readingTypes: Array<"mixed" | "metered" | "estimated"> = yearData.map(data => { return data.readingType });
            let meteredType: 'Metered' | 'Estimated' | 'Mixed';
            readingTypes = _.uniq(readingTypes);
            if (readingTypes.length == 1) {
                if (readingTypes[0] == 'mixed') {
                    meteredType = 'Mixed';
                } else if (readingTypes[0] == 'estimated') {
                    meteredType = 'Estimated';
                } else if (readingTypes[0] == 'metered') {
                    meteredType = 'Metered';
                }
            } else if (readingTypes.length > 1) {
                meteredType = 'Mixed';
            }
            return {
                use: use,
                meteredType: meteredType
            }
        }
        return {
            use: 0,
            meteredType: 'N/A'
        }
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
            this.waterUtility.use +
            this.surfaceFreshwater.use +
            this.groundFreshwater.use +
            this.otherFreshwater.use +
            this.salineWaterIntake.use +
            this.rainwater.use +
            this.externallySuppliedRecycled.use
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
            // waterUtilityUse: this.waterUtilityUse,
            surfaceFreshwater: this.surfaceFreshwater,
            groundFreshwater: this.groundFreshwater,
            otherFreshwater: this.otherFreshwater,
            salineWaterIntake: this.salineWaterIntake,
            rainwater: this.rainwater,
            externallySuppliedRecycled: this.externallySuppliedRecycled,
            totalWaterIntake: this.totalWaterIntake,
            numberOfManufacturingFacilities: this.numberOfManufacturingFacilities,
            waterUtility: this.waterUtility
        }
    }
}