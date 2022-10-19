import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { getAnalysisGroup, getCalanderizedMetersVector, getPredictorEntriesVector, getStartAndEndDate, parseAnnualData, parseMonthlyData } from "./HelpersWasm";


export class AnnualAccountAnalysisWASM {

    annualAnalysisSummary: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    constructor(wasmModule: any,
        analysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>) {
        // let wasmGroup = getAnalysisGroup(wasmModule, selectedGroup);
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
        let wasmAccount = new wasmModule.Facility(account.guid, account.fiscalYear, account.fiscalYearCalendarEnd, account.fiscalYearMonth)
        let wasmCMeters = getCalanderizedMetersVector(wasmModule, calanderizedMeters);
        let wasmPredictorEntries = getPredictorEntriesVector(wasmModule, accountPredictorEntries);

        // AnalysisDate baselineDate,
        // AnalysisDate endDate,
        // Facility account,
        // bool
        // bool needed for account
        let annualAnalysisSummary = new wasmModule.AnnualAnalysisSummary(
            baselineAndEndDate.baselineDate,
            baselineAndEndDate.endDate,
            wasmAccount,
            true,
            true);
        baselineAndEndDate.endDate.delete();
        baselineAndEndDate.baselineDate.delete();
        wasmAccount.delete();

        // std::vector<Facility> facilities,
        // std::vector<AnalysisGroup> allAccountGroups,
        // std::vector<CalanderizedMeter> calanderizedMeters,
        // std::vector<PredictorEntry> accountPredictorEntries
        let calculatedData = annualAnalysisSummary.getAnnualAccountSummaryData(wasmFacilityVector, wasmGroupVector, wasmCMeters, wasmPredictorEntries);
        wasmCMeters.delete();
        wasmPredictorEntries.delete();
        wasmGroupVector.delete();
        wasmFacilityVector.delete();

        this.annualAnalysisSummary = parseAnnualData(calculatedData);
        // this.annualAnalysisSummary = parseMonthlyData(annualAnalysisSummary, selectedGroup);
        calculatedData.delete();
        annualAnalysisSummary.delete();
    }


}