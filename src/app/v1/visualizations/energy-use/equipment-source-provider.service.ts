import { isCompositionChart, compositionPeriodIssue } from '@domain/visualizations/visualization-composition';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { Injectable, Injector, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { EnergyUseVisualizationSource, VisualizationChart, VisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { equipmentCapabilities, equipmentChartSupport, resolveEquipment } from '@domain/visualizations/energy-use/equipment-source';

@Injectable()
export class EquipmentSourceProvider implements VisualizationSourceProvider {
  readonly kind = 'energy-use' as const;
  private readonly injector = inject(Injector);
  private readonly workspace = inject(AccountWorkspaceStore);
  describe() { return equipmentCapabilities(); }
  supportsChart(source: VisualizationSource, chart: VisualizationChart) { return equipmentChartSupport(source as EnergyUseVisualizationSource, chart); }
  async resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution> {
    const snapshot = this.workspace.snapshot();
    if (signal.aborted || !this.workspace.isReady() || !snapshot || snapshot.account.guid !== request.identity.accountGuid || this.workspace.revision() !== request.identity.workspaceRevision)
      return { identity: request.identity, state: 'error', message: 'Equipment preview canceled or superseded.' };
    const source = request.source;
    if (source.kind === 'energy-use' && isCompositionChart(request.chart)) {
      const support = equipmentChartSupport(source, request.chart);
      const issue = compositionPeriodIssue({ sources: [source], period: request.period, comparison: request.comparison });
      if (issue || support.state === 'unsupported') return { identity: request.identity, state: 'unsupported', message: issue ?? (support.state === 'unsupported' ? support.reasons.join(' ') : '') };
    }
    if (source.kind === 'energy-use' && isCompositionChart(request.chart) && (source.denominator === 'metered-consumption' || request.chart.kind === 'sankey' && request.chart.flow === 'energy-balance')) {
      try {
        const data = this.injector.get(UtilityDataSession);
        const { base } = await data.acquire(request.identity, signal, true);
        if (signal.aborted || !data.isCurrent(request.identity)) throw new Error('Energy balance canceled or superseded.');
        const result = this.injector.get(WorkspaceCalendarizationService).project(base!, { context: { kind: 'account', guid: snapshot.account.guid }, energyUnit: snapshot.account.energyUnit, energyIsSource: false, includeEmissions: false });
        if (result.state !== 'ready') throw new Error(result.error?.message ?? 'Metered energy balance is unavailable.');
        return resolveEquipment(snapshot, request, result.meters);
      } catch (error) { return { identity: request.identity, state: 'error', message: error instanceof Error ? error.message : 'Metered energy balance failed.' }; }
    }
    return resolveEquipment(snapshot, request);
  }
}
