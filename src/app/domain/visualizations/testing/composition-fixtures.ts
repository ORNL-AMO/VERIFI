import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationChart, VisualizationDefinition } from '../visualization-definition';
import type { VisualizationSourceEvidence, VisualizationSourceRequest } from '../visualization-source-provider';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from './equipment-fixtures';
import { equipmentCapabilities, equipmentChartSupport, resolveEquipment } from '../energy-use/equipment-source';
import { resolveVisualizationFacilities } from '../visualization-facilities';

export function compositionFixture(chart: VisualizationChart = { kind: 'treemap', hierarchy: ['group', 'equipment'], values: 'absolute' }) {
  const small = equipmentFixture({ guid: 'small', name: 'Small positive share' }); small.utilityData[0].energyUse[0].energyUse = .01;
  const zero = equipmentFixture({ guid: 'zero', name: 'Zero' }); zero.utilityData[0].energyUse[0].energyUse = 0;
  const missing = equipmentFixture({ guid: 'missing', name: 'Unavailable', utilityData: [] });
  const snapshot = equipmentSnapshot([equipmentFixture(), small, zero, missing]);
  const base = equipmentDefinition(snapshot.energyUseEquipment.map(item => item.guid));
  const definition: VisualizationDefinition = { ...base, name: 'Equipment composition', chart,
    facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] }, period: { kind: 'fiscal-year', year: 2025 } };
  return { snapshot, definition };
}
export function equipmentCompositionEvidence(snapshot: AccountWorkspaceSnapshot, definition: VisualizationDefinition): VisualizationSourceEvidence {
  const source = definition.sources[0]; if (source.kind !== 'energy-use') throw new Error('Expected equipment source.');
  const request: VisualizationSourceRequest = { identity: { accountGuid: definition.accountGuid, workspaceRevision: 1, definitionGuid: 'composition', definitionRevision: 1,
    requestId: 'composition-request', sourceId: source.id, scope: resolveVisualizationFacilities(definition, snapshot.facilities).scope },
    source, chart: definition.chart!, period: definition.period, comparison: definition.comparison, series: definition.series, dateContext: { calendarDate: '2026-11-17' } };
  return { request, capabilities: equipmentCapabilities(), chartSupport: equipmentChartSupport(source, request.chart), resolution: resolveEquipment(snapshot, request) };
}
