import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { EnergyUseVisualizationSource, VisualizationChart, VisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { equipmentCapabilities, equipmentChartSupport, resolveEquipment } from '@domain/visualizations/energy-use/equipment-source';

@Injectable()
export class EquipmentSourceProvider implements VisualizationSourceProvider {
  readonly kind = 'energy-use' as const;
  private readonly workspace = inject(AccountWorkspaceStore);
  describe() { return equipmentCapabilities(); }
  supportsChart(source: VisualizationSource, chart: VisualizationChart) { return equipmentChartSupport(source as EnergyUseVisualizationSource, chart); }
  async resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution> {
    const snapshot = this.workspace.snapshot();
    if (signal.aborted || !this.workspace.isReady() || !snapshot || snapshot.account.guid !== request.identity.accountGuid || this.workspace.revision() !== request.identity.workspaceRevision)
      return { identity: request.identity, state: 'error', message: 'Equipment preview canceled or superseded.' };
    return resolveEquipment(snapshot, request);
  }
}
