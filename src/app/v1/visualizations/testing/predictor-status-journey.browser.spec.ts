import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { VisualizationsModule } from '../visualizations.module';
import { WorkbenchComponent } from '../workbench/workbench.component';

@Component({ template: '<h1>Predictor data</h1>' })
class PredictorDestination { }

describe('predictor status in the native saved workbench', () => {
  let harness: IndexedDbTestHarness | undefined;
  let fixture: ComponentFixture<WorkbenchComponent> | undefined;
  afterEach(async () => {
    fixture?.destroy(); fixture = undefined;
    TestBed.resetTestingModule(); vi.restoreAllMocks();
    await harness?.destroy(); harness = undefined;
  });

  it('saves, previews and reopens with shared status and accessible evidence, then opens predictor data by keyboard', async () => {
    const routeState = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: '' });
    // Represent the shell's already-owned canonical coverage. Previewing must not acquire another calculation.
    const coverage = new BehaviorSubject<WorkspaceCalendarizationBaseResult>({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'canonical', meters: [] });
    const calendarizeBase = vi.fn(() => coverage.asObservable());
    const getWeather = vi.fn(() => { throw new Error('Viewing saved weather must not retrieve weather'); });
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [
      provideRouter([{ path: 'v1/workspace/facility/:facilityGuid/data/predictors/:predictorGuid/:tab', component: PredictorDestination }]),
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: () => {} } },
      { provide: WorkspaceNavigationService, useValue: { routeState, isSingleSiteWorkspace: () => true } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase, currentInputFingerprint: () => 'canonical' } },
      { provide: HourlyWeatherDataService, useValue: { load: getWeather } }
    ] });
    harness = await IndexedDbTestHarness.create('predictor-status-journey');
    const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
    const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', name: 'Plant A' };
    const predictor = { ...getNewIdbPredictor(account.guid, facility.guid), id: 1, guid: 'weather', name: 'Temperature',
      predictorType: 'Weather' as const, weatherDataType: 'dryBulbTemp' as const, unit: '', weatherStationName: 'Saved station', ignoreDateStatusChecks: true };
    const readings = [
      { ...getNewIdbPredictorData(predictor), id: 1, guid: 'zero', year: 2024, month: 1, amount: 0, weatherDataChanged: true, weatherOverride: true },
      { ...getNewIdbPredictorData(predictor), id: 2, guid: 'march', year: 2024, month: 3, amount: 10 },
      { ...getNewIdbPredictorData(predictor), id: 3, guid: 'invalid', year: 2024, month: 13, amount: 7, weatherOverride: true }
    ];
    await harness.seed({ accounts: [account], facilities: [facility], predictor: [predictor], predictorData: readings });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore), status = TestBed.inject(WorkspaceStatusService);
    expect(status.state()).toBe('ready'); expect(calendarizeBase).toHaveBeenCalledOnce();
    const meterDemand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const initial = { ...createVisualizationDefinition('Saved weather history', account.guid, { kind: 'fixed' as const, facilityGuids: [facility.guid] }, 'predictor'),
      chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'monthly' as const, stack: 'none' as const } };
    const selected = prepareDecisionChange(initial, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [predictor.guid] }, { snapshot: store.snapshot()! });
    if (selected.state === 'unchanged') throw new Error('Expected selected predictor');
    const commands = TestBed.inject(SavedVisualizationCommands), saved = await commands.submit(commands.prepareCreate(selected.definition));
    if (saved.state !== 'committed' || !saved.value) throw new Error('Expected saved visualization');
    routeState.set({ ...routeState(), visualizationGuid: saved.value.guid });
    const mount = async () => {
      fixture = TestBed.createComponent(WorkbenchComponent);
      const root = fixture.nativeElement as HTMLElement;
      root.className = 'v1-root'; root.style.height = '850px'; root.style.width = '100%'; root.style.background = 'var(--v1-bg)';
      fixture.detectChanges();
      await vi.waitFor(() => { fixture!.detectChanges(); expect(root.querySelector('canvas')).not.toBeNull(); });
      expect(root.querySelector('[aria-label="Predictor data status"]')?.textContent).toContain('Has errors');
      expect(root.querySelectorAll('[aria-label="Predictor data issues"] li')).toHaveLength(2);
      expect(root.querySelector('.time-series-warning')).toBeNull();
      expect(root.querySelector('.time-series-notices:not(.time-series-omissions)')).toBeNull();
      const values = root.querySelector('table')!.textContent!;
      expect(values).toContain('0 °F'); expect(values).toContain('Manual weather override');
      expect(values).toContain('Saved weather data changed'); expect(values).toContain('Saved station'); expect(values).toContain('missing: No saved reading');
      return root;
    };
    let root = await mount();
    const omissions = root.querySelector<HTMLDetailsElement>('.time-series-omissions')!;
    expect(omissions.open).toBe(false);
    omissions.querySelector('summary')!.focus(); await userEvent.keyboard('{Enter}');
    const group = omissions.querySelector('details')!; group.querySelector('summary')!.focus(); await userEvent.keyboard('{Enter}');
    expect(omissions.open).toBe(true); expect(group.open).toBe(true);
    expect(group.textContent).toContain('invalid: 7 (2024-13)'); expect(group.textContent).toContain('Manual weather override');
    for (const [width, theme, label] of [[1100, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark'], [390, 'v1-theme-dark v1-contrast-strong', 'contrast']] as const) {
      await page.viewport(width, 950); root.className = `v1-root ${theme}`; fixture!.detectChanges();
      expect(root.scrollWidth).toBeLessThanOrEqual(width);
      await page.screenshot({ element: root, path: `../../../../../.angular/predictor-p2-${label}.png` });
    }
    fixture!.destroy(); fixture = undefined;
    const reopened = await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid);
    expect(reopened!.definition).toEqual(selected.definition);
    root = await mount();
    const issue = root.querySelector<HTMLButtonElement>('[aria-label="Predictor data issues"] button')!;
    issue.focus(); await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toMatch(/\/data\/predictors\/weather\/(readings|quality)$/));
    expect(calendarizeBase).toHaveBeenCalledOnce(); expect(meterDemand).not.toHaveBeenCalled(); expect(getWeather).not.toHaveBeenCalled();
    expect(await harness.getAll('predictorData')).toEqual(readings);
    expect(await harness.getAll('predictor')).toEqual([predictor]);
    coverage.complete();
  });
});
