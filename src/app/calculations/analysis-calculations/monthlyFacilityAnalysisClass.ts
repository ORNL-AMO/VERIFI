import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idb";
import { getFiscalYear, getLastBillEntryFromCalanderizedMeterData } from "../shared-calculations/calanderizationFunctions";
import { checkAnalysisValue, getMonthlyStartAndEndDate } from "../shared-calculations/calculationsHelpers";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyFacilityAnalysisDataClass } from "./monthlyFacilityAnalysisDataClass";
import * as _ from 'lodash';
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";

export class MonthlyFacilityAnalysisClass {

    allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>;
    facilityMonthSummaries: Array<MonthlyFacilityAnalysisDataClass>;
    groupMonthlySummariesClasses: Array<MonthlyAnalysisSummaryClass>;
    startDate: Date;
    endDate: Date;
    facilityPredictorEntries: Array<IdbPredictorData>;
    facilityPredictors: Array<IdbPredictor>;
    baselineYear: number;
    facility: IdbFacility;
    analysisItem: IdbAnalysisItem;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>) {
        this.facility = facility;
        this.analysisItem = analysisItem;
        let calanderizedFacilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid })
        this.setFacilityPredictorEntries(accountPredictorEntries, facility);
        this.setFacilityPredictors(accountPredictors, facility);
        this.setStartAndEndDate(facility, analysisItem, calculateAllMonthlyData, calanderizedFacilityMeters);
        this.setGroupSummaries(analysisItem, facility, calanderizedFacilityMeters, calculateAllMonthlyData);
        this.setBaselineYear(facility);
        this.setFacilityMonthSummaries(facility);
    }

    setStartAndEndDate(facility: IdbFacility, analysisItem: IdbAnalysisItem, calculateAllMonthlyData: boolean, calanderizedMeters: Array<CalanderizedMeter>) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(facility, analysisItem);
        this.startDate = monthlyStartAndEndDate.baselineDate;
        if (calculateAllMonthlyData) {
            let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
            let lastPredictorEntry: IdbPredictorData = _.maxBy(this.facilityPredictorEntries, (data: IdbPredictorData) => { return new Date(data.date) });
            if (lastPredictorEntry && lastBill.date > lastPredictorEntry.date) {
                this.endDate = new Date(lastPredictorEntry.date);
            } else {
                this.endDate = new Date(lastBill.date);
            }
            this.endDate.setMonth(this.endDate.getMonth() + 1);
            this.endDate.setDate(1);
        } else {
            this.endDate = monthlyStartAndEndDate.endDate;
        }
    }

    setGroupSummaries(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, calculateAllMonthlyData: boolean) {
        this.groupMonthlySummariesClasses = new Array();
        analysisItem.groups.forEach(group => {
            if (group.analysisType != 'skip' && group.analysisType != 'skipAnalysis') {
                let monthlySummary: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(group, analysisItem, facility, calanderizedMeters, this.facilityPredictorEntries, calculateAllMonthlyData);
                this.groupMonthlySummariesClasses.push(monthlySummary);
            }
        });
        this.allFacilityAnalysisData = this.groupMonthlySummariesClasses.flatMap(summary => { return summary.monthlyAnalysisSummaryData });
    }

    setFacilityPredictorEntries(accountPredictorEntries: Array<IdbPredictorData>, facility: IdbFacility) {
        this.facilityPredictorEntries = accountPredictorEntries.filter(entry => {
            return entry.facilityId == facility.guid;
        })
    }

    setFacilityPredictors(accountPredictors: Array<IdbPredictor>, facility: IdbFacility){
        this.facilityPredictors = accountPredictors.filter(predictor => {
            return predictor.facilityId == facility.guid;
        })
    }


    setBaselineYear(facility: IdbFacility) {
        this.baselineYear = getFiscalYear(this.startDate, facility);
    }

    setFacilityMonthSummaries(facility: IdbFacility) {
        this.facilityMonthSummaries = new Array();
        let monthDate: Date = new Date(this.startDate);
        while (monthDate < this.endDate) {
            let monthSummary: MonthlyFacilityAnalysisDataClass = new MonthlyFacilityAnalysisDataClass(
                this.allFacilityAnalysisData,
                monthDate,
                this.facilityPredictorEntries,
                facility,
                this.facilityMonthSummaries,
                this.analysisItem.baselineYear,
                this.facilityPredictors
            );
            this.facilityMonthSummaries.push(monthSummary);
            let currentMonth: number = monthDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            monthDate = new Date(monthDate.getUTCFullYear(), nextMonth, 1);
        }
    }

    getMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        return this.facilityMonthSummaries.map(summaryDataItem => {
            return {
                date: summaryDataItem.date,
                energyUse: summaryDataItem.monthlyAnalysisCalculatedValues.energyUse,
                modeledEnergy: undefined,
                adjusted: summaryDataItem.monthlyAnalysisCalculatedValues.adjusted,
                baselineAdjustmentForNormalization: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization),
                baselineAdjustmentForOtherV2: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForOtherV2),
                baselineAdjustment: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustment),
                predictorUsage: summaryDataItem.predictorUsage,
                fiscalYear: summaryDataItem.fiscalYear,
                group: undefined,
                SEnPI: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.SEnPI),
                savings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savings),
                percentSavingsComparedToBaseline: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
                yearToDateSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDateSavings),
                yearToDatePercentSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
                rollingSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rollingSavings),
                rolling12MonthImprovement: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
                dataAdjustment: summaryDataItem.dataAdjustment,
                modelYearDataAdjustment: summaryDataItem.modelYearDataAdjustment,
                baselineAdjustmentInput: summaryDataItem.baselineAdjustmentInput
            }
        })
    }

    convertResults(startingUnit: string, endingUnit: string) {
        for (let i = 0; i < this.facilityMonthSummaries.length; i++) {
            this.facilityMonthSummaries[i].convertResults(startingUnit, endingUnit);
        }
        for (let i = 0; i < this.allFacilityAnalysisData.length; i++) {
            this.allFacilityAnalysisData[i].convertResults(startingUnit, endingUnit);
        }
    }
}