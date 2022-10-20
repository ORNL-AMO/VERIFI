import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { getAnalysisGroup, getCalanderizedMetersVector, getPredictorEntriesVector, getStartAndEndDate, parseAnnualData, parseMonthlyData } from "./HelpersWasm";


export class AnnualFacilityAnalysisWASM {

    annualAnalysisSummary: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    constructor(wasmModule: any, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        // let wasmGroup = getAnalysisGroup(wasmModule, selectedGroup);
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

        // AnalysisDate baselineDate,
        // AnalysisDate endDate,
        // Facility facility,
        // bool needed for facility
        let annualAnalysisSummary = new wasmModule.AnnualAnalysisSummary(
            wasmFacility,
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            true);
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmFacility.delete();

        // AnalysisGroup analysisGroup,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries
        let calculatedData = annualAnalysisSummary.getAnnualFacilitySummaryData(wasmGroupVector, wasmCMeters, wasmPredictorEntries);
        wasmCMeters.delete();
        wasmPredictorEntries.delete();
        wasmGroupVector.delete();

        this.annualAnalysisSummary = parseAnnualData(calculatedData.annualAnalysisSummaryData);
        this.monthlyAnalysisSummaryData = parseMonthlyData(calculatedData.monthlyFacilityAnalysisSummaryData, undefined);
        calculatedData.delete();
        annualAnalysisSummary.delete();
    }


}