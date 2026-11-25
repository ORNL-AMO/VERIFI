import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';

export function accountModelingSnapshot(category: 'energy' | 'water' = 'energy') {
  const original = regressionAnalysisReportFixture();
  const snapshot = { ...original, account: { ...original.account, name: 'Portfolio', isSingleFacilityCompany: false },
    facilities: original.facilities.map(item => ({ ...item })), facilityAnalyses: original.facilityAnalyses.map(item => ({ ...item })),
    accountAnalyses: original.accountAnalyses.map(item => ({ ...item })), accountReports: original.accountReports.map(item => ({ ...item })),
    meters: original.meters.map(item => ({ ...item })), meterData: original.meterData.map(item => ({ ...item })),
    predictors: original.predictors.map(item => ({ ...item })), predictorData: original.predictorData.map(item => ({ ...item })),
    meterGroups: original.meterGroups.map(item => ({ ...item })) };
  const analysis = snapshot.facilityAnalyses[0], rollup = snapshot.accountAnalyses[0], meter = snapshot.meters[0];
  Object.assign(analysis, { analysisCategory: category, baselineYear: 2022, energyIsSource: true });
  Object.assign(rollup, { analysisCategory: category, baselineYear: 2022, energyIsSource: true });
  if (category === 'water') Object.assign(meter, { source: 'Water Intake', startingUnit: 'kgal', waterIntakeType: 'Municipal (Potable)' });
  const report = snapshot.accountReports[0];
  Object.assign(report, { reportType: 'analysis', name: 'Portfolio modeling', reportYear: 2023 });
  report.analysisReportSetup.analysisItemId = rollup.guid;
  snapshot.meterGroups = [{ ...getNewIdbUtilityMeterGroup(category === 'water' ? 'Water' : 'Energy', 'Main meters', 'facility', 'account'), guid: 'group' }];
  return snapshot;
}

export function modelingBase(snapshot: AccountWorkspaceSnapshot) {
  const meters = snapshot.facilities.flatMap(facility => getCalanderizedMeterData(
    snapshot.meters.filter(meter => meter.facilityId === facility.guid), [...snapshot.meterData], facility, false,
    { energyIsSource: false, neededUnits: snapshot.facilityAnalyses[0].analysisCategory === 'water' ? 'kgal' : 'MMBtu' },
    [], [], [...snapshot.facilities], snapshot.account.assessmentReportVersion, []));
  return { state: 'ready' as const, accountGuid: snapshot.account.guid, inputFingerprint: 'current', meters };
}

export function addSecondModelingFacility(snapshot: ReturnType<typeof accountModelingSnapshot>): void {
  const facility = { ...snapshot.facilities[0], id: 102, guid: 'facility-b', name: 'Plant B',
    fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
  snapshot.facilities.push(facility);
  const analysis = structuredClone(snapshot.facilityAnalyses[0]);
  Object.assign(analysis, { id: 103, guid: 'analysis-b', facilityId: facility.guid, energyUnit: 'kWh', energyIsSource: false });
  analysis.groups[0].idbGroupId = 'group-b';
  for (const variable of analysis.groups[0].predictorVariables) variable.id += '-b';
  snapshot.facilityAnalyses.push(analysis);
  snapshot.accountAnalyses[0].facilityAnalysisItems.push({ facilityId: facility.guid, analysisItemId: analysis.guid });
  snapshot.meters.push({ ...snapshot.meters[0], id: 105, guid: 'meter-b', facilityId: facility.guid, groupId: 'group-b' });
  snapshot.meterData.push(...snapshot.meterData.map(row => ({ ...row, id: row.id + 1000, guid: row.guid + '-b', facilityId: facility.guid, meterId: 'meter-b' })));
  snapshot.predictors.push(...snapshot.predictors.map(row => ({ ...row, id: row.id + 1000, guid: row.guid + '-b', facilityId: facility.guid })));
  snapshot.predictorData.push(...snapshot.predictorData.map(row => ({ ...row, id: row.id + 1000, guid: row.guid + '-b', facilityId: facility.guid, predictorId: row.predictorId + '-b' })));
  snapshot.meterGroups.push({ ...snapshot.meterGroups[0], id: 104, guid: 'group-b', facilityId: facility.guid });
}
