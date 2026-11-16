import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { analysisPeriodIssue, facilityAnalysisCapabilities, facilityAnalysisChartSupport, resolveFacilityAnalysisResults } from '@domain/visualizations/analysis/facility-analysis-source';
import type { VisualizationChart, VisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { AnalysisDataSession } from './analysis-data-session.service';

@Injectable()
export class AnalysisSourceProvider implements VisualizationSourceProvider {
  readonly kind = 'analysis' as const;
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly data = inject(AnalysisDataSession);
  describe() { return facilityAnalysisCapabilities(); }
  supportsChart(source: VisualizationSource, chart: VisualizationChart) { return facilityAnalysisChartSupport(source, chart); }
  async resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution> {
    const support = this.supportsChart(request.source, request.chart), issue = analysisPeriodIssue(request);
    if (support.state === 'unsupported' || issue) return { identity: request.identity, state: 'unsupported', message: issue ?? (support.state === 'unsupported' ? support.reasons.join(' ') : '') };
    const result = await this.data.acquire(request, signal);
    if (signal.aborted || !this.workspace.isReady() || this.workspace.account()?.guid !== request.identity.accountGuid || this.workspace.revision() !== request.identity.workspaceRevision) return { identity: request.identity, state: 'error', message: 'Analysis preview canceled or superseded.' };
    return result.state === 'ready' ? resolveFacilityAnalysisResults(result.value, request) : { ...result, identity: request.identity };
  }
}
