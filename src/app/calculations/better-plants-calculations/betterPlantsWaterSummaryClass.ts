import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { BetterPlantsWaterSummary, WaterSummaryItem } from "src/app/models/overview-report";
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from "src/app/models/idb";
import { WaterIntakeType } from "src/app/models/constantsAndTypes";

export class BetterPlantsWaterSummaryClass {

    numberOfFacilities: number;
    numberOfManufacturingFacilities: number;

    waterUtility: WaterSummaryItem;
    additionalWaterUtility: WaterSummaryItem;

    surfaceFreshwater: WaterSummaryItem;
    additionalSurfaceFreshWater: WaterSummaryItem;

    groundFreshwater: WaterSummaryItem;
    additionalGroundFreshwater: WaterSummaryItem;

    otherFreshwater: WaterSummaryItem;
    additionalOtherFreshwater: WaterSummaryItem;

    salineWaterIntake: WaterSummaryItem;
    additionalSalineWaterIntake: WaterSummaryItem;

    rainwater: WaterSummaryItem;
    additionalRainwater: WaterSummaryItem;

    externallySuppliedRecycled: WaterSummaryItem;
    additionalExternallySuppliedRecycled: WaterSummaryItem;

    totalWaterIntake: number;
    totalWaterIntakeIncludeAdditional: number;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, year: number, facilities: Array<IdbFacility>, selectedAnalysisItem: IdbAccountAnalysisItem, accountAnalysisItems: Array<IdbAnalysisItem>) {
        let splitCalanderizedMeters: {
            analysisCalanderizedMeters: Array<CalanderizedMeter>,
            additionalCalanderizedMeters: Array<CalanderizedMeter>
        } = this.splitCalanderizedMeters(calanderizedMeters, selectedAnalysisItem, accountAnalysisItems)

        this.setWaterUtility(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalWaterUtility(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setSurfaceFreshwater(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalSurfaceFreshwater(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setGroundFreshwater(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalGroundFreshwater(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setOtherFreshwater(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalOtherFreshwater(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setSalineWaterIntake(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalSalineWaterIntake(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setRainwater(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalRainwater(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setExternallySuppliedRecycled(splitCalanderizedMeters.analysisCalanderizedMeters, year);
        this.setAdditionalExternallySuppliedRecycled(splitCalanderizedMeters.additionalCalanderizedMeters, year);

        this.setTotalWater();
        this.setTotalWaterIncludeAdditional();
        //TODO: include non analysis meters?
        this.setNumberOfFacilities(splitCalanderizedMeters.analysisCalanderizedMeters, year, facilities);
    }

    setWaterUtility(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.waterUtility = this.getUtilityResults(calanderizedMeters, year, 'Municipal (Potable)');
    }

    setAdditionalWaterUtility(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalWaterUtility = this.getUtilityResults(calanderizedMeters, year, 'Municipal (Potable)');
    }

    setSurfaceFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.surfaceFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Surface Freshwater');
    }
    setAdditionalSurfaceFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalSurfaceFreshWater = this.getUtilityResults(calanderizedMeters, year, 'Surface Freshwater');
    }

    setGroundFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.groundFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Ground Freshwater');
    }
    setAdditionalGroundFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalGroundFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Ground Freshwater');
    }

    setOtherFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.otherFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Other Freshwater');
    }
    setAdditionalOtherFreshwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalOtherFreshwater = this.getUtilityResults(calanderizedMeters, year, 'Other Freshwater');
    }

    setSalineWaterIntake(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.salineWaterIntake = this.getUtilityResults(calanderizedMeters, year, 'Salt Water');
    }
    setAdditionalSalineWaterIntake(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalSalineWaterIntake = this.getUtilityResults(calanderizedMeters, year, 'Salt Water');
    }

    setRainwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.rainwater = this.getUtilityResults(calanderizedMeters, year, 'Rainwater');
    }
    setAdditionalRainwater(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalRainwater = this.getUtilityResults(calanderizedMeters, year, 'Rainwater');
    }

    setExternallySuppliedRecycled(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.externallySuppliedRecycled = this.getUtilityResults(calanderizedMeters, year, 'Externally Recycled Water');
    }
    setAdditionalExternallySuppliedRecycled(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.additionalExternallySuppliedRecycled = this.getUtilityResults(calanderizedMeters, year, 'Externally Recycled Water');
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

    setTotalWaterIncludeAdditional() {
        this.totalWaterIntakeIncludeAdditional = (
            this.totalWaterIntake +
            this.additionalWaterUtility.use +
            this.additionalSurfaceFreshWater.use +
            this.additionalGroundFreshwater.use +
            this.additionalOtherFreshwater.use +
            this.additionalSalineWaterIntake.use +
            this.additionalRainwater.use +
            this.additionalExternallySuppliedRecycled.use
        )
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
            surfaceFreshwater: this.surfaceFreshwater,
            additionalSurfaceFreshWater: this.additionalSurfaceFreshWater,
            groundFreshwater: this.groundFreshwater,
            additionalGroundFreshwater: this.additionalGroundFreshwater,
            otherFreshwater: this.otherFreshwater,
            additionalOtherFreshwater: this.additionalOtherFreshwater,
            salineWaterIntake: this.salineWaterIntake,
            additionalSalineWaterIntake: this.additionalSalineWaterIntake,
            rainwater: this.rainwater,
            additionalRainwater: this.additionalRainwater,
            externallySuppliedRecycled: this.externallySuppliedRecycled,
            additionalExternallySuppliedRecycled: this.additionalExternallySuppliedRecycled,
            totalWaterIntake: this.totalWaterIntake,
            totalWaterIntakeIncludeAdditional: this.totalWaterIntakeIncludeAdditional,
            numberOfManufacturingFacilities: this.numberOfManufacturingFacilities,
            waterUtility: this.waterUtility,
            additionalWaterUtility: this.additionalWaterUtility
        }
    }

    splitCalanderizedMeters(calanderizedMeters: Array<CalanderizedMeter>, selectedAnalysisItem: IdbAccountAnalysisItem, accountAnalysisItems: Array<IdbAnalysisItem>): {
        analysisCalanderizedMeters: Array<CalanderizedMeter>,
        additionalCalanderizedMeters: Array<CalanderizedMeter>
    } {
        let analysisCalanderizedMeters: Array<CalanderizedMeter> = new Array();
        let additionalCalanderizedMeters: Array<CalanderizedMeter> = new Array();
        selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
                facilityAnalysisItem.groups.forEach(group => {
                    if (group.analysisType != 'skip') {
                        let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
                            return cMeter.meter.groupId == group.idbGroupId;
                        });
                        if (group.analysisType == 'skipAnalysis') {
                            additionalCalanderizedMeters = additionalCalanderizedMeters.concat(filteredMeters);
                        } else {
                            analysisCalanderizedMeters = analysisCalanderizedMeters.concat(filteredMeters);
                        }
                    }
                });
            }
        });

        return {
            additionalCalanderizedMeters: additionalCalanderizedMeters,
            analysisCalanderizedMeters: analysisCalanderizedMeters
        };
    }
}