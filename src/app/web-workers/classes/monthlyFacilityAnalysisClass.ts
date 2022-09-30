import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { HelperService } from "./helperService";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";

export class MonthlyFacilityAnalysisClass {

    groupMonthlySummaries: Array<MonthlyAnalysisSummaryClass>;
    startDate: Date;
    endDate: Date;
    helperService: HelperService;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        this.setGroupSummaries(analysisItem, facility, calanderizedMeters, accountPredictorEntries);
    }

    setGroupSummaries(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        this.groupMonthlySummaries = new Array();
        analysisItem.groups.forEach(group => {
            let monthlySummary: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(group, analysisItem, facility, calanderizedMeters, accountPredictorEntries);
            this.groupMonthlySummaries.push(monthlySummary);
        });
    }
}