import type { IdbAccount } from '@data/models/idbModels/account';
import type { AccountAnalysisResultsWorkerRequest } from '@platform/web-workers/account-analysis-results-worker.contract';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getNewAnalysisGroup, getNewIdbAnalysisItem, type IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import type { FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import type { AnalysisResultVisualizationSource, VisualizationDefinition } from '../visualization-definition';
import type { VisualizationSourceRequest } from '../visualization-source-provider';
import { equipmentSnapshot } from './equipment-fixtures';
import { createVisualizationDefinition } from '../visualization-definition';

export function analysisFixture() {
  const base = equipmentSnapshot([]), facility = { ...base.facilities[0], fiscalYear: 'calendarYear' as const, fiscalYearMonth: 0 };
  const meterGroup = { ...getNewIdbUtilityMeterGroup('Energy', 'Production', facility.guid, base.account.guid), guid: 'group-a', id: 1 };
  const meter = { ...getNewIdbUtilityMeter(facility.guid, base.account.guid, true, 'MMBtu'), guid: 'meter-a', id: 1, groupId: meterGroup.guid };
  const analysis = { ...getNewIdbAnalysisItem(base.account, facility, [meterGroup], [], 'energy'), guid: 'analysis-a', id: 1, name: 'Production baseline', baselineYear: 2020,
    energyUnit: 'MMBtu', groups: [{ ...getNewAnalysisGroup(meterGroup.guid, []), analysisType: 'absoluteEnergyConsumption' as const }] };
  const monthlyData = [2020, 2021, 2022].flatMap(year => Array.from({ length: year === 2022 ? 3 : 12 }, (_, month) => ({
    date: new Date(year, month, 1), year, monthNumValue: month, fiscalYear: year, energyUse: year === 2020 ? 100 : 80, energyConsumption: year === 2020 ? 100 : 80
  } as MonthlyData)));
  const meters = [{ meter, monthlyData, energyUnit: 'MMBtu', energyIsSource: false } as CalanderizedMeter];
  const snapshot = { ...base, facilities: [facility], meters: [meter], meterGroups: [meterGroup], facilityAnalyses: [analysis] };
  const request: FacilityAnalysisResultsWorkerRequest = { analysisItem: analysis, facility, calanderizedMeters: meters, accountAnalysisItems: [analysis], accountPredictors: [], accountPredictorEntries: [], calculateAllMonthlyData: true, includeGroupSummaries: true };
  return { snapshot, request, meters, analysis, facility };
}
export function analysisDefinition(measure: AnalysisResultVisualizationSource['measure'] = 'actual', groupGuid?: string): VisualizationDefinition {
  const base = createVisualizationDefinition('Analysis results', 'account-a', { kind: 'all' }, 'analysis');
  return { ...base, sources: [{ ...base.sources[0] as AnalysisResultVisualizationSource, analysisGuid: 'analysis-a', ...(groupGuid ? { groupGuid } : {}), measure }],
    chart: { kind: 'time-series', interval: ['annual-improvement', 'total-improvement'].includes(measure) ? 'yearly' : 'monthly', defaultTraceType: 'line', stack: 'none' },
    series: [{ id: 'result', sourceId: 'source-1', metric: measure, resourceGuid: groupGuid ?? 'analysis-a', axis: 'left' }] };
}
export function analysisSourceRequest(definition = analysisDefinition(), workspaceRevision = 1): VisualizationSourceRequest {
  return { identity: { accountGuid: 'account-a', workspaceRevision, definitionGuid: 'visualization-a', definitionRevision: 1, sourceId: definition.sources[0].id,
    requestId: 'test', scope: { kind: 'facility', facilityGuid: 'facility-a', facilityGuids: ['facility-a'] } }, source: definition.sources[0], chart: definition.chart!,
    period: definition.period, comparison: definition.comparison, series: definition.series, dateContext: { calendarDate: '2022-04-15' } };
}

/** Multiple selected facilities plus an explicit skip, with real full-month readings for account Workers. */
export function accountAnalysisFixture() {
  const first = analysisFixture();
  const account: IdbAccount = { ...first.snapshot.account, isSingleFacilityCompany: false, fiscalYear: 'calendarYear' as const, fiscalYearMonth: 0 };
  const facilities = [first.facility, { ...first.facility, guid: 'facility-b', name: 'Second facility', id: 2 }, { ...first.facility, guid: 'facility-c', name: 'Skipped facility', id: 3 }];
  const groups = [first.snapshot.meterGroups[0], { ...first.snapshot.meterGroups[0], guid: 'group-b', facilityId: 'facility-b', id: 2 }];
  const analyses: IdbAnalysisItem[] = [first.analysis, { ...first.analysis, guid: 'analysis-b', facilityId: 'facility-b', id: 2, name: 'Second baseline', groups: [{ ...first.analysis.groups[0], idbGroupId: 'group-b' }] }]
    .map(item => ({ ...item, energyUnit: 'kWh', energyIsSource: false }));
  const meters = groups.map((group, index) => ({ ...first.snapshot.meters[0], id: index + 1, guid: `meter-${index}`, facilityId: group.facilityId, groupId: group.guid,
    startingUnit: 'kWh', energyUnit: 'kWh', meterReadingDataApplication: 'fullMonth' as const }));
  const meterData = meters.flatMap((meter, index) => first.meters[0].monthlyData.map((month, i) => ({
    ...getNewIdbUtilityMeterData(meter, []), id: index * 100 + i + 1, guid: `reading-${index}-${i}`, year: month.year, month: month.monthNumValue + 1, day: 1,
    totalEnergyUse: month.energyUse * (index + 1), totalCost: 0
  })));
  const analysis = { ...getNewIdbAccountAnalysisItem('energy', account, facilities), guid: 'account-analysis', id: 1, name: 'Portfolio baseline', baselineYear: 2020,
    energyUnit: 'kWh', energyIsSource: false, facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'analysis-a' }, { facilityId: 'facility-b', analysisItemId: 'analysis-b' }, { facilityId: 'facility-c', analysisItemId: 'skip' }] };
  const snapshot = { ...first.snapshot, account, facilities, meterGroups: groups, meters, meterData, facilityAnalyses: analyses, accountAnalyses: [analysis] };
  const calendarized = meters.map((meter, index) => ({ ...first.meters[0], meter, energyUnit: 'kWh', monthlyData: first.meters[0].monthlyData.map(month => ({ ...month, energyUse: month.energyUse * (index + 1) })) }));
  const request: AccountAnalysisResultsWorkerRequest = { accountAnalysisItem: analysis, account, accountFacilities: facilities.slice(0, 2), allAccountAnalysisItems: analyses,
    accountPredictorEntries: [], accountPredictors: [], calculateAllMonthlyData: true, meters, meterData };
  return { snapshot, analysis, meters: calendarized, request };
}
export function accountAnalysisDefinition(measure: AnalysisResultVisualizationSource['measure'] = 'actual'): VisualizationDefinition {
  const base = analysisDefinition(measure);
  return { ...base, sources: [{ ...base.sources[0] as AnalysisResultVisualizationSource, analysisGuid: 'account-analysis' }],
    series: [{ ...base.series[0], resourceGuid: 'account-analysis' }] };
}
export function accountAnalysisSourceRequest(definition = accountAnalysisDefinition(), workspaceRevision = 1): VisualizationSourceRequest {
  const base = analysisSourceRequest(definition, workspaceRevision);
  return { ...base, identity: { ...base.identity, scope: { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b', 'facility-c'] } } };
}
