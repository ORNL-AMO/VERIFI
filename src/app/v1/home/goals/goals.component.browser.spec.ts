import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { page, cdp } from 'vitest/browser';
import { HomeDashboardComponent } from '../dashboard/dashboard.component';
import { HomeGoalsComponent } from './goals.component';
import { setupHome, homeRecord } from '../testing/home-testing';
import { homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { accountAnalysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { UtilityDataSession } from '@app/v1/visualizations/utility/utility-data-session.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';

describe('Home goal browser integration', () => {
  afterEach(async () => { vi.restoreAllMocks(); await (cdp() as any).send('Emulation.setEmulatedMedia', {media: ''}); await page.viewport(1200, 900); });
  it('uses a real reporting Worker, preserves no-goal results, print and owner selection loss without writes', async () => {
    const data = accountAnalysisFixture();
    const snapshot = {...data.snapshot, facilities: data.snapshot.facilities.map(f => ({...f, selectedEnergyAnalysisId: f.guid === 'facility-a' ? 'analysis-a' : undefined,
      sustainabilityQuestions: {...f.sustainabilityQuestions, energyReductionGoal: false}}))};
    const base = {state: 'ready', inputFingerprint: 'canonical', meters: data.meters, accountGuid: 'account-a'};
    TestBed.overrideProvider(UtilityDataSession, {useValue: {acquire: async () => ({snapshot: store.snapshot(), base})}});
    TestBed.overrideProvider(WorkspaceCalendarizationService, {useValue: {currentInputFingerprint: () => 'canonical',
      project: (_: unknown, input: {meterGuids: string[]}) => ({state: 'ready', meters: data.meters.filter(m => input.meterGuids.includes(m.meter.guid))})}});
    const {store, route} = setupHome();
    const NativeWorker = globalThis.Worker;
    const workers = vi.spyOn(globalThis, 'Worker').mockImplementation(function(url, options) {
      const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
      return new NativeWorker(/^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original, options);
    });
    const owner = {kind: 'facility' as const, guid: 'facility-a'};
    const widget = {id: 'goal', kind: 'goal' as const, size: 'half' as const, visibility: 'always' as const,
      binding: {kind: 'reporting' as const, owner, category: 'energy' as const}};
    const record = {...homeRecord('board', 'Home', 'facility-a'), definition: homeDefinition([widget])};
    store.publish({...snapshot, homeDashboards: [record], homeOwners: [getNewIdbHomeOwner('account-a', owner, homeOwnerState(['board']))]});
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/dashboard/board'));
    const fixture = TestBed.createComponent(HomeDashboardComponent); fixture.nativeElement.className = 'v1-root'; fixture.detectChanges();
    const goal = () => fixture.debugElement.query(By.directive(HomeGoalsComponent)).componentInstance as HomeGoalsComponent;
    await vi.waitFor(() => { fixture.detectChanges(); expect(Object.values(goal().results())[0]?.state).toBe('ready'); });
    expect(fixture.nativeElement.textContent).toContain('No goal set');
    expect(fixture.nativeElement.textContent).toContain('Rolling 12-month improvement');
    expect(workers).toHaveBeenCalledTimes(1); expect(store.savedVisualizations()).toEqual([]);
    await page.viewport(390, 850); expect(fixture.nativeElement.getBoundingClientRect().width).toBeLessThanOrEqual(390);
    await (cdp() as any).send('Emulation.setEmulatedMedia', {media: 'print'}); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Rolling 12-month improvement');
    store.publishCommitted({...store.snapshot()!, facilities: snapshot.facilities.map(f => ({...f, selectedEnergyAnalysisId: undefined}))}, {}); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choose an Active for reporting');
    expect(fixture.nativeElement.querySelector('dl')).toBeNull();
    expect(store.homeDashboards()).toHaveLength(1); expect(store.savedVisualizations()).toEqual([]); fixture.destroy();
  });
});
