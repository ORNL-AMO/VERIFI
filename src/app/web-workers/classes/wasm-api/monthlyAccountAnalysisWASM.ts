import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { getAnalysisGroup, getCalanderizedMetersVector, getPredictorEntriesVector, getStartAndEndDate, parseMonthlyData } from "./HelpersWasm";

export class MonthlyAccountAnalysisWASM {
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    constructor(
        wasmModule: any,
        analysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>
    ) {
        let wasmFacilityVector = new wasmModule.FacilityVector();
        let wasmGroupVector = new wasmModule.AnalysisGroupVector();

        analysisItem.facilityAnalysisItems.forEach(facilityItem => {
            if (facilityItem.analysisItemId) {
                let facility: IdbFacility = facilities.find(facility => { return facility.guid == facilityItem.facilityId });
                let wasmFacility = new wasmModule.Facility(facility.guid, facility.fiscalYear, facility.fiscalYearCalendarEnd, facility.fiscalYearMonth)
                wasmFacilityVector.push_back(wasmFacility);
                wasmFacility.delete();
                let analysisItem: IdbAnalysisItem = allAccountAnalysisItems.find(item => { return item.guid == facilityItem.analysisItemId });
                analysisItem.groups.forEach(group => {
                    let wasmGroup = getAnalysisGroup(wasmModule, group, facility.guid);
                    wasmGroupVector.push_back(wasmGroup);
                    wasmGroup.delete();
                });
            }
        })

        let baselineAndEndDate = getStartAndEndDate(wasmModule, account, analysisItem);
        let wasmCMeters = getCalanderizedMetersVector(wasmModule, calanderizedMeters);
        let wasmPredictorEntries = getPredictorEntriesVector(wasmModule, accountPredictorEntries);
        let wasmAccount = new wasmModule.Facility(account.guid, account.fiscalYear, account.fiscalYearCalendarEnd, account.fiscalYearMonth);

        // AnalysisDate baselineDate,
        // AnalysisDate endDate,
        // Facility account
        let monthlyAnalysisSummary = new wasmModule.MonthlyAccountAnalysis(
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            wasmAccount);
        console.log('got to here!!!!')
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmAccount.delete();
        // std::vector<Facility> facilities,
        // std::vector<AnalysisGroup> allAccountGroups,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries,
        let calculatedData = monthlyAnalysisSummary.getMonthlyAnalysisSummaryData(wasmFacilityVector, wasmGroupVector, wasmCMeters, wasmPredictorEntries);
        wasmFacilityVector.delete();
        wasmCMeters.delete();
        wasmPredictorEntries.delete();
        wasmGroupVector.delete();
        this.monthlyAnalysisSummaryData = parseMonthlyData(calculatedData, undefined);
        calculatedData.delete();
        monthlyAnalysisSummary.delete();
    }
}