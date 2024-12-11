import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { AnnualFacilityAnalysisSummaryClass } from "../analysis-calculations/annualFacilityAnalysisSummaryClass";
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { AnalysisGroupItem, getGroupItem } from "src/app/shared/shared-analysis/analysisGroupItem";


export class SEPReport {

    baselineYear: number;
    baselineYearAnnualAnalysis: AnnualAnalysisSummary;
    groupSummaries: Array<{ 
        baselineYearSummary: AnnualAnalysisSummary, 
        reportYearSummary: AnnualAnalysisSummary,
        groupItem: AnalysisGroupItem,
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>
    }>;

    reportYear: number;
    reportYearAnnualAnalysisSummary: AnnualAnalysisSummary;


    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;

    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>, accountAnalysisItems: Array<IdbAnalysisItem>) {
        this.baselineYear = analysisItem.baselineYear;
        this.reportYear = analysisItem.reportYear;
        this.setAnalysisSummaries(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountPredictors, accountAnalysisItems);
    }


    setAnalysisSummaries(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>, accountAnalysisItems: Array<IdbAnalysisItem>) {
        let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountPredictors, accountAnalysisItems, true);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
        this.baselineYearAnnualAnalysis = annualAnalysisSummaries.find(summary => {
            return summary.year == this.baselineYear;
        });
        this.reportYearAnnualAnalysisSummary = annualAnalysisSummaries.find(summary => {
            return summary.year == this.reportYear;
        });
        this.monthlyAnalysisSummaryData = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
        this.groupSummaries = annualAnalysisSummaryClass.groupSummaries.map(summary => {
            return {
                groupItem: getGroupItem(summary.group),
                baselineYearSummary: summary.annualAnalysisSummaryData.find(summary => { return summary.year == this.baselineYear }),
                reportYearSummary: summary.annualAnalysisSummaryData.find(summary => { return summary.year == this.reportYear }),
                monthlyAnalysisSummaryData: summary.monthlyAnalysisSummaryData
            }
        });
    }
}