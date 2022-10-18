import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { checkValue } from "../helperService";
import { getAnalysisGroup, getCalanderizedMetersVector, getPredictorEntriesVector, getPredictorUsage, getStartAndEndDate, parseMonthlyData } from "./HelpersWasm";

export class MonthlyGroupAnalysisWASM {
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    constructor(wasmModule: any, selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        let wasmGroup = getAnalysisGroup(wasmModule, selectedGroup, facility.guid);
        let baselineAndEndDate = getStartAndEndDate(wasmModule, facility, analysisItem);
        let wasmFacility = new wasmModule.Facility(facility.guid, facility.fiscalYear, facility.fiscalYearCalendarEnd, facility.fiscalYearMonth)
        let wasmCMeters = getCalanderizedMetersVector(wasmModule, calanderizedMeters);
        let wasmPredictorEntries = getPredictorEntriesVector(wasmModule, accountPredictorEntries);
        // AnalysisGroup analysisGroup,
        // AnalysisDate baselineDate,
        // AnalysisDate endDate,
        // Facility facility,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries
        let monthlyAnalysisSummary = new wasmModule.MonthlyAnalysisSummary(
            wasmGroup,
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            wasmFacility,
            wasmCMeters,
            wasmPredictorEntries);
        wasmGroup.delete();
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmFacility.delete();
        wasmCMeters.delete();
        wasmPredictorEntries.delete();

        let calculatedData = monthlyAnalysisSummary.getMonthlyAnalysisSummaryData();
        this.monthlyAnalysisSummaryData = parseMonthlyData(calculatedData, selectedGroup);
        calculatedData.delete();
        monthlyAnalysisSummary.delete();
    }
}