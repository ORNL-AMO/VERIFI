import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { getAnalysisGroup, getCalanderizedMetersVector, getPredictorEntriesVector, getStartAndEndDate, parseAnnualData, parseMonthlyData } from "./HelpersWasm";


export class AnnualGroupAnalysisWASM {

    annualAnalysisSummary: Array<AnnualAnalysisSummary>;
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
        let annualAnalysisSummary = new wasmModule.AnnualAnalysisSummary(
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            wasmFacility);
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmFacility.delete();

        let calculatedData = annualAnalysisSummary.getAnnualAnalysisSummaryData(wasmGroup, wasmCMeters, wasmPredictorEntries);
        wasmGroup.delete();
        wasmCMeters.delete();
        wasmPredictorEntries.delete();
        this.annualAnalysisSummary = parseAnnualData(calculatedData.annualAnalysisSummaryData);
        this.monthlyAnalysisSummaryData = parseMonthlyData(calculatedData.monthlyGroupAnalysisSummaryData, selectedGroup);
        calculatedData.annualAnalysisSummaryData.delete();
        calculatedData.monthlyGroupAnalysisSummaryData.delete();
        calculatedData.delete();
        annualAnalysisSummary.delete();
    }


}