import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { buildAccountEmissionFactorsInputs, calculateEmissionFactors } from '@domain/reports/emission-factors/emission-factors-report';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { AccountEmissionFactorsReportSnapshot } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';

export function accountEmissionFactorsSnapshot() {
  const snapshot = emissionFactorsSnapshot();
  const facilities = [...snapshot.facilities,
    { ...snapshot.facilities[0], id: 12, guid: 'second', name: 'Second facility' },
    { ...snapshot.facilities[0], id: 13, guid: 'empty', name: 'Empty facility' }];
  const meters = [...snapshot.meters, { ...snapshot.meters[1], id: 14, guid: 'second-gas', facilityId: 'second' }];
  const report = { ...getNewIdbAccountReport(snapshot.account, facilities, []), id: 90,
    guid: 'account-report', reportType: 'accountEmissionFactors' as const, name: 'Account factors', startYear: 2022, endYear: 2024 };
  return { ...snapshot, facilities, meters, accountReports: [report] };
}

export function accountEmissionFactorsOutputSnapshot(): AccountEmissionFactorsReportSnapshot {
  const snapshot = accountEmissionFactorsSnapshot(), report = snapshot.accountReports[0];
  return { identity: { scope: 'account', accountGuid: snapshot.account.guid, reportGuid: report.guid },
    name: report.name, accountName: snapshot.account.name, startYear: report.startYear, endYear: report.endYear,
    results: buildAccountEmissionFactorsInputs(snapshot, report, emissionFactorsRates()).map(calculateEmissionFactors) };
}
