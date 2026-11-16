import { Injectable, inject } from '@angular/core';
import type { UtilityVisualizationSource, VisualizationSource, VisualizationChart } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { resolveNativeUtility } from '@domain/visualizations/utility/utility-native';
import { resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { resolveUtilitySelection } from '@domain/visualizations/utility/utility-selection';
import { utilityCapabilities, utilityChartSupport } from '@domain/visualizations/utility/utility-capabilities';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import { UtilityDataSession } from './utility-data-session.service';

@Injectable()
export class UtilitySourceProvider implements VisualizationSourceProvider {
  readonly kind = 'utility' as const;
  private readonly data = inject(UtilityDataSession);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  describe(source: VisualizationSource) { return utilityCapabilities(source as UtilityVisualizationSource); }
  supportsChart(source: VisualizationSource, chart: VisualizationChart) { return utilityChartSupport(source as UtilityVisualizationSource, chart); }
  async resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution> {
    if (request.source.kind !== 'utility') return { identity: request.identity, state: 'unsupported', message: 'Choose a utility source.' };
    try {
      const source = request.source;
      const { snapshot, base, emissionsRates } = await this.data.acquire(request.identity, signal, source.dataMode === 'calendarized', this.data.requiresGrid([source], request.identity.scope));
      if (signal.aborted || !this.data.isCurrent(request.identity)) throw new DOMException('Preview canceled or superseded', 'AbortError');
      if (source.dataMode === 'billing-period') return resolveNativeUtility(snapshot, request, emissionsRates);
      const selection = resolveUtilitySelection(snapshot, request.identity.scope, source);
      if (selection.missing.length) return { identity: request.identity, state: 'missing-source', references: selection.missing, message: 'Repair the selected utility source references.' };
      const pinnedUnit = source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : undefined;
      const result = this.calendarization.project(base!, {
        context: request.identity.scope.kind === 'facility' ? { kind: 'facility', guid: request.identity.scope.facilityGuid } : { kind: 'account', guid: snapshot.account.guid },
        meterGuids: selection.meters.map(m => m.guid),
        ...(pinnedUnit && getIsEnergyUnit(pinnedUnit) && ['energy', 'consumption'].includes(source.measure) ? { energyUnit: pinnedUnit } : {}),
        ...(source.settings?.energyTreatment?.kind === 'pinned' ? { energyIsSource: source.settings.energyTreatment.value === 'source' } : {}),
        includeEmissions: source.measure.endsWith('emissions')
      });
      if (result.state === 'error') return { identity: request.identity, state: 'unsupported', message: result.error?.message ?? 'The selected projection is unavailable.' };
      return resolveCalendarizedUtility(snapshot, request, result.meters, { includeEmissions: result.projection?.includeEmissions === true, emissionsRates });
    } catch (error) {
      return { identity: request.identity, state: 'error', message: error instanceof Error ? error.message : 'The utility chart could not be prepared.' };
    }
  }
}
