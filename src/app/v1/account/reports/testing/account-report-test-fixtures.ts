import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbAccountReport, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { reportAccount, reportFacility, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';

export function accountReportSnapshot(single = false) {
  const account = { ...reportAccount, id: 1, isSingleFacilityCompany: single, energyUnit: 'MMBtu', volumeLiquidUnit: 'kgal', energyIsSource: true,
    sustainabilityQuestions: { energyReductionBaselineYear: 2018, waterReductionBaselineYear: 2019 } as typeof reportAccount.sustainabilityQuestions };
  const facility = { ...reportFacility, id: 2 };
  const analysis = { id: 20, guid: 'facility-analysis', accountId: account.guid, facilityId: facility.guid, name: 'Energy analysis',
    baselineYear: 2018, analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'kgal', hasBanking: false,
    groups: [], modifiedDate: new Date(2024, 0, 1) } as IdbAnalysisItem;
  const pair = { id: 30, guid: 'account-analysis', accountId: account.guid, name: analysis.name, analysisCategory: 'energy', energyIsSource: true,
    energyUnit: 'MMBtu', waterUnit: 'kgal', baselineYear: 2018, facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: analysis.guid }],
    facilityItemsInitialized: true, hasBanking: false, isAnalysisVisited: false } as IdbAccountAnalysisItem;
  const report: IdbAccountReport = { ...getNewIdbAccountReport(account, [facility], []), id: 40, guid: 'account-report', name: 'Saved account report', reportType: 'analysis', reportYear: 2024 };
  report.analysisReportSetup.analysisItemId = pair.guid;
  return { ...reportSnapshot(), account, facilities: [facility], accountReports: [report], facilityAnalyses: [analysis], accountAnalyses: [pair] };
}
