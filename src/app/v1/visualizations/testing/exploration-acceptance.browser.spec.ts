import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PortalModule } from '@angular/cdk/portal';
import { provideRouter } from '@angular/router';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { cdp, page } from 'vitest/browser';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { equipmentFixture, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { echarts } from '@app/v1/shared/charts/echarts';
import { VisualizationsModule } from '../visualizations.module';
import { WorkbenchModule } from '../workbench/workbench.module';
import { WorkbenchComponent } from '../workbench/workbench.component';
import { PreviewComponent } from '../preview/preview/preview.component';
import { LibraryLifecycle } from '../library/lifecycle/library-lifecycle.service';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { ExplorationSettingsComponent } from '../exploration/settings/exploration-settings.component';
import type { ExplorationModel } from '@domain/visualizations/visualization-exploration';

@Component({ standalone: true, imports: [WorkbenchModule, PortalModule], template: '<main class="v1-root"><app-visualization-workbench/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class ExplorationHost { readonly modal = inject(ModalPortalService); }

describe('VIS7 saved exploration acceptance', () => {
  let harness: IndexedDbTestHarness | undefined, host: ComponentFixture<ExplorationHost> | undefined;
  afterEach(async () => { host?.destroy(); host = undefined; vi.restoreAllMocks(); await harness?.destroy(); harness = undefined; TestBed.resetTestingModule(); });

  it('creates all six pairs, keeps charts free of inspection controls, saves scatter axes and heatmap settings, and reopens without source writes', async () => {
    const route = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: '' });
    TestBed.configureTestingModule({ imports: [VisualizationsModule, ExplorationHost], providers: [provideRouter([]), LibraryLifecycle,
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: WorkspaceNavigationService, useValue: { routeState: route, inventoryFacilityGuid: signal(undefined), isSingleSiteWorkspace: () => false } }
    ] });
    harness = await IndexedDbTestHarness.create('vis7-acceptance');
    const snapshot = equipmentSnapshot();
    const equipment = Array.from({ length: 4 }, (_, index) => {
      const item = equipmentFixture({ id: index + 1, guid: `equipment-${index}`, name: ['Electric furnace', 'Production pump', 'Cooling equipment', 'Constant load'][index] });
      item.utilityData[0].energyUse = [2023, 2024, 2025, 2026].map((year, offset) => ({ year, energyUse: index === 3 ? 20 : index === 2 ? 50 - offset * 3 : (index + 1) * (offset + 1) * 10, energyUseUnit: 'kWh', overrideEnergyUse: true }));
      return item;
    });
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(facility => ({ ...facility })), facilityEnergyUseEquipment: equipment.map(item => ({ ...item })) });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore), demand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const before = await harness.getAll('facilityEnergyUseEquipment');
    vi.spyOn(TestBed.inject(VisualizationNavigationService), 'open').mockImplementation(async (accountGuid, visualizationGuid) => { route.set({ section: 'visualization', accountGuid, visualizationGuid }); return true; });
    const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('correlation'); lifecycle.toggleSource('energy-use'); lifecycle.continueSources(); lifecycle.selectEnergyUseMode('equipment');
    lifecycle.form.controls.energyUseResourceIds.setValue(equipment.map(item => item.guid)); lifecycle.continueEquipment(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('VIS7 equipment relationships'); await lifecycle.submit();
    expect(store.savedVisualizations()).toHaveLength(1);
    host = TestBed.createComponent(ExplorationHost); host.detectChanges();
    let component = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance as WorkbenchComponent;
    const preview = () => host!.debugElement.query(By.directive(PreviewComponent)).componentInstance as PreviewComponent;
    const wait = async () => vi.waitFor(() => { host!.detectChanges(); expect(preview().preview.state().state).toBe('ready'); });
    await wait();
    const model = () => { const state = preview().preview.state(); if (state.state !== 'ready') throw new Error(JSON.stringify(state)); return state.presentation.inputs['model'] as ExplorationModel; };
    expect(model().pairs).toHaveLength(6); expect(model().pairs[0].count).toBe(4);
    expect(model().pairs.some(pair => !!pair.statistics.unavailableReason)).toBe(true);
    const root = host.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.pair-grid app-exploration-pair-panel')).toHaveLength(6);
    expect(root.querySelector('table, .inspection, .pair-actions')).toBeNull();
    const panel = root.querySelector('app-exploration-pair-panel')!;
    expect(panel.textContent).not.toMatch(/Original units:|Excluded =|n =/);
    expect(panel.querySelector('.equation')?.textContent).toMatch(/^Production pump \(kWh\) = .+ × Electric furnace \(kWh\)/);
    window.dispatchEvent(new Event('beforeprint')); host.detectChanges();
    await vi.waitFor(() => expect([...root.querySelectorAll<HTMLElement>('.pair-chart')].filter(canvas => echarts.getInstanceByDom(canvas))).toHaveLength(6));
    for (const canvas of root.querySelectorAll<HTMLElement>('.pair-chart')) {
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toContain('versus');
    }
    expect(root.querySelector('.pair-chart')?.getAttribute('aria-label')).toContain('10 kWh');
    expect(root.querySelector('.pair-chart')?.getAttribute('aria-label')).toContain('2026-12-31');
    const printPairs = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
    await page.viewport(1100, 4000);
    await printPairs.send('Emulation.setEmulatedMedia', { media: 'print' });
    try {
      window.dispatchEvent(new Event('beforeprint')); host.detectChanges();
      const panels = [...root.querySelectorAll<HTMLElement>('app-exploration-pair-panel')];
      expect(root.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(panels.at(-1)!.getBoundingClientRect().bottom);
      expect((echarts.getInstanceByDom(root.querySelector<HTMLElement>('.pair-chart')!)!.getOption() as any).dataZoom).toEqual([]);
    } finally { await printPairs.send('Emulation.setEmulatedMedia', { media: '' }); window.dispatchEvent(new Event('afterprint')); await page.viewport(1100, 850); }
    component.setSection('chart', true); host.detectChanges();
    let settings = host.debugElement.query(By.directive(ExplorationSettingsComponent)).componentInstance as ExplorationSettingsComponent;
    settings.form.controls.view.setValue('matrix'); await wait();
    expect(model().chart).toMatchObject({ kind: 'correlation', view: 'matrix', interval: 'yearly' });
    const matrix = root.querySelector<HTMLElement>('.heatmap-chart')!;
    matrix.scrollIntoView();
    await vi.waitFor(() => expect(echarts.getInstanceByDom(matrix)).toBeDefined());
    expect(root.querySelector('table, .inspection, .pair-actions')).toBeNull();
    expect(await component.editor.flush()).toBe(true); await wait();
    const savedCorrelation = component.editor.definition()!;
    host.destroy(); host = TestBed.createComponent(ExplorationHost); host.detectChanges(); await wait();
    component = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance;
    expect(component.editor.definition()).toEqual(savedCorrelation);

    component.chooseChart('scatter'); host.detectChanges();
    settings = host.debugElement.query(By.directive(ExplorationSettingsComponent)).componentInstance;
    settings.form.controls.x.setValue(settings.choices()[0].key); host.detectChanges();
    settings.form.controls.y.setValue(settings.choices()[1].key); host.detectChanges(); await wait();
    expect(model().pairs).toHaveLength(1);
    expect(component.editor.definition()!.chart).toMatchObject({ x: { resourceGuid: 'equipment-0' }, y: { resourceGuid: 'equipment-1' } });
    expect(await component.editor.flush()).toBe(true);
    const savedScatter = component.editor.definition();
    host.destroy(); host = TestBed.createComponent(ExplorationHost); host.detectChanges(); await wait();
    component = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance;
    expect(component.editor.definition()).toEqual(savedScatter);

    component.chooseChart('heatmap'); host.detectChanges(); await wait();
    settings = host.debugElement.query(By.directive(ExplorationSettingsComponent)).componentInstance;
    settings.form.controls.normalization.setValue('z-score'); await wait();
    expect(model().chart).toMatchObject({ kind: 'heatmap', dimension: 'series-period', normalization: 'z-score', scale: 'diverging' });
    const currentRoot = host.nativeElement as HTMLElement;
    for (const [width, theme] of [[1100, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); currentRoot.querySelector('main')!.className = `v1-root ${theme}`; host.detectChanges();
      const canvas = currentRoot.querySelector<HTMLElement>('.heatmap-chart')!; canvas.scrollIntoView();
      await vi.waitFor(() => expect(echarts.getInstanceByDom(canvas)?.getWidth()).toBeGreaterThan(200));
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toContain('Blank cells have no data');
      expect(canvas.getAttribute('aria-label')).toContain('10 kWh');
      expect(canvas.getAttribute('aria-label')).toContain('constant or insufficient series');
      expect(currentRoot.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 1);
    }
    await page.viewport(1100, 850); currentRoot.querySelector('main')!.className = 'v1-root';
    const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
    window.dispatchEvent(new Event('beforeprint'));
    await print.send('Emulation.setEmulatedMedia', { media: 'print' });
    try { expect(currentRoot.querySelector('.inspection')).toBeNull(); }
    finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); window.dispatchEvent(new Event('afterprint')); }
    expect(await component.editor.flush()).toBe(true); const savedHeatmap = component.editor.definition();
    host.destroy(); host = TestBed.createComponent(ExplorationHost); host.detectChanges(); await wait();
    expect((host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance as WorkbenchComponent).editor.definition()).toEqual(savedHeatmap);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before); expect(demand).not.toHaveBeenCalled();
  });
});
