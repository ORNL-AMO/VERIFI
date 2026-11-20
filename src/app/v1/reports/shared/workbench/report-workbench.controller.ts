import { ComponentRef, DestroyRef, EnvironmentInjector, Injectable, computed, createEnvironmentInjector, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { REPORT_HOST, REPORT_RUNTIME, REPORT_SESSION_IDENTITY, ReportFeatureDefinition, ReportHostPresentation, ReportRuntime, reportIdentityKey } from './report-runtime.models';
import { ReportStageStateService } from './report-stage-state.service';

export interface ReportSession {
  readonly key: string;
  readonly definition: ReportFeatureDefinition;
  readonly injector: EnvironmentInjector;
  readonly runtime: ReportRuntime;
  mountedStage?: ComponentRef<unknown>;
}

/** Owns one feature lifetime; routed stages only replace its presentation. */
@Injectable()
export class ReportWorkbenchController {
  readonly host = inject(REPORT_HOST);
  private readonly environment = inject(EnvironmentInjector);
  private readonly router = inject(Router);
  private readonly published = inject(ReportStageStateService);
  private readonly active = signal<ReportSession | undefined>(undefined);
  private readonly deletionHold = signal<{ session: ReportSession; presentation: ReportHostPresentation } | undefined>(undefined);
  readonly presentation = computed(() => this.deletionHold()?.presentation ?? this.host.presentation());
  readonly state = computed(() => this.deletionHold() ? 'ready' : this.host.state());
  readonly session = computed(() => {
    const identity = this.host.identity(), session = this.active();
    if (identity) return session?.key === reportIdentityKey(identity) ? session : undefined;
    return this.deletionHold()?.session === session ? session : undefined;
  });
  readonly workflow = computed(() => this.session()?.runtime.checks?.workflow());
  readonly stages = computed(() => {
    const runtime = this.session()?.runtime, checks = this.workflow();
    return this.host.stages().map(stage => ({ ...stage,
      ...(runtime?.gateSetup ? {
        canOpen: stage.id === 'setup' || runtime.editor.setupValid(),
        ...(stage.id === 'setup' ? { completed: runtime.editor.setupValid(), hasBlockingErrors: !runtime.editor.setupValid() } : {})
      } : {}),
      ...(stage.id === 'data-checks' && checks ? { completed: checks.completed, hasBlockingErrors: checks.blocked } : {})
    }));
  });
  readonly previous = computed(() => { const stages = this.stages(); return stages[stages.findIndex(stage => stage.current) - 1]; });
  readonly next = computed(() => { const stages = this.stages(); return stages[stages.findIndex(stage => stage.current) + 1]; });
  readonly canContinue = computed(() => !!this.next()?.canOpen
    && (this.host.stage() !== 'data-checks' || !this.workflow() || this.workflow()!.completed));

  constructor() {
    effect(() => {
      const identity = this.host.identity(), type = this.host.type(), hold = this.deletionHold();
      untracked(() => {
        const key = identity && reportIdentityKey(identity);
        if (!identity && hold) return;
        if (key === this.active()?.key) return;
        this.dispose();
        if (!identity || !key) return;
        const definition = this.host.definitions.find(item => item.type === type) ?? this.host.fallback;
        const injector = createEnvironmentInjector([
          { provide: REPORT_SESSION_IDENTITY, useValue: Object.freeze({ ...identity }) },
          { provide: REPORT_HOST, useValue: this.host },
          ...this.host.providers(identity), ...definition.providers
        ], this.environment);
        try { this.active.set({ key, definition, injector, runtime: injector.get(REPORT_RUNTIME) }); }
        catch (error) { injector.destroy(); throw error; }
      });
    });
    effect(() => {
      const session = this.session(), stages = this.stages();
      if (session) this.published.publish(session.key, stages);
    });
    effect(() => {
      const identity = this.host.identity(), stage = this.host.stage(), stages = this.host.stages();
      if (identity && stage === 'data-checks' && !stages.some(item => item.id === stage)) {
        const link = this.host.reportLink(identity.reportGuid, 'setup');
        void this.router.navigate([...link.route], { queryParams: link.queryParams, replaceUrl: true });
      }
    });
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  flush(): Promise<boolean> { return this.session()?.runtime.editor.flush() ?? Promise.resolve(true); }
  /** Keep the routed Setup and portal owner alive through removal and navigation retry. */
  retainForDeletion(): () => void {
    const session = this.session(), presentation = this.host.presentation();
    if (!session || !presentation) throw new Error('The report editor is no longer available.');
    const hold = { session, presentation };
    this.deletionHold.set(hold);
    return () => { if (this.deletionHold() === hold) this.deletionHold.set(undefined); };
  }
  confirmReview(): Promise<void> { return this.session()?.runtime.checks?.confirmReview() ?? Promise.resolve(); }
  switchReport(guid: string): void {
    const link = this.host.reportLink(guid);
    void this.router.navigate([...link.route], { queryParams: link.queryParams });
  }
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.session()?.runtime.editor.needsProtection()) { event.preventDefault(); event.returnValue = ''; }
  }
  private dispose(): void {
    const session = this.active();
    if (!session) return;
    this.deletionHold.set(undefined);
    session.mountedStage?.destroy(); session.mountedStage = undefined;
    session.injector.destroy();
    this.published.clear(session.key);
    this.active.set(undefined);
  }
}
