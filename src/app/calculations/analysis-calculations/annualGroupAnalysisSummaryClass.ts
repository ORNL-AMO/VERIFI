import { AnalysisGroup, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { checkAnalysisValue, getLatestCompleteAnalysisYear } from "../shared-calculations/calculationsHelpers";
import { MeterSource } from "src/app/models/constantsAndTypes";
import * as _ from 'lodash';
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { AnalysisCalculationOptions } from "./analysisCalculationOptions";

export class AnnualGroupAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    baselineYear: number;
    reportYear: number;
    utilityClassification: MeterSource | 'Mixed';
    group: AnalysisGroup;
    constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, accountPredictors: Array<IdbPredictor>, accountAnalysisItems: Array<IdbAnalysisItem>, options: AnalysisCalculationOptions = {}) {
        this.group = selectedGroup;
        this.setReportYear(options.reportYear, selectedGroup, calanderizedMeters, accountPredictorEntries, facility);
        if (!this.monthlyAnalysisSummaryData) {
            this.setMonthlyAnalysisSummaryData(selectedGroup, analysisItem, facility, calanderizedMeters, accountPredictorEntries, accountAnalysisItems);
        } else {
            this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryData;
        }
        this.setBaselineYear(analysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, facility, accountPredictors);
    }

    setMonthlyAnalysisSummaryData(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, accountAnalysisItems: Array<IdbAnalysisItem>) {
        let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(
            selectedGroup,
            analysisItem,
            facility,
            calanderizedMeters,
            accountPredictorEntries,
            false,
            accountAnalysisItems,
            { reportYear: this.reportYear }
        );
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getResults().monthlyAnalysisSummaryData;
        this.setUtilityClassification(monthlyAnalysisSummaryClass.monthlyGroupAnalysisClass.groupMeters);
    }

    setBaselineYear(analysisItem: IdbAnalysisItem) {
        this.baselineYear = analysisItem.baselineYear;
    }

    setReportYear(reportYear: number | undefined, selectedGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, predictorData: Array<IdbPredictorData>, facility: IdbFacility) {
        this.reportYear = reportYear ?? getLatestCompleteAnalysisYear([selectedGroup], calanderizedMeters, predictorData, [facility]);
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
            return this.getFormattedResult(summaryDataClass);
        });
    }

    getFormattedResult(summaryDataClass: AnnualAnalysisSummaryDataClass): AnnualAnalysisSummary {
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
            isBanked: summaryDataClass.isBanked,
            isIntermediateBanked: summaryDataClass.isIntermediateBanked,
            savingsUnbanked: checkAnalysisValue(summaryDataClass.savingsUnbanked),
            savingsBanked: checkAnalysisValue(summaryDataClass.savingsBanked),
            missingPredictorValue: summaryDataClass.missingPredictorValue,
            missingPredictors: summaryDataClass.missingPredictors
        }
    }

}
