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
            let wasmGroup = getAnalysisGroup(wasmModule, group);
            wasmGroupVector.push_back(wasmGroup);
            wasmGroup.delete();
        });


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
            wasmGroupVector,
            wasmFacility,
            wasmCMeters,
            wasmPredictorEntries,
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            true);
        wasmGroupVector.delete();
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmFacility.delete();
        wasmCMeters.delete();
        wasmPredictorEntries.delete();

        let calculatedData = annualAnalysisSummary.getAnnualFacilitySummaryData();
        this.annualAnalysisSummary = parseAnnualData(calculatedData);
        // this.annualAnalysisSummary = parseMonthlyData(annualAnalysisSummary, selectedGroup);
        calculatedData.delete();
        annualAnalysisSummary.delete();
    }


}