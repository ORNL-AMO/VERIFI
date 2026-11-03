import { ApplicationRef, Component, DestroyRef, Injectable, InjectionToken, NgModule, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject } from 'rxjs';
import { flushPendingChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ReportAutosaveController } from '../editing/report-autosave-controller';
import { ReportIdentity } from '../report.models';
import { REPORT_HOST, REPORT_RUNTIME, REPORT_SESSION_IDENTITY, ReportEditor, ReportFeatureDefinition, ReportHostAdapter, ReportRuntime } from './report-runtime.models';
import { buildReportStages, ReportStageId } from './report-workbench.models';
import { ReportWorkbenchController } from './report-workbench.controller';
import { ReportStageStateService } from './report-stage-state.service';
import { ReportsSharedModule } from '../reports-shared.module';

interface SessionProbe {
  readonly feature: string;
  readonly guid: string;
  readonly editor: TestReportEditor;
  readonly runtime: TestReportRuntime;
  readonly worker: Subject<string>;
}
interface WorkbenchProbes {
  readonly editors: Record<string, number>;
  readonly sessions: SessionProbe[];
  readonly events: string[];
}
const PROBES = new InjectionToken<WorkbenchProbes>('Workbench test probes');
const FEATURE = new InjectionToken<string>('Test report feature');
const DEFINITIONS = new InjectionToken<readonly ReportFeatureDefinition[]>('Test report definitions');

/** Uses real scheduling and unsaved registration with only a name as the durable draft. */
@Injectable()
class TestReportEditor implements ReportEditor {
  readonly name = new FormControl('', { nonNullable: true });
  private readonly identity = inject(REPORT_SESSION_IDENTITY);
  private readonly saved = signal({ name: this.identity.reportGuid });
  readonly autosave = new ReportAutosaveController({
    key: signal(this.identity.reportGuid), saved: this.saved, canWrite: signal(true), hasPending: signal(false),
    changes: this.name.valueChanges,
    read: () => ({ name: this.name.value }), normalize: value => ({ name: value.name.trim() }), valid: value => !!value.name.trim(),
    hydrate: value => this.name.setValue(value?.name ?? '', { emitEvent: false }),
    setEnabled: enabled => enabled ? this.name.enable({ emitEvent: false }) : this.name.disable({ emitEvent: false }),
    persist: async value => { this.saved.set(value); return value; }
  });
  readonly state = this.autosave.state;
  readonly error = this.autosave.error;
  readonly saving = this.autosave.saving;
  readonly isDirty = this.autosave.isDirty;
  readonly needsProtection = this.autosave.needsProtection;
  readonly canEdit = this.autosave.canEdit;
  readonly setupValid = computed(() => !!this.saved().name.trim());
  alive = true;

  constructor() {
    const feature = inject(FEATURE), probes = inject(PROBES), guid = this.identity.reportGuid;
    probes.editors[feature] = (probes.editors[feature] ?? 0) + 1;
    inject(DestroyRef).onDestroy(() => { this.alive = false; probes.events.push(`editor:${guid}:destroy`); });
  }
  flush(): Promise<boolean> { return this.autosave.flush(); }
  retry(): void { this.autosave.retry(); }
  discard(): void { this.autosave.discard(); }
  pauseAutosave(): void { this.autosave.pauseAutosave(); }
  resumeAutosave(): void { this.autosave.resumeAutosave(); }
}

@Injectable()
class TestReportRuntime implements ReportRuntime {
  readonly editor = inject(TestReportEditor);
  readonly gateSetup = true;
  readonly showOutputActions = true;
  readonly result = signal('loading');

  constructor() {
    const guid = inject(REPORT_SESSION_IDENTITY).reportGuid, feature = inject(FEATURE), probes = inject(PROBES);
    const worker = new Subject<string>();
    const subscription = new Observable<string>(subscriber => {
      const pending = worker.subscribe(subscriber);
      return () => { pending.unsubscribe(); probes.events.push(`worker:${guid}:stop`); };
    }).subscribe(value => this.result.set(value));
    probes.sessions.push({ feature, guid, editor: this.editor, runtime: this, worker });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}

@Component({ standalone: false, template: '<p data-stage="setup">{{ identity.reportGuid }}:{{ feature }}:{{ runtime.result() }}</p>' })
class TestSetupStage {
  readonly identity = inject(REPORT_SESSION_IDENTITY);
  readonly feature = inject(FEATURE);
  readonly runtime = inject(TestReportRuntime);
  constructor() {
    const probes = inject(PROBES);
    inject(DestroyRef).onDestroy(() => probes.events.push(`stage:setup:${this.identity.reportGuid}:${this.runtime.editor.alive ? 'alive' : 'destroyed'}`));
  }
}

@Component({ standalone: false, template: '<p data-stage="report">{{ identity.reportGuid }}:{{ feature }}:{{ runtime.result() }}</p>' })
class TestReportStage {
  readonly identity = inject(REPORT_SESSION_IDENTITY);
  readonly feature = inject(FEATURE);
  readonly runtime = inject(TestReportRuntime);
  constructor() {
    const probes = inject(PROBES);
    inject(DestroyRef).onDestroy(() => probes.events.push(`stage:report:${this.identity.reportGuid}:${this.runtime.editor.alive ? 'alive' : 'destroyed'}`));
  }
}

function reportHost(): ReportHostAdapter {
  const route = inject(ActivatedRoute), definitions = inject(DEFINITIONS);
  const params = toSignal(route.paramMap, { initialValue: route.snapshot.paramMap });
  const identity = computed<ReportIdentity>(() => ({ scope: 'account', accountGuid: 'account', reportGuid: params().get('reportGuid')! }));
  const stage = computed(() => params().get('stage') as ReportStageId);
  return {
    identity, stage, stages: computed(() => buildReportStages(['reports', params().get('type')!, identity().reportGuid], 'Test', stage(), true, 'ready')),
    presentation: signal(undefined), state: signal<'ready'>('ready'), error: signal(undefined), returnLink: signal({ route: ['/outside'] }),
    definitions, fallback: definitions[0], type: () => params().get('type') ?? undefined, providers: () => [],
    reportLink: (guid, next = 'setup') => ({ route: ['/reports', params().get('type')!, guid, next] })
  };
}

@Component({ standalone: false, template: '<app-report-stage-outlet/>',
  providers: [{ provide: REPORT_HOST, useFactory: reportHost }, ReportWorkbenchController] })
class TestWorkbench {
  readonly workbench = inject(ReportWorkbenchController);
}

@Component({ standalone: false, template: 'Outside reports' })
class TestOutside { }

@NgModule({ declarations: [TestWorkbench, TestOutside, TestSetupStage, TestReportStage], imports: [ReportsSharedModule] })
class ReportWorkbenchTestModule { }

const leaveGuard: CanDeactivateFn<TestWorkbench> = component => component.workbench.flush();

describe('report feature session and stage outlet', () => {
  let probes: WorkbenchProbes;
  let harness: RouterTestingHarness;
  let activeRegistrations: number;

  beforeEach(async () => {
    probes = { editors: {}, sessions: [], events: [] };
    const definitions: readonly ReportFeatureDefinition[] = ['first', 'second'].map(type => ({
      type, providers: [{ provide: FEATURE, useValue: type }, TestReportEditor, TestReportRuntime,
        { provide: REPORT_RUNTIME, useExisting: TestReportRuntime }],
      stages: { setup: TestSetupStage, report: TestReportStage }
    }));
    await TestBed.configureTestingModule({
      imports: [ReportWorkbenchTestModule],
      providers: [{ provide: PROBES, useValue: probes }, { provide: DEFINITIONS, useValue: definitions }, provideRouter([
        { path: 'reports/:type/:reportGuid/:stage', component: TestWorkbench, canActivate: [flushPendingChangesGuard],
          canDeactivate: [leaveGuard], runGuardsAndResolvers: 'always' },
        { path: 'outside', component: TestOutside }
      ])]
    }).compileComponents();
    activeRegistrations = 0;
    const unsaved = TestBed.inject(UnsavedChangesService), register = unsaved.register.bind(unsaved);
    vi.spyOn(unsaved, 'register').mockImplementation((...args) => {
      const unregister = register(...args);
      activeRegistrations++;
      return () => { activeRegistrations--; unregister(); };
    });
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); });

  async function open(url = '/reports/first/report-a/setup'): Promise<TestWorkbench> {
    const page = await harness.navigateByUrl(url, TestWorkbench);
    TestBed.tick(); await TestBed.inject(ApplicationRef).whenStable(); harness.detectChanges();
    return page;
  }

  it('constructs only the selected feature providers and injects the session into its stage', async () => {
    const page = await open();
    expect(probes.editors).toEqual({ first: 1 });
    expect(activeRegistrations).toBe(1);
    expect(probes.sessions).toHaveLength(1);
    expect(harness.routeNativeElement?.querySelector('[data-stage="setup"]')?.textContent).toBe('report-a:first:loading');
    expect(Object.isFrozen(page.workbench.session()!.injector.get(REPORT_SESSION_IDENTITY))).toBe(true);
    await open('/reports/second/report-b/setup');
    expect(probes.editors).toEqual({ first: 1, second: 1 });
    expect(activeRegistrations).toBe(1);
    expect(harness.routeNativeElement?.querySelector('[data-stage="setup"]')?.textContent).toBe('report-b:second:loading');
  });

  it('keeps one editor and calculation session while replacing routed stages', async () => {
    const page = await open(), session = page.workbench.session()!, runtime = probes.sessions[0];
    runtime.worker.next('current results');
    const returned = await open('/reports/first/report-a/report');
    expect(returned).toBe(page);
    expect(page.workbench.session()).toBe(session);
    expect(probes.editors).toEqual({ first: 1 });
    expect(activeRegistrations).toBe(1);
    expect(runtime.worker.observed).toBe(true);
    expect(probes.events).toContain('stage:setup:report-a:alive');
    expect(probes.events).not.toContain('worker:report-a:stop');
    expect(harness.routeNativeElement?.querySelector('[data-stage="report"]')?.textContent).toBe('report-a:first:current results');
  });

  it('destroys the old stage before its injector on a same-type GUID switch and rejects old calculation emissions', async () => {
    const page = await open(), previous = page.workbench.session()!, old = probes.sessions[0];
    old.worker.next('old results');
    await open('/reports/first/report-b/setup');
    expect(page.workbench.session()).not.toBe(previous);
    expect(probes.editors).toEqual({ first: 2 });
    expect(old.editor.alive).toBe(false);
    expect(old.worker.observed).toBe(false);
    expect(activeRegistrations).toBe(1);
    const stageDestroyed = probes.events.indexOf('stage:setup:report-a:alive');
    expect(stageDestroyed).toBeGreaterThanOrEqual(0);
    expect(stageDestroyed).toBeLessThan(probes.events.indexOf('editor:report-a:destroy'));
    expect(stageDestroyed).toBeLessThan(probes.events.indexOf('worker:report-a:stop'));
    old.worker.next('late results');
    harness.detectChanges();
    expect(probes.sessions[1].runtime.result()).toBe('loading');
    expect(harness.routeNativeElement?.querySelector('[data-stage="setup"]')?.textContent).toBe('report-b:first:loading');
    expect(TestBed.inject(ReportStageStateService).current()?.key).toBe(page.workbench.session()!.key);
  });

  it('retains the current feature and mounted stage when the real flush guard rejects an invalid draft', async () => {
    const page = await open(), previous = page.workbench.session()!, active = probes.sessions[0];
    active.editor.name.setValue('');
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    await harness.navigateByUrl('/reports/first/report-b/setup');
    TestBed.tick(); harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/reports/first/report-a/setup');
    expect(page.workbench.session()).toBe(previous);
    expect(active.editor.name.value).toBe('');
    expect(active.worker.observed).toBe(true);
    expect(probes.sessions).toHaveLength(1);
    expect(activeRegistrations).toBe(1);
    expect(probes.events).toEqual([]);
  });

  it('cleans up the mounted feature on exit and creates a fresh session when reopened', async () => {
    const page = await open(), previous = page.workbench.session()!, old = probes.sessions[0];
    await harness.navigateByUrl('/outside', TestOutside);
    TestBed.tick();
    expect(old.worker.observed).toBe(false);
    expect(old.editor.alive).toBe(false);
    expect(activeRegistrations).toBe(0);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(false);
    expect(TestBed.inject(ReportStageStateService).current()).toBeUndefined();
    const reopened = await open();
    expect(reopened.workbench.session()).not.toBe(previous);
    expect(probes.editors).toEqual({ first: 2 });
    expect(activeRegistrations).toBe(1);
    expect(probes.sessions[1].runtime.result()).toBe('loading');
  });
});
