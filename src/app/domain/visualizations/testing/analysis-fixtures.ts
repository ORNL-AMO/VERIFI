import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
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
