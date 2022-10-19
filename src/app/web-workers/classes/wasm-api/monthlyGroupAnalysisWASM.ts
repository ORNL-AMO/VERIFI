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
        // AnalysisDate baselineDate,
        // AnalysisDate endDate,
        let monthlyAnalysisSummary = new wasmModule.MonthlyAnalysisSummary(
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,);
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        // AnalysisGroup analysisGroup,
        // Facility facility,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries
        let calculatedData = monthlyAnalysisSummary.getMonthlyAnalysisSummaryData(wasmGroup,
            wasmFacility,
            wasmCMeters,
            wasmPredictorEntries);
        wasmGroup.delete();
        wasmFacility.delete();
        wasmCMeters.delete();
        wasmPredictorEntries.delete();
        this.monthlyAnalysisSummaryData = parseMonthlyData(calculatedData, selectedGroup);
        calculatedData.delete();
        monthlyAnalysisSummary.delete();
    }
}