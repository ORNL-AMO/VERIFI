import { AnalysisGroup, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem, IdbFacility } from "src/app/models/idb";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";
import { MeterSource } from "src/app/models/constantsAndTypes";
import * as _ from 'lodash';
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";

export class AnnualGroupAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    baselineYear: number;
    reportYear: number;
    utilityClassification: MeterSource | 'Mixed';
    constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, accountPredictors: Array<IdbPredictor>) {
        if (!this.monthlyAnalysisSummaryData) {
            this.setMonthlyAnalysisSummaryData(selectedGroup, analysisItem, facility, calanderizedMeters, accountPredictorEntries);
        } else {
            this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryData;
        }
        this.setBaselineYear(analysisItem);
        this.setReportYear(analysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, facility, accountPredictors);
    }

    setMonthlyAnalysisSummaryData(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>) {
        let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(selectedGroup, analysisItem, facility, calanderizedMeters, accountPredictorEntries, false);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
        this.setUtilityClassification(monthlyAnalysisSummaryClass.monthlyGroupAnalysisClass.groupMeters);
    }

    setBaselineYear(analysisItem: IdbAnalysisItem) {
        this.baselineYear = analysisItem.baselineYear;
    }

    setReportYear(analysisItem: IdbAnalysisItem) {
        this.reportYear = analysisItem.reportYear;
    }


    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorData>, facility: IdbFacility, accountPredictors: Array<IdbPredictor>) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(this.monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, facility, this.annualAnalysisSummaryDataClasses, accountPredictors);
            this.annualAnalysisSummaryDataClasses.push(yearAnalysisSummaryDataClass);
            analysisYear++;
        }
    }

    setUtilityClassification(groupMeters: Array<CalanderizedMeter>) {
        let sources: Array<MeterSource> = groupMeters.map(cMeter => {
            return cMeter.meter.source
        });
        sources = _.uniq(sources);
        if (sources.length > 1) {
            this.utilityClassification = 'Mixed';
        } else {
            this.utilityClassification = sources[0];
        }
    }

    getAnnualAnalysisSummaries(): Array<AnnualAnalysisSummary> {
        return this.annualAnalysisSummaryDataClasses.map(summaryDataClass => {
            return {
                year: summaryDataClass.year,
                energyUse: summaryDataClass.energyUse,
                adjusted: summaryDataClass.adjusted,
                baselineAdjustmentForNormalization: checkAnalysisValue(summaryDataClass.baselineAdjustmentForNormalization),
                baselineAdjustmentForOtherV2: checkAnalysisValue(summaryDataClass.baselineAdjustmentForOtherV2),
                baselineAdjustment: checkAnalysisValue(summaryDataClass.baselineAdjustment),
                SEnPI: checkAnalysisValue(summaryDataClass.SEnPI),
                savings: checkAnalysisValue(summaryDataClass.savings),
                totalSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.totalSavingsPercentImprovement) * 100,
                annualSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.annualSavingsPercentImprovement) * 100,
                cummulativeSavings: checkAnalysisValue(summaryDataClass.cummulativeSavings),
                newSavings: checkAnalysisValue(summaryDataClass.newSavings),
                predictorUsage: summaryDataClass.predictorUsage,
            }
        })
    }
}