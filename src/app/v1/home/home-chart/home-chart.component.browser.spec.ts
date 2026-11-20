import { HomeDashboardComponent } from '../dashboard/dashboard.component';
import { HomeEditor } from '../home-editor.service';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeOwnerState } from '@domain/home/testing/home-fixtures';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { page, cdp } from 'vitest/browser';
import { HomeChartComponent } from './home-chart.component';
import { setupHome, homeRecord } from '../testing/home-testing';
import { homeWidgetView } from '../home-widget-view';
import { homeDefinition } from '@domain/home/testing/home-fixtures';
import { accountAnalysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { UtilityDataSession } from '@app/v1/visualizations/utility/utility-data-session.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { PreviewComponent } from '@app/v1/visualizations/preview/preview/preview.component';

describe('Home shared rendering in Chromium', () => {
  afterEach(async () => { vi.restoreAllMocks(); await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '' }); await page.viewport(1200, 900); });
  it('renders current reporting results with accessible/print values, no library writes, and no stale result after selection loss', async () => {
    const data = accountAnalysisFixture();
    const snapshot = { ...data.snapshot, facilities: data.snapshot.facilities.map(item => item.guid === 'facility-a' ? { ...item, selectedEnergyAnalysisId: 'analysis-a' } : item) };
    const base = { state: 'ready', inputFingerprint: 'canonical', meters: data.meters, accountGuid: 'account-a' };
    TestBed.overrideProvider(UtilityDataSession, { useValue: { acquire: async () => ({ snapshot: store.snapshot(), base }) } });
    TestBed.overrideProvider(WorkspaceCalendarizationService, { useValue: { currentInputFingerprint: () => 'canonical',
      project: (_base: unknown, input: { meterGuids: string[] }) => ({ state: 'ready', meters: data.meters.filter(meter => input.meterGuids.includes(meter.meter.guid)) }) } });
    const { store, route } = setupHome();
    const NativeWorker = globalThis.Worker;
    const workers = vi.spyOn(globalThis, 'Worker').mockImplementation(function(url, options) {
      // Angular's native test runner serves emitted Worker assets at its root.
      const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
      return new NativeWorker(/^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original, options);
    });
    const widget = { id: 'energy', kind: 'built-in-chart' as const, size: 'half' as const, visibility: 'always' as const,
      reference: { kind: 'built-in' as const, recipe: 'reporting-energy-rolling', version: 1, owner: { kind: 'facility' as const, guid: 'facility-a' } }, inherit: [], overrides: {} };
    const record = { ...homeRecord('board', 'Home', 'facility-a'), definition: homeDefinition([widget]) };
    store.publish({ ...snapshot, homeDashboards: [record], homeOwners: [getNewIdbHomeOwner('account-a', {kind: 'facility', guid: 'facility-a'}, homeOwnerState(['board']))] });
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/dashboard/board'));
    const fixture = TestBed.createComponent(HomeDashboardComponent); fixture.nativeElement.className = 'v1-root';
    fixture.detectChanges();
    const preview = () => fixture.debugElement.query(By.directive(PreviewComponent))?.componentInstance as PreviewComponent;
    await vi.waitFor(() => { fixture.detectChanges(); expect(preview().preview.state().state, JSON.stringify(preview().preview.state())).toBe('ready');
      expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull(); });
    const values = fixture.nativeElement.querySelector('.chart-values') as HTMLElement;
    expect(values.querySelectorAll('tbody tr').length).toBeGreaterThan(12);
    expect(values.textContent).toContain('%'); expect(fixture.nativeElement.textContent).toContain('Production baseline');
    expect(store.savedVisualizations()).toEqual([]); expect(store.homeOwners()).toHaveLength(1);
    expect(workers).toHaveBeenCalledTimes(1);
    await page.viewport(390, 850);
    expect(fixture.nativeElement.getBoundingClientRect().width).toBeLessThanOrEqual(390);
    const editor = TestBed.inject(HomeEditor); editor.beginEdit(); fixture.detectChanges();
    editor.updateWidget({ ...widget, title: 'Unsaved heading' }); fixture.detectChanges();
    expect(preview().preview.state().state).toBe('inactive');
    await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print' });
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.chart-values tbody tr')).not.toBeNull(); });
    expect(getComputedStyle(fixture.nativeElement.querySelector('.chart-values')).position).toBe('static');
    expect(fixture.nativeElement.textContent).not.toContain('Unsaved heading');
    expect(editor.session()?.definition?.widgets[0].title).toBe('Unsaved heading');
    store.publishCommitted({ ...store.snapshot()!, facilities: snapshot.facilities.map(item => ({ ...item, selectedEnergyAnalysisId: undefined })) }, {});
    fixture.detectChanges();
    expect(preview().preview.state().state).toBe('setup-required');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull(); expect(fixture.nativeElement.querySelector('table')).toBeNull();
    fixture.destroy(); expect(store.savedVisualizations()).toEqual([]);
  });
});
