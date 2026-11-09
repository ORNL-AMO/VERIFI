import { SessionStorageService } from 'ngx-webstorage';
import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { cdp, page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { echarts } from '@app/v1/shared/charts/echarts';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { EnergyUsesModule } from '../../energy-uses.module';
import { ENERGY_USE_WORKBENCH_ROUTES } from '../../energy-uses.routes';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { energyUseGroup, energyUseSource, energyUsesSnapshot } from '../../energy-uses.testing';
import { resultsEquipment } from './energy-use-results.testing';
import { By } from '@angular/platform-browser';
import { EnergyUseSettingsComponent } from '../settings/energy-use-settings.component';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule],
  template: '<main class="v1-root" style="height:100dvh;overflow:auto;width:100%;--v1-rail-width:0px;--v1-section-nav-width:0px;--v1-support-panel-width:0px"><router-outlet/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class ResultsBrowserHost { readonly modal = inject(ModalPortalService); }

const groupUrl = '/v1/workspace/facility/facility-a/data/energy-uses/groups/group-a';
function setup(count = 8) {
  const NativeWorker = globalThis.Worker;
  const calendarizationWorker = new URL('../../../../../platform/web-workers/calanderization.worker', import.meta.url);
  // Angular emits the bundled Worker beside its test entry; Vitest serves that
  // entry under the source path. Resolve the production source entry in this fixture.
  globalThis.Worker = class extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      const bundled = /\/worker-[\w-]+\.js(?:\?|$)/.test(String(url));
      super(bundled ? calendarizationWorker : url, bundled ? { ...options, type: 'module' } : options);
    }
  };
  const store = new AccountWorkspaceStore();
  const equipment = Array.from({ length: count }, (_, index) => ({ ...resultsEquipment(`item-${String(index).padStart(4, '0')}`, index === 0 ? 2025 : 2022, (index + 1) * 10),
    name: `Equipment ${index + 1} · A long equipment name for responsive chart and table review` }));
  equipment[0].utilityData.push(energyUseSource({ energySource: 'Natural Gas', energyUse: [{ year: 2025, energyUse: 72, energyUseUnit: 'MJ', overrideEnergyUse: true }] }));
  const base = energyUsesSnapshot(equipment);
  store.publish({ ...base, account: { ...base.account, energyUnit: 'kWh' },
    facilities: base.facilities.map(row => ({ ...row, energyUnit: 'kWh', fiscalYear: 'calendarYear' })),
    energyUseGroups: [...base.energyUseGroups, energyUseGroup({ guid: 'empty', name: 'Empty' })] });
  const single = signal(false);
  TestBed.configureTestingModule({ imports: [EnergyUsesModule, ResultsBrowserHost], providers: [
    { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: WorkspaceNavigationService, useValue: { accountPortfolioRoute: () => ['/inventory'], isSingleSiteWorkspace: single } },
    { provide: EnergyUseActionsService, useValue: { updateSetup: vi.fn() } },
    provideRouter([{ path: 'v1/workspace/facility/:facilityGuid/data', children: ENERGY_USE_WORKBENCH_ROUTES }])
  ] });
  const fixture = TestBed.createComponent(ResultsBrowserHost); fixture.detectChanges();
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const root = fixture.nativeElement.querySelector('main') as HTMLElement;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); fixture.detectChanges(); };
  const chart = () => {
    const host = root.querySelector<HTMLElement>('.energy-use-results-graphs [role="img"], .facility-footprint [role="img"]')!;
    expect(host.querySelector('canvas')).not.toBeNull();
    const instance = echarts.getInstanceByDom(host)!;
    expect(instance.getWidth()).toBeGreaterThan(0); expect(instance.getHeight()).toBeGreaterThan(0);
    return instance.getOption() as { series: { type: string; data: { name?: string; value?: number }[]; links?: { value: number }[] }[] };
  };
  const destroy = () => { fixture.destroy(); globalThis.Worker = NativeWorker; };
  return { store, fixture, router, root, settle, chart, single, destroy };
}

describe('Energy Use group results in Chromium', () => {
  it('keeps expanded facts and the item form in place while an entered value is saved and results refresh', async () => {
    const view = setup(1), original = view.store.snapshot()!;
    const saved = { ...resultsEquipment('editing', 2025, 100), utilityMeterGroupIds: [], operatingConditionsData: [
      { year: 2025, hoursOfOperation: 1000, loadFactor: 100, dutyFactor: 100, efficiency: 100 }] };
    view.store.publish({ ...original, energyUseEquipment: [saved] });
    let finish: (() => void) | undefined;
    let pendingSave: Promise<unknown> | undefined;
    try {
      await page.viewport(1200, 1000); await view.router.navigateByUrl(`${groupUrl}/items/editing`); await view.settle();
      await page.getByRole('button', { name: 'Show facts', exact: true }).click(); await view.settle();
      const facts = view.root.querySelector<HTMLElement>('#energy-use-workbench-facts')!;
      await vi.waitFor(async () => { await view.settle(); expect(facts.querySelector('dl')).not.toBeNull(); });
      const details = facts.querySelector('details')!; details.open = true; await view.settle();
      const values = facts.querySelector('dl')!, input = page.getByRole('textbox', { name: 'Name', exact: true }).element() as HTMLInputElement;
      const top = input.getBoundingClientRect().top, factsHeight = facts.getBoundingClientRect().height;
      const actions = TestBed.inject(EnergyUseActionsService);
      vi.mocked(actions.updateSetup).mockImplementationOnce(async (_identity, value) => {
        view.store.beginLoad(false);
        await new Promise<void>(resolve => finish = resolve);
        view.store.publish({ ...original, energyUseEquipment: [{ ...saved, name: value.name }] });
        return value;
      });
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Updated equipment');
      const panel = view.fixture.debugElement.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
      const saving = panel.editor.saveNow(); pendingSave = saving; await view.settle();
      try {
        expect(facts.querySelector('dl')).toBe(values); expect(details.open).toBe(true);
        expect(facts.querySelector('[role="status"]')?.textContent).toContain('Calculating');
        expect(Math.abs(input.getBoundingClientRect().top - top), `facts shift: ${facts.getBoundingClientRect().height - factsHeight}`).toBeLessThanOrEqual(1);
        expect(Math.abs(facts.getBoundingClientRect().height - factsHeight)).toBeLessThanOrEqual(1);
        expect(view.root.textContent).not.toContain('Loading energy-use group');
        await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/stable-facts-calculating.png' });
      } finally { finish?.(); }
      await saving; await view.settle();
      await vi.waitFor(async () => { await view.settle(); expect(facts.querySelector('[role="status"]')?.textContent).toContain('Updated'); });
      expect(input.value).toBe('Updated equipment'); expect(facts.querySelector('dl')).toBe(values);
      expect(details.open).toBe(true); expect(Math.abs(input.getBoundingClientRect().top - top)).toBeLessThanOrEqual(1);
    } finally { finish?.(); await pendingSave; view.destroy(); }
  });

  it('keeps group sources and validation independent of the selected item and tab, with save feedback inside the form', async () => {
    const view = setup(2), original = view.store.snapshot()!;
    const items = original.energyUseEquipment.map((item, index) => ({ ...item,
      utilityData: item.utilityData.slice(0, 1).map(source => ({ ...source, energySource: index === 0 ? 'Electricity' as const : 'Natural Gas' as const })),
      operatingConditionsData: [{ year: index === 0 ? 2025 : 2022, hoursOfOperation: 1000, loadFactor: 100, dutyFactor: 100, efficiency: 100 }] }));
    view.store.publish({ ...original, energyUseEquipment: items });
    const before = JSON.stringify(view.store.snapshot());
    try {
      await view.router.navigateByUrl(`${groupUrl}/items/${items[0].guid}`); await view.settle();
      const controls = () => view.root.querySelector<HTMLElement>('[aria-label="Energy-use group summary and controls"]')!;
      const summary = controls().textContent;
      expect(summary).toContain('Electricity'); expect(summary).toContain('Natural Gas'); expect(summary).toContain('Valid');
      expect(summary).not.toContain('Changes save');
      expect(view.root.querySelector('.energy-use-fields app-energy-use-save-status')?.textContent).toContain('Changes save automatically.');
      for (const suffix of [`items/${items[1].guid}`, 'group-summary', 'group-footprint', 'setup']) {
        await view.router.navigateByUrl(`${groupUrl}/${suffix}`); await view.settle();
        expect(controls().textContent).toBe(summary);
      }
      expect(view.root.querySelector('app-setup-group app-energy-use-save-status')?.textContent).toContain('Changes save automatically.');
      await view.router.navigateByUrl(`${groupUrl}/items/${items[0].guid}`); await view.settle();
      view.store.publish({ ...original, energyUseEquipment: [items[0], { ...items[1], utilityData: [] }] }); await view.settle();
      expect(controls().querySelector('[aria-label="Group validation"]')?.textContent).toContain('Needs review');
      view.store.publish({ ...original, energyUseEquipment: items }); await view.settle();
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
    } finally { view.destroy(); }
  });

  it('uses the latest footprint without year controls, expands the full chart and groups rendered end nodes by source', async () => {
    const view = setup();
    const items = Array.from({ length: 18 }, (_, index) => {
      const source = (energySource: 'Electricity' | 'Natural Gas') => energyUseSource({ energySource, energyUse: [
        { year: 2024, energyUse: (10 + index) / 2, energyUseUnit: 'kWh', overrideEnergyUse: true },
        { year: 2025, energyUse: 10 + index, energyUseUnit: 'kWh', overrideEnergyUse: true }
      ] });
      return { ...resultsEquipment(`layout-${index}`, 2025), name: `Equipment ${String(index).padStart(2, '0')}`,
        utilityData: index === 17 ? [source('Electricity'), source('Natural Gas')] : [source(index % 2 ? 'Electricity' : 'Natural Gas')] };
    });
    view.store.publish({ ...view.store.snapshot()!, energyUseEquipment: items });
    const before = JSON.stringify(view.store.snapshot());
    try {
      await page.viewport(1200, 1050); await view.router.navigateByUrl(`${groupUrl}/group-footprint`); await view.settle();
      const section = view.root.querySelector<HTMLElement>('.energy-use-results-graphs')!;
      expect(section.querySelector('select, input')).toBeNull();
      expect(section.querySelector('h2')!.getBoundingClientRect().width).toBeLessThanOrEqual(1);
      expect(section.querySelector('h3')).toBeNull();
      expect(section.querySelectorAll(':scope > p')).toHaveLength(0);
      const scroller = section.querySelector<HTMLElement>('.energy-use-results-graphs__scroller')!;
      const plot = section.querySelector<HTMLElement>('[role="img"]')!;
      expect(getComputedStyle(scroller).borderTopWidth).toBe('0px');
      expect(scroller.scrollHeight).toBeLessThanOrEqual(scroller.clientHeight + 1);
      expect(scroller.clientHeight).toBeGreaterThan(window.innerHeight * .6);
      const instance = echarts.getInstanceByDom(plot)!;
      const native = instance as unknown as { getModel(): { getSeriesByIndex(index: number): { getGraph(): {
        nodes: { id: string; getLayout(): { y: number } }[]
      } } } };
      const ordered = native.getModel().getSeriesByIndex(0).getGraph().nodes
        .filter(node => node.id.startsWith('item:')).sort((a, b) => a.getLayout().y - b.getLayout().y).map(node => node.id);
      expect(ordered).toEqual([
        ...items.filter((_, index) => index % 2 === 1 && index !== 17).map(item => `item:${item.guid}`),
        'item:layout-17', ...items.filter((_, index) => index % 2 === 0).map(item => `item:${item.guid}`)
      ]);
      expect(view.chart().series[0].links!.reduce((sum, link) => sum + link.value, 0)).toBe(360);
      expect(view.root.querySelector('app-energy-use-footprint-table caption')?.textContent).toContain('FY 2025');
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 1050); view.root.className = `v1-root ${theme}`; await view.settle();
        expect(scroller.scrollHeight).toBeLessThanOrEqual(scroller.clientHeight + 1);
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
        const content = view.root.querySelector<HTMLElement>('.energy-use-workbench__content')!;
        content.scrollTop = 0; await view.settle();
        await page.screenshot({ element: view.root, path: `../../../../../../../tmp/energy-use-results/footprint-batch-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
    } finally { view.destroy(); }
  });

  it('renders Sankey, comparison and history without readings, shares tab preferences and supports browser history', async () => {
    const view = setup(); const before = JSON.stringify(view.store.snapshot());
    try {
      await page.viewport(1200, 950); await view.router.navigateByUrl(`${groupUrl}/group-footprint`); await view.settle();
      expect(view.root.querySelector('.v1-member-rail')).toBeNull();
      expect(view.root.querySelector('app-energy-use-results-table')).toBeNull();
      expect(view.root.querySelectorAll('.energy-use-results-graphs select')).toHaveLength(0);
      const footprintTable = view.root.querySelector<HTMLElement>('app-energy-use-footprint-table')!;
      expect(footprintTable.querySelectorAll('.energy-use-footprint-table__item')).toHaveLength(9);
      expect(footprintTable.textContent).toContain('Total Electricity');
      expect(footprintTable.textContent).toContain('Total Natural Gas');
      expect(view.root.querySelector('.energy-use-results-graphs__accessible-data')).toBeNull();
      expect(view.chart().series[0].type).toBe('sankey');
      expect(view.chart().series[0].links!.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(380, 8);
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/group-flow-light.png' });
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 950); view.root.className = `v1-root ${theme}`; await view.settle();
        expect(footprintTable.scrollWidth).toBeLessThanOrEqual(footprintTable.clientWidth + 1);
        const equipmentLink = footprintTable.querySelector<HTMLElement>('tbody a')!;
        expect(textContrast(equipmentLink, footprintTable.querySelector('section')!)).toBeGreaterThanOrEqual(4.5);
        await page.screenshot({ element: footprintTable, path: `../../../../../../../tmp/energy-use-results/footprint-source-table-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
      await page.viewport(1200, 950); view.root.className = 'v1-root'; await view.settle();
      await page.getByRole('button', { name: 'Group Summary', exact: true }).click(); await view.settle();
      expect(view.chart().series[0].type).toBe('bar');
      expect(view.root.querySelector('app-energy-use-results-table')).toBeNull();
      expect(view.root.querySelector('app-energy-use-footprint-table')).toBeNull();
      expect(view.root.querySelectorAll('app-energy-use-summary-table tbody tr')).toHaveLength(8);
      expect(view.root.querySelector('.energy-use-results-graphs select')).toBeNull();
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/group-comparison-light.png' });
      await page.getByRole('checkbox', { name: 'Show history', exact: true }).click(); await view.settle();
      expect(view.chart().series).toHaveLength(8);
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/group-history-light.png' });
      const history = page.getByRole('checkbox', { name: 'Show history', exact: true }).element() as HTMLInputElement;
      history.focus(); await userEvent.keyboard('{Tab}'); expect(view.root.contains(document.activeElement)).toBe(true);
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 950); view.root.className = `v1-root ${theme}`; await view.settle();
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
        expect(view.root.querySelector('app-energy-use-results-table')).toBeNull();
        await page.screenshot({ element: view.root, path: `../../../../../../../tmp/energy-use-results/split-summary-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
      await page.getByRole('button', { name: 'Facility Footprint', exact: true }).click(); await view.settle();
      expect(view.router.url).toBe(`${groupUrl}/facility-footprint`);
      expect(view.root.querySelector('app-energy-use-results-controls')).toBeNull();
      expect(view.root.querySelector('app-energy-use-facility-footprint')?.textContent).toContain('North plant');
      expect(view.chart().series[0].type).toBe('sankey');
      expect(view.chart().series[0].links!.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(380, 8);
      await page.viewport(1200, 950);
      TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(`${groupUrl}/group-summary`)); await view.settle();
      expect(view.chart().series).toHaveLength(8);
      expect((page.getByRole('checkbox', { name: 'Show history' }).element() as HTMLInputElement).checked).toBe(true);
      TestBed.inject(Location).forward(); await vi.waitFor(() => expect(view.router.url).toBe(`${groupUrl}/facility-footprint`)); await view.settle();
      view.single.set(true); await view.settle();
      expect(view.root.querySelector('.v1-data-workbench-title')?.textContent).toContain('Production');
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
    } finally { view.destroy(); }
  });

  it('renders every member in a 1,000-item group and keeps the complete Summary totals', async () => {
    const view = setup(1000);
    try {
      await page.viewport(1200, 950); await view.router.navigateByUrl(`${groupUrl}/group-footprint`); await view.settle();
      expect(view.chart().series[0].links).toHaveLength(1001);
      expect(view.root.querySelectorAll('app-energy-use-footprint-table .energy-use-footprint-table__item')).toHaveLength(1001);
      await page.getByRole('button', { name: 'Group Summary', exact: true }).click(); await view.settle();
      expect(view.root.querySelectorAll('app-energy-use-summary-table tbody tr')).toHaveLength(1000);
      expect(view.root.querySelector('tfoot')?.textContent).toContain('5,005,020');
      await view.router.navigateByUrl(`${groupUrl}/group-footprint`); await view.settle();
      const equipmentLink = view.root.querySelector<HTMLAnchorElement>('app-energy-use-footprint-table tbody a')!;
      const destination = equipmentLink.pathname;
      equipmentLink.focus(); await userEvent.keyboard('{Enter}'); await view.settle();
      expect(view.router.url).toBe(destination);
    } finally { view.destroy(); }
  });

  it('keeps summary names on one line, avoids unnecessary table scroll and wraps every solid-color history legend label', async () => {
    const view = setup(12);
    const before = JSON.stringify(view.store.snapshot());
    const media = cdp() as { send(command: string, parameters: Record<string, unknown>): Promise<void> };
    try {
      await page.viewport(1400, 1100); await view.router.navigateByUrl(`${groupUrl}/group-summary`); await view.settle();
      const table = view.root.querySelector<HTMLElement>('.energy-use-summary-table__scroller')!;
      expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth + 1);
      expect(table.scrollHeight).toBeLessThanOrEqual(table.clientHeight + 1);
      for (const link of table.querySelectorAll<HTMLElement>('tbody a')) {
        expect(getComputedStyle(link).whiteSpace).toBe('nowrap');
        expect(link.getBoundingClientRect().height).toBeLessThan(30);
      }
      expect(view.root.querySelector('.energy-use-results-graphs select')).toBeNull();
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/summary-batch-snapshot.png' });
      await page.getByRole('checkbox', { name: 'Show history', exact: true }).click(); await view.settle();
      for (const [width, theme] of [[1400, ''], [700, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 1100); view.root.className = `v1-root ${theme}`; await view.settle();
        const plot = view.root.querySelector<HTMLElement>('.energy-use-results-graphs [role="img"], .facility-footprint [role="img"]')!;
        const chart = echarts.getInstanceByDom(plot)!;
        const native = chart as unknown as {
          getModel(): { getComponent(type: string): { coordinateSystem?: { getRect(): { y: number; height: number } } } };
          getViewOfComponentModel(model: unknown): { group: { x: number; y: number; getBoundingRect(): { x: number; y: number; width: number; height: number } } };
        };
        const legend = native.getViewOfComponentModel(native.getModel().getComponent('legend')).group;
        const bounds = legend.getBoundingRect();
        const grid = native.getModel().getComponent('grid').coordinateSystem!.getRect();
        expect(bounds.height).toBeGreaterThan(40);
        expect(bounds.x + legend.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + legend.x + bounds.width).toBeLessThanOrEqual(chart.getWidth() + 1);
        expect(bounds.y + legend.y).toBeGreaterThan(grid.y + grid.height);
        expect(bounds.y + legend.y + bounds.height).toBeLessThanOrEqual(chart.getHeight() + 1);
        const renderedText = chart.getZr().storage.getDisplayList().filter(element => element.type === 'tspan')
          .map(element => (element as unknown as { style: { text: string } }).style.text).join('').replace(/\s/g, '');
        for (const item of view.store.energyUseEquipment()) expect(renderedText).toContain(item.name.replace(/\s/g, ''));
        const option = chart.getOption() as { legend: { type: string }[]; series: { itemStyle: { color: string; decal?: unknown }; data: { itemStyle?: { decal?: unknown } }[] }[] };
        expect(option.legend[0].type).toBe('plain');
        expect(option.series).toHaveLength(12);
        expect(option.series.every(series => !series.itemStyle.decal && series.data.every(row => !row.itemStyle?.decal))).toBe(true);
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
        expect(table.scrollHeight).toBeLessThanOrEqual(table.clientHeight + 1);
        const content = view.root.querySelector<HTMLElement>('.energy-use-workbench__content')!;
        content.scrollTop = 0; await view.settle();
        await page.screenshot({ element: view.root, path: `../../../../../../../tmp/energy-use-results/summary-batch-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
      await page.viewport(1400, 1100); view.root.className = 'v1-root'; await view.settle();
      await media.send('Emulation.setEmulatedMedia', { media: 'print' }); await view.settle();
      expect(getComputedStyle(table).overflowX).toBe('visible');
      expect(getComputedStyle(table.querySelector<HTMLElement>('tbody th')!).position).toBe('static');
      expect(getComputedStyle(view.root.querySelector<HTMLElement>('.energy-use-results-graphs__scroller')!).overflowX).toBe('visible');
      await page.screenshot({ element: table, path: '../../../../../../../tmp/energy-use-results/summary-batch-print.png' });
      await view.router.navigateByUrl(`${groupUrl}/group-footprint`); await view.settle();
      const footprint = view.root.querySelector<HTMLElement>('.energy-use-footprint-table__scroller')!;
      expect(getComputedStyle(footprint).overflowX).toBe('visible');
      expect(view.chart().series[0].type).toBe('sankey');
      await page.screenshot({ element: footprint, path: '../../../../../../../tmp/energy-use-results/footprint-batch-print.png' });
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
    } finally { await media.send('Emulation.setEmulatedMedia', { media: '', features: [] }); view.destroy(); }
  });

  it('renders the full facility by group from an empty selected group and preserves canonical keyboard links, themes and printing', async () => {
    const view = setup(12);
    const current = view.store.snapshot()!;
    view.store.publish({ ...current,
      energyUseGroups: [...current.energyUseGroups, energyUseGroup({ guid: 'utilities', name: 'Utilities' })],
      energyUseEquipment: current.energyUseEquipment.map((item, index) => ({ ...item,
        energyUseGroupId: index % 3 === 0 ? 'missing' : index % 3 === 1 ? 'utilities' : 'group-a' }))
        .concat([{ ...resultsEquipment('foreign', 2099, 1000), facilityId: 'facility-b' }]) });
    const before = JSON.stringify(view.store.snapshot());
    const media = cdp() as { send(command: string, parameters: Record<string, unknown>): Promise<void> };
    try {
      await page.viewport(1400, 1100);
      await view.router.navigateByUrl(`${groupUrl.replace('group-a', 'empty')}/facility-footprint`); await view.settle();
      expect([...view.root.querySelectorAll('[aria-label="Energy-use group sections"] button')].map(button => button.textContent?.trim()))
        .toEqual(['Setup Group', 'Energy Use Items', 'Group Summary', 'Group Footprint', 'Facility Footprint']);
      expect(view.root.querySelector('app-energy-use-facility-footprint')?.textContent).toContain('FY 2025');
      expect(view.root.querySelectorAll('.facility-footprint__group')).toHaveLength(4);
      expect(view.root.querySelector('.facility-footprint__without-sources')?.textContent).toContain('Empty: No equipment');
      const chart = view.chart();
      expect(chart.series[0].data.map(row => row.name)).toContain('group:unavailable');
      expect(chart.series[0].data.some(row => row.name?.startsWith('item:'))).toBe(false);
      expect(chart.series[0].links!.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(800, 8);
      expect(view.root.querySelector('tfoot')?.textContent).toContain('800');
      for (const [width, theme] of [[1400, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 1100); view.root.className = `v1-root ${theme}`; await view.settle();
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
        const plot = view.root.querySelector<HTMLElement>('.facility-footprint__plot-scroll')!;
        expect(plot.scrollHeight).toBeLessThanOrEqual(plot.clientHeight + 1);
        const name = view.root.querySelector<HTMLElement>('.facility-footprint__group a')!;
        expect(textContrast(name, name.closest('section')!)).toBeGreaterThanOrEqual(4.5);
        await page.screenshot({ element: view.root, path: `../../../../../../../tmp/energy-use-results/facility-footprint-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
      await page.viewport(1400, 1100); view.root.className = 'v1-root'; await view.settle();
      const link = view.root.querySelector<HTMLAnchorElement>('.facility-footprint__group a[href$="group-a/group-footprint"]')!;
      link.focus(); await userEvent.keyboard('{Enter}'); await view.settle();
      expect(view.router.url).toBe(`${groupUrl}/group-footprint`);
      TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url.endsWith('/empty/facility-footprint')).toBe(true)); await view.settle();
      await media.send('Emulation.setEmulatedMedia', { media: 'print' }); await view.settle();
      expect(getComputedStyle(view.root.querySelector<HTMLElement>('.facility-footprint__table-scroll')!).overflowX).toBe('visible');
      expect(getComputedStyle(view.root.querySelector<HTMLElement>('.facility-footprint__plot-scroll')!).overflowX).toBe('visible');
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/facility-footprint-print.png' });
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
    } finally { await media.send('Emulation.setEmulatedMedia', { media: '', features: [] }); view.destroy(); }
  });

  it('aggregates a 100-group, 1,000-item facility into complete source-to-group flows', async () => {
    const view = setup(1000);
    const current = view.store.snapshot()!;
    view.store.publish({ ...current,
      energyUseGroups: Array.from({ length: 100 }, (_, index) => energyUseGroup({ guid: `group-${index}`, name: `Group ${index}` })),
      energyUseEquipment: current.energyUseEquipment.map((item, index) => ({ ...item, energyUseGroupId: `group-${Math.floor(index / 10)}` })) });
    const before = JSON.stringify(view.store.snapshot());
    try {
      await page.viewport(1400, 1100); await view.router.navigateByUrl(`${groupUrl.replace('group-a', 'group-0')}/facility-footprint`); await view.settle();
      const chart = view.chart();
      expect(chart.series[0].data.filter(row => row.name?.startsWith('group:'))).toHaveLength(100);
      expect(chart.series[0].links).toHaveLength(101);
      expect(chart.series[0].links!.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(5005020, 8);
      expect(view.root.querySelectorAll('.facility-footprint__group')).toHaveLength(101);
      expect(view.root.querySelector('tfoot')?.textContent).toContain('5,005,020');
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
    } finally { view.destroy(); }
  });

  it('compares real calendarized metered consumption, draws unaccounted flows and rejects incomplete bill coverage', async () => {
    const view = setup(1), current = view.store.snapshot()!;
    const media = cdp() as { send(command: string, parameters: Record<string, unknown>): Promise<void> };
    const meters = [meter({ guid: 'electric', meterReadingDataApplication: 'fullMonth' }),
      meter({ guid: 'gas', source: 'Natural Gas', meterReadingDataApplication: 'fullMonth' })];
    const readings = meters.flatMap(meter => Array.from({ length: 12 }, (_, index) => reading({ guid: `${meter.guid}-${index}`, meterId: meter.guid,
      year: 2025, month: index + 1, totalEnergyUse: meter.guid === 'electric' ? 10 : 5 })));
    const snapshot = { ...current, meters, meterData: readings, energyUseEquipment: [resultsEquipment('equipment', 2022, 90)] };
    view.store.publish(snapshot);
    const before = JSON.stringify(view.store.snapshot());
    try {
      await page.viewport(1400, 1200); await view.router.navigateByUrl(`${groupUrl}/facility-footprint`); await view.settle();
      const balance = () => view.root.querySelector<HTMLElement>('.facility-footprint__balance')!;
      await vi.waitFor(async () => { await view.settle(); expect(balance()?.textContent ?? view.root.textContent).toContain('50% accounted for'); });
      expect(view.root.querySelector('.facility-footprint__scope')?.textContent).toContain('FY 2025');
      expect(balance().querySelector('dl')?.textContent).toMatch(/Metered Consumption\s*180/);
      expect(balance().querySelector('dl')?.textContent).toMatch(/Unaccounted\s*90/);
      await page.getByRole('button', { name: 'Show facts', exact: true }).click(); await view.settle();
      const facts = () => view.root.querySelector<HTMLElement>('#energy-use-workbench-facts')!;
      expect(facts().textContent).toContain('Facility Energy Balance');
      expect(facts().querySelector('dl')?.textContent).toMatch(/Metered Consumption\s*180/);
      expect(facts().querySelector('dl')?.textContent).toMatch(/Accounted for\s*50%/);
      const sourceDetails = facts().querySelector('details')!; sourceDetails.open = true; await view.settle();
      expect(facts().querySelector('[aria-label="Electricity energy balance"]')?.textContent).toMatch(/Accounted for\s*75%/);
      expect(facts().querySelector('[aria-label="Natural Gas energy balance"]')?.textContent).toMatch(/Accounted for\s*0%/);
      expect(balance().querySelector('.facility-footprint__source-balances')?.textContent).toMatch(/Accounted for\s*75%/);
      await view.router.navigateByUrl(`${groupUrl}/group-summary`); await view.settle();
      expect(facts().querySelector('dl')?.textContent).toMatch(/Metered Consumption\s*180/);
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/group-header-facts-light.png' });
      for (const theme of ['v1-theme-dark', 'v1-theme-dark v1-contrast-strong']) {
        await page.viewport(390, 850); view.root.className = `v1-root ${theme}`; await view.settle();
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
        expect(view.root.querySelector<HTMLElement>('.energy-use-workbench__content')!.clientHeight).toBeGreaterThan(60);
        const label = facts().querySelector<HTMLElement>('dt')!;
        expect(textContrast(label, label.parentElement!)).toBeGreaterThanOrEqual(4.5);
        await page.screenshot({ element: view.root, path: `../../../../../../../tmp/energy-use-results/group-header-facts-${theme.includes('contrast') ? 'contrast' : 'dark'}.png` });
      }
      await page.viewport(1400, 1200); view.root.className = 'v1-root'; await view.settle();
      await view.router.navigateByUrl(`${groupUrl}/facility-footprint`); await view.settle();
      (page.getByRole('button', { name: 'Hide facts', exact: true }).element() as HTMLElement).focus();
      await userEvent.keyboard('{Enter}'); await view.settle();
      expect(facts().hidden).toBe(true);
      const flow = view.chart().series[0];
      expect(flow.data.map(row => row.name)).toContain('unaccounted:Electricity');
      expect(flow.data.map(row => row.name)).toContain('unaccounted:Natural Gas');
      expect(flow.links!.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(180, 8);
      expect(view.root.querySelectorAll('.facility-footprint__group')).toHaveLength(1);
      expect(view.root.querySelector('.facility-footprint__table-scroll')?.textContent).toContain('No energy-use groups assigned to this source');
      expect(JSON.stringify(view.store.snapshot())).toBe(before);
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/facility-energy-balance-light.png' });
      for (const theme of ['v1-theme-dark', 'v1-theme-dark v1-contrast-strong']) {
        await page.viewport(390, 1200); view.root.className = `v1-root ${theme}`; await view.settle();
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
        const label = balance().querySelector<HTMLElement>('dt')!;
        expect(textContrast(label, label.parentElement!)).toBeGreaterThanOrEqual(4.5);
        await page.screenshot({ element: balance(), path: `../../../../../../../tmp/energy-use-results/facility-energy-balance-${theme.includes('contrast') ? 'contrast' : 'dark'}.png` });
      }
      await page.viewport(1400, 1200); view.root.className = 'v1-root';
      await media.send('Emulation.setEmulatedMedia', { media: 'print' }); await view.settle();
      expect(getComputedStyle(view.root.querySelector<HTMLElement>('.facility-footprint__table-scroll')!).overflowX).toBe('visible');
      await page.screenshot({ element: balance(), path: '../../../../../../../tmp/energy-use-results/facility-energy-balance-print.png' });
      await media.send('Emulation.setEmulatedMedia', { media: '', features: [] }); await view.settle();
      view.store.publish({ ...snapshot, energyUseEquipment: [] });
      await vi.waitFor(async () => { await view.settle(); expect(balance()?.textContent).toContain('0% accounted for'); });
      expect(view.chart().series[0].links!.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(180, 8);
      view.store.publish({ ...snapshot, meterData: readings.filter(row => row.meterId !== 'electric' || row.month !== 5) });
      await vi.waitFor(async () => { await view.settle(); expect(balance()?.textContent).toContain('11 of 12 meter-months'); });
      expect(balance().querySelector('dl')?.textContent).toMatch(/Unaccounted\s*Unavailable/);
      expect(view.chart().series[0].data.map(row => row.name)).not.toContain('unaccounted:Electricity');
      view.store.publish({ ...snapshot, energyUseEquipment: [resultsEquipment('equipment', 2022, 200)] });
      await vi.waitFor(async () => { await view.settle(); expect(balance()?.textContent).toContain('Equipment use exceeds metered consumption'); });
      expect(balance().querySelector('dl')?.textContent).toMatch(/Over allocated\s*20/);
      expect(view.chart().series[0].links!.every(link => link.value > 0)).toBe(true);
      await page.screenshot({ element: view.root, path: '../../../../../../../tmp/energy-use-results/facility-energy-balance-over-allocated.png' });
    } finally { await media.send('Emulation.setEmulatedMedia', { media: '', features: [] }); view.destroy(); }
  });
});
