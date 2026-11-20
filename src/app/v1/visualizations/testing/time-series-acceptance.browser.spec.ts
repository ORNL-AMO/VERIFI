import { serializeVisualizationDefinition } from '@domain/visualizations/visualization-source-groups';
import { previewValuesText } from './preview-values.testing';
import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PortalModule } from '@angular/cdk/portal';
import { provideRouter } from '@angular/router';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { cdp, page, userEvent } from 'vitest/browser';
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
import { CreationComponent } from '../creation/creation-drawer/creation-drawer.component';
import { LibraryLifecycle } from '../library/lifecycle/library-lifecycle.service';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { ItemSettingsComponent } from '../time-series/settings/item-settings/item-settings.component';

@Component({ standalone: true, imports: [WorkbenchModule, PortalModule], template: '<main class="v1-root"><app-visualization-workbench/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class TimeSeriesHost { readonly modal = inject(ModalPortalService); }

describe('VIS6 composed saved time-series acceptance', () => {
  let harness: IndexedDbTestHarness | undefined, host: ComponentFixture<TimeSeriesHost> | undefined, drawer: ComponentFixture<CreationComponent> | undefined;
  afterEach(async () => { drawer?.destroy(); host?.destroy(); drawer = undefined; host = undefined; vi.restoreAllMocks(); await harness?.destroy(); harness = undefined; TestBed.resetTestingModule(); });

  it('creates area intent, edits stacks/order/visibility, preserves zoom and reopens exact configuration without source writes', async () => {
    const route = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: '' });
    TestBed.configureTestingModule({ imports: [VisualizationsModule, TimeSeriesHost], providers: [provideRouter([]), LibraryLifecycle,
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: WorkspaceNavigationService, useValue: { routeState: route, inventoryFacilityGuid: signal(undefined), isSingleSiteWorkspace: () => false } }
    ] });
    harness = await IndexedDbTestHarness.create('vis6-acceptance');
    const snapshot = equipmentSnapshot();
    const equipment = [equipmentFixture({ id: 1 }), equipmentFixture({ id: 2, guid: 'equipment-b', name: 'Production boiler with a very long resource name for narrow portfolio views' })];
    equipment.forEach((item, index) => { item.utilityData[0].energyUse = [2023, 2024, 2025, 2026].map(year => ({ year, energyUse: index ? 75 : 25, energyUseUnit: 'kWh', overrideEnergyUse: true })); });
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(facility => ({ ...facility })), facilityEnergyUseEquipment: equipment.map(item => ({ ...item })) });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore);
    const demand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const before = await harness.getAll('facilityEnergyUseEquipment');
    vi.spyOn(TestBed.inject(VisualizationNavigationService), 'open').mockImplementation(async (accountGuid, visualizationGuid) => { route.set({ section: 'visualization', accountGuid, visualizationGuid }); return true; });
    drawer = TestBed.createComponent(CreationComponent);
    const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); drawer.detectChanges();
    const area = [...(drawer.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Area')!;
    area.focus(); await userEvent.keyboard('{Enter}'); drawer.detectChanges();
    lifecycle.toggleSource('energy-use'); lifecycle.continueSources(); lifecycle.selectEnergyUseMode('equipment');
    lifecycle.form.controls.energyUseResourceIds.setValue(['equipment-a', 'equipment-b']); lifecycle.continueEquipment();
    if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('VIS6 equipment shares'); await lifecycle.submit();
    expect(store.savedVisualizations()).toHaveLength(1);
    drawer.destroy(); drawer = undefined;

    host = TestBed.createComponent(TimeSeriesHost); host.detectChanges();
    let component = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance as WorkbenchComponent;
    const preview = () => host!.debugElement.query(By.directive(PreviewComponent)).componentInstance as PreviewComponent;
    const wait = async () => vi.waitFor(() => { host!.detectChanges(); expect(preview().preview.state().state).toBe('ready'); });
    await wait();
    expect(component.editor.definition()!.chart).toMatchObject({ defaultTraceType: 'area', interval: 'yearly' });
    component.editor.applyDefinition({ ...component.editor.definition()!, period: { kind: 'all-history' } });
    expect(await component.editor.flush()).toBe(true); await wait();
    component.setSection('chart', true); host.detectChanges();
    const root = host.nativeElement as HTMLElement;
    const canvas = root.querySelector<HTMLElement>('.time-series-canvas')!;
    await vi.waitFor(() => expect(echarts.getInstanceByDom(canvas)).toBeDefined());
    const chart = echarts.getInstanceByDom(canvas)!;
    chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 }); host.detectChanges();
    for (const label of ['Absolute', 'Percentage']) {
      const button = [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Stacking"] button')].find(button => button.textContent?.trim() === label)!;
      expect(button.disabled).toBe(false); button.focus(); await userEvent.keyboard('{Enter}');
      expect(await component.editor.flush()).toBe(true); await wait();
      expect(root.querySelector('.time-series-canvas')).toBe(canvas);
      expect(echarts.getInstanceByDom(canvas)).toBe(chart);
      expect((chart.getOption() as any).dataZoom[0]).toMatchObject({ start: 25, end: 75 });
    }
    const options = chart.getOption() as any;
    expect(options.series[0].areaStyle).toBeDefined();
    expect(options.series.map(series => series.data[0][1])).toEqual([25, 75]);
    expect(options.yAxis[0]).toMatchObject({ min: 0, max: 100 });

    component.setSection('source:source-1', true);
    component.setSection('item:source-1:resource%3Aequipment-b', true); host.detectChanges();
    const up = root.querySelector<HTMLButtonElement>('button[aria-label^="Move Production boiler"][aria-label$=" up"]')!;
    up.focus(); await userEvent.keyboard('{Enter}'); host.detectChanges(); await wait();
    let items = host.debugElement.queryAll(By.directive(ItemSettingsComponent));
    expect((items[0].componentInstance as ItemSettingsComponent).itemValue()!.identity.resourceGuid).toBe('equipment-b');
    const settings = items[0].componentInstance as ItemSettingsComponent;
    settings.form.controls.label.setValue('Boiler share');
    settings.form.controls.color.setValue('#23684d'); settings.form.controls.customColor.setValue(true);
    settings.form.controls.visible.setValue(false); host.detectChanges(); await wait();
    expect((chart.getOption() as any).series[0].data[0][1]).toBe(100);
    items = host.debugElement.queryAll(By.directive(ItemSettingsComponent));
    (items[1].componentInstance as ItemSettingsComponent).form.controls.visible.setValue(false); host.detectChanges(); await wait();
    expect(root.textContent).toContain('No visible series');
    settings.form.controls.visible.setValue(true); host.detectChanges(); await wait();
    (items[1].componentInstance as ItemSettingsComponent).form.controls.visible.setValue(true); host.detectChanges(); await wait();
    expect(await component.editor.flush()).toBe(true); await wait();
    const saved = component.editor.definition()!, guid = component.editor.record()!.guid;
    expect(saved.chart).toMatchObject({ defaultTraceType: 'area', stack: 'percent' });

    expect(root.querySelector('table, .visualization-preview__accessible-data')).toBeNull();
    expect(previewValuesText(host!)).toContain('75% of visible selection');
    for (const [width, theme] of [[1100, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); root.querySelector('main')!.className = `v1-root ${theme}`; host.detectChanges();
      root.querySelector<HTMLElement>('.visualization-workbench__chart')!.scrollTop = 0;
      root.querySelector<HTMLElement>('.visualization-workbench__controls')!.scrollTop = 0;
      await vi.waitFor(() => expect(echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!.getWidth()).toBeGreaterThan(width === 1100 ? 500 : 200));
      expect(root.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 1);
    }
    await page.viewport(1100, 850); root.querySelector('main')!.className = 'v1-root';
    root.querySelector<HTMLElement>('.visualization-workbench__chart')!.scrollTop = 0;
    const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
    await print.send('Emulation.setEmulatedMedia', { media: 'print' });
    try { expect(root.querySelector('table')).toBeNull(); }
    finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); }

    host.destroy(); host = undefined;
    host = TestBed.createComponent(TimeSeriesHost); host.detectChanges(); await wait();
    component = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance;
    expect(component.editor.definition()).toEqual(saved);
    expect(demand).not.toHaveBeenCalled();
    host.destroy(); host = undefined;
    await harness.reopen();
    const durable = await harness.getAll('savedVisualizations');
    expect(durable).toHaveLength(1); expect(durable[0]['guid']).toBe(guid); expect(durable[0]['definition']).toEqual(serializeVisualizationDefinition(saved!));
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before);
  });
});
