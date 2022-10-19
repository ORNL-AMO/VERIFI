import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { checkValue } from "../helperService";
import { getAnalysisGroup, getCalanderizedMetersVector, getPredictorEntriesVector, getPredictorUsage, getStartAndEndDate, parseMonthlyData } from "./HelpersWasm";

export class MonthlyFacilityAnalysisWASM {
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    constructor(wasmModule: any, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        let wasmGroupVector = new wasmModule.AnalysisGroupVector();
        analysisItem.groups.forEach(group => {
            let wasmGroup = getAnalysisGroup(wasmModule, group, facility.guid);
            wasmGroupVector.push_back(wasmGroup);
            wasmGroup.delete();
        });


        let baselineAndEndDate = getStartAndEndDate(wasmModule, facility, analysisItem);
        let wasmFacility = new wasmModule.Facility(facility.guid, facility.fiscalYear, facility.fiscalYearCalendarEnd, facility.fiscalYearMonth)
        let wasmCMeters = getCalanderizedMetersVector(wasmModule, calanderizedMeters);
        let wasmPredictorEntries = getPredictorEntriesVector(wasmModule, accountPredictorEntries);

        // Facility facility,
        // AnalysisDate baselineDate,
        // AnalysisDate endDate
        let monthlyAnalysisSummary = new wasmModule.MonthlyFacilityAnalysis(
            wasmFacility,
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate);
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmFacility.delete();

        // std::vector<AnalysisGroup> selectedGroups,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries,
        let calculatedData = monthlyAnalysisSummary.getMonthlyFacilityAnalysisData(wasmGroupVector, wasmCMeters, wasmPredictorEntries);
        this.monthlyAnalysisSummaryData = parseMonthlyData(calculatedData, undefined);
        wasmCMeters.delete();
        wasmPredictorEntries.delete();
        wasmGroupVector.delete();
        calculatedData.delete();
        monthlyAnalysisSummary.delete();
    }
}