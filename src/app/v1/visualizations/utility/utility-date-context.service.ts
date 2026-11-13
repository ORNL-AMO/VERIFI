import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { Injectable, inject } from '@angular/core';
import type { VisualizationDefinition, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { civilDate, validCivil } from '@domain/visualizations/utility/utility-periods';
import type { PreviewDateContextResolver, PreviewIdentity, PreviewDateContext } from '../preview/preview-registry';
import { UtilityDataSession } from './utility-data-session.service';
import { UtilitySourceProvider } from './utility-source-provider.service';

@Injectable()
export class UtilityDateContextResolver implements PreviewDateContextResolver {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly data = inject(UtilityDataSession);
  private readonly provider = inject(UtilitySourceProvider);
  async resolve(definition: VisualizationDefinition, identity: PreviewIdentity, signal: AbortSignal): Promise<PreviewDateContext> {
    const scope = resolveVisualizationFacilities(definition, this.workspace.facilities()).scope;
    const sources = definition.sources.filter((s): s is UtilityVisualizationSource => s.kind === 'utility');
    // Establish shared calculation demand before any native or calendarized provider uses this signal.
    await this.data.acquire(identity, signal, sources.some(s => s.dataMode === 'calendarized'), this.data.requiresGrid(sources, scope));
    const calendarDate = civilDate(new Date());
    let latestDataDate: string | undefined;
    if (definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data') for (const source of sources) {
      // Use the same ownership, allocation, retirement and measure-quality gates as the preview.
      const result = await this.provider.resolve({ identity: { ...identity, scope, sourceId: source.id, requestId: 'date-context' }, source,
        chart: { kind: 'time-series', type: 'line', interval: source.dataMode === 'calendarized' ? 'monthly' : 'native', stack: 'none' },
        period: { kind: 'all-history' }, comparison: { kind: 'none' }, series: definition.series, dateContext: { calendarDate } }, signal);
      if (signal.aborted || !this.data.isCurrent(identity)) throw new DOMException('Date context superseded', 'AbortError');
      if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') continue;
      for (const row of result.resolved.data.rows) if (validCivil(row.end) && Object.values(row.values).some(value => value.state === 'observed')
        && (!latestDataDate || row.end > latestDataDate)) latestDataDate = row.end;
    }
    return { calendarDate, ...(latestDataDate ? { latestDataDate } : {}) };
  }
}
