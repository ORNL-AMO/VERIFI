import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { PredictorVisualizationSource, VisualizationChart, VisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { predictorCapabilities, predictorChartSupport, resolvePredictor } from '@domain/visualizations/predictor/predictor-source';

@Injectable()
export class PredictorSourceProvider implements VisualizationSourceProvider {
  readonly kind = 'predictor' as const;
  private readonly workspace = inject(AccountWorkspaceStore);
  describe() { return predictorCapabilities(); }
  supportsChart(source: VisualizationSource, chart: VisualizationChart) { return predictorChartSupport(source as PredictorVisualizationSource, chart); }
  async resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution> {
    const snapshot = this.workspace.snapshot();
    if (signal.aborted || !this.workspace.isReady() || !snapshot || snapshot.account.guid !== request.identity.accountGuid || this.workspace.revision() !== request.identity.workspaceRevision)
      return { identity: request.identity, state: 'error', message: 'Predictor preview canceled or superseded.' };
    return resolvePredictor(snapshot, request);
  }
}
