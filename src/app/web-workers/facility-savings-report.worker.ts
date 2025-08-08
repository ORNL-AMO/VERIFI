/// <reference lib="webworker" />

import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { AnnualFacilityAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass";
import { CalanderizedMeter } from "../models/calanderization";
import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { getNeededUnits } from "../calculations/shared-calculations/calanderizationFunctions";
import { FacilitySavingsReport } from "../calculations/savings-report-calculations/facilitySavingsReport";

addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) }, [], [], [data.facility], data.assessmentReportVersion);
        let annualAnalysisSummaryClass: FacilitySavingsReport = new FacilitySavingsReport(data.analysisItem, data.facility, calanderizedMeters, data.accountPredictorEntries, data.accountPredictors, data.report);

        postMessage({
            annualAnalysisSummaries: annualAnalysisSummaryClass.annualAnalysisSummaries,
            monthlyAnalysisSummaryData: annualAnalysisSummaryClass.monthlyAnalysisSummaryData,
            groupSummaries: annualAnalysisSummaryClass.groupSummaries
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            annualAnalysisSummaries: undefined,
            monthlyAnalysisSummaryData: undefined,
            groupSummaries: undefined
        });
    }
});
