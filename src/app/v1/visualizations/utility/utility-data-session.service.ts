import { Injectable, Injector, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationRequestIdentity } from '@domain/visualizations/visualization-source-provider';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import type { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import type { Subscription } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { EGridService } from '@shared/helper-services/e-grid.service';
import type { SubregionEmissions } from '@data/models/eGridEmissions';
import type { UtilityVisualizationSource, VisualizationScope } from '@domain/visualizations/visualization-definition';
import { resolveUtilitySelection } from '@domain/visualizations/utility/utility-selection';
import { utilityNeedsGridRates } from '@domain/visualizations/utility/native/emissions-inputs';
import { workspaceEmissionsRates } from '@app/v1/shared/calendarization/workspace-calendarization-request';

export interface UtilityPreviewSnapshot { readonly snapshot: AccountWorkspaceSnapshot; readonly base?: WorkspaceCalendarizationBaseResult; readonly emissionsRates?: readonly SubregionEmissions[] }

/** One shared demand per preview signal, retained until that preview is canceled/destroyed. */
@Injectable()
export class UtilityDataSession {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly grid = inject(EGridService);
  private readonly gridRates$ = toObservable(this.grid.builtinEmissions, { injector: inject(Injector) });
  private readonly requests = new WeakMap<AbortSignal, Promise<UtilityPreviewSnapshot>>();
  private failed = false;
  private cachedBase?: WorkspaceCalendarizationBaseResult;

  requiresGrid(sources: readonly UtilityVisualizationSource[], scope: VisualizationScope): boolean {
    const snapshot = this.workspace.snapshot();
    return !!snapshot && sources.some(source => source.measure.endsWith('emissions')
      && resolveUtilitySelection(snapshot, scope, source).meters.some(meter => {
        const region = snapshot.facilities.find(facility => facility.guid === meter.facilityId)?.eGridSubregion;
        return utilityNeedsGridRates(meter) && !!region && !snapshot.customEmissions.some(item => item.subregion === region);
      }));
  }

  private waitForGrid(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      let subscription: Subscription | undefined, settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true; subscription?.unsubscribe(); signal.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      const abort = () => finish(new DOMException('Preview canceled', 'AbortError'));
      signal.addEventListener('abort', abort, { once: true });
      subscription = this.gridRates$.subscribe({ next: rates => { if (rates !== undefined) finish(); }, error: finish });
      if (settled) subscription.unsubscribe();
      if (signal.aborted) abort();
    });
  }

  isCurrent(identity: Pick<VisualizationRequestIdentity, 'accountGuid' | 'workspaceRevision'>): boolean {
    return this.workspace.isReady() && this.workspace.snapshot()?.account.guid === identity.accountGuid
      && this.workspace.revision() === identity.workspaceRevision;
  }

  acquire(identity: Pick<VisualizationRequestIdentity, 'accountGuid' | 'workspaceRevision'>, signal: AbortSignal, calendarized: boolean, requireGrid = false): Promise<UtilityPreviewSnapshot> {
    const snapshot = this.workspace.snapshot();
    if (signal.aborted || !snapshot || !this.isCurrent(identity))
      return Promise.reject(new Error('The requested account snapshot is no longer current.'));
    const existing = this.requests.get(signal);
    if (existing) return existing;
    if (requireGrid && this.grid.builtinEmissions() === undefined) {
      const pending = this.waitForGrid(signal).then(() => {
        this.requests.delete(signal);
        return this.acquire(identity, signal, calendarized);
      });
      this.requests.set(signal, pending); return pending;
    }
    if (!calendarized) {
      const ready = Promise.resolve({ snapshot, emissionsRates: workspaceEmissionsRates(snapshot, this.grid.builtinEmissions() ?? []) }); this.requests.set(signal, ready); return ready;
    }
    if (!this.failed && this.cachedBase?.accountGuid === identity.accountGuid && this.cachedBase.inputFingerprint === this.calendarization.currentInputFingerprint()) {
      const ready = Promise.resolve({ snapshot, base: this.cachedBase, emissionsRates: this.calendarization.currentEmissionsRates() }); this.requests.set(signal, ready); return ready;
    }
    if (this.failed) { this.failed = false; this.calendarization.retry(); }
    const promise = new Promise<UtilityPreviewSnapshot>((resolve, reject) => {
      let subscription: Subscription | undefined;
      const abort = () => { subscription?.unsubscribe(); reject(new DOMException('Preview canceled', 'AbortError')); };
      signal.addEventListener('abort', abort, { once: true });
      subscription = this.calendarization.calendarizeBase().subscribe({ next: base => {
        if (signal.aborted) return;
        if (this.workspace.snapshot()?.account.guid !== identity.accountGuid || this.workspace.revision() !== identity.workspaceRevision) {
          reject(new Error('The utility preview snapshot changed.')); return;
        }
        if (base.state === 'error') { this.failed = true; reject(new Error(base.error?.message ?? 'Utility calculation failed.')); }
        else if (base.state === 'ready' && base.accountGuid === identity.accountGuid
          && base.inputFingerprint === this.calendarization.currentInputFingerprint()) { this.cachedBase = base; resolve({ snapshot, base, emissionsRates: this.calendarization.currentEmissionsRates() }); }
      }, error: error => { this.failed = true; reject(error); } });
      if (signal.aborted) abort();
    });
    this.requests.set(signal, promise); return promise;
  }
}
