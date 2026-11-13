import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { cdp, page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { echarts } from '@app/v1/shared/charts/echarts';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem, energyUseSource, energyUseGroup, energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseInventory } from '../energy-use-inventory.models';
import { EnergyUseChartsComponent } from './energy-use-charts.component';
@Component({ standalone: true, imports: [EnergyUsesModule, PortalModule], template: '<main class="v1-root"><app-energy-use-charts [entries]="entries()" [facilityGuid]="facilityGuid()" [ready]="true"/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class ChartHost {
  readonly modal = inject(ModalPortalService);
  readonly store = inject(AccountWorkspaceStore);
  readonly facilityGuid = signal<string | undefined>(undefined);
  readonly shownGuids = signal<readonly string[] | undefined>(undefined);
  readonly entries = computed(() => buildEnergyUseInventory(this.store.account()!.guid, this.store.facilities(), this.store.energyUseEquipment(), this.store.energyUseGroups())
    .filter(entry => !this.shownGuids() || this.shownGuids()!.includes(entry.guid)));
}
describe('Energy Use treemap in Chromium', () => {
  it('renders period branches, preserves committed records, and supports themed narrow keyboard navigation', async () => {
    TestBed.configureTestingModule({ imports: [ChartHost], providers: [provideRouter([])] });
    const store = TestBed.inject(AccountWorkspaceStore);
    const base = energyUsesSnapshot(Array.from({ length: 1000 }, (_, index) => energyUseItem({ guid: `energy-${index}`, energyUseGroupId: `group-${Math.floor(index / 10)}`,
      name: `Equipment ${index}`, utilityData: [energyUseSource({ energyUse: [{ year: index === 999 ? 2025 : 2022, energyUse: index === 999 ? 50 : 100, overrideEnergyUse: true, energyUseUnit: 'kWh' }] })] })));
    const snapshot = { ...base, account: { ...base.account, energyUnit: 'kWh' }, facilities: base.facilities.map(facility => ({ ...facility, fiscalYear: 'calendarYear' as const, energyUnit: 'kWh' })),
      energyUseGroups: Array.from({ length: 100 }, (_, index) => energyUseGroup({ guid: `group-${index}`, name: `Group ${index}` })) };
    store.publish(snapshot); const before = JSON.stringify(store.snapshot());
    const fixture = TestBed.createComponent(ChartHost); fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(EnergyUseChartsComponent)).componentInstance as EnergyUseChartsComponent;
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); fixture.detectChanges(); };
    try {
      await page.viewport(1200, 850); await page.getByRole('button', { name: 'Charts', exact: true }).click(); await settle();
      await vi.waitFor(() => expect(root.querySelector('#inventory-chart-sheet')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(851));
      expect(component.rows()).toHaveLength(1000); expect(component.tree()[0].value).toBe(99950);
      expect(root.querySelector('canvas')).not.toBeNull();
      expect(root.textContent).toContain('Includes carried-forward values');
      const plot = root.querySelector<HTMLElement>('.energy-use-charts__plot')!;
      const accessible = root.querySelector<HTMLElement>('.energy-use-charts__accessible')!;
      expect(root.querySelector('.energy-use-charts header, .energy-use-charts select, .energy-use-charts details')).toBeNull();
      expect(accessible.getBoundingClientRect().width).toBeLessThanOrEqual(1);
      expect(plot.clientHeight).toBeGreaterThan(root.querySelector<HTMLElement>('#inventory-chart-sheet')!.clientHeight * .8);
      plot.focus(); await userEvent.keyboard('{Tab}'); await settle();
      expect(accessible.getBoundingClientRect().width).toBeGreaterThan(1);
      await page.getByRole('button', { name: 'Explore Fiscal Year 2025', exact: true }).click(); await settle();
      expect(component.active()?.kind).toBe('period');
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`; await settle();
        const panel = root.querySelector('#inventory-chart-sheet') as HTMLElement;
        expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(width + 1);
        const plot = root.querySelector<HTMLElement>('.energy-use-charts__plot')!;
        const chart = echarts.getInstanceByDom(plot)!;
        const textColors = chart.getZr().storage.getDisplayList().filter(element => element.type === 'tspan')
          .map(element => (element as unknown as { style: { fill: string } }).style.fill);
        expect(textColors).toContain(getComputedStyle(plot).getPropertyValue('--v1-text').trim());
        const labels = chart.getZr().storage.getDisplayList().filter(element => element.type === 'tspan');
        expect(labels.filter(element => (element as unknown as { style: { opacity: number } }).style.opacity === 1).length).toBeGreaterThan(0);
        await page.screenshot({ element: root, path: `../../../../../../../tmp/energy-use-results/treemap-${width}-${theme || 'light'}.png` });
      }
      plot.focus(); await userEvent.keyboard('{Home}'); await settle();
      expect(component.active()).toBeUndefined();
      await userEvent.keyboard('{Tab}'); expect(root.contains(document.activeElement)).toBe(true);
      await userEvent.keyboard('{Escape}'); await vi.waitFor(() => expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull()); await settle();
      expect(document.activeElement?.textContent).toContain('Charts');
      expect(JSON.stringify(store.snapshot())).toBe(before);
    } finally { fixture.destroy(); }
  });

  it('matches the facility treemap with group colors, nested equipment labels and chart-native navigation', async () => {
    TestBed.configureTestingModule({ imports: [ChartHost], providers: [provideRouter([])] });
    const store = TestBed.inject(AccountWorkspaceStore);
    const base = energyUsesSnapshot(Array.from({ length: 12 }, (_, index) => energyUseItem({ guid: `equipment-${index}`, name: index === 0 ? 'Steam Boiler' : `Equipment ${index}`,
      energyUseGroupId: index < 6 ? 'utilities' : 'roasting', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: index === 0 ? 300 : 30, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })));
    store.publish({ ...base, account: { ...base.account, energyUnit: 'kWh' }, facilities: base.facilities.map(facility => ({ ...facility, fiscalYear: 'calendarYear', energyUnit: 'kWh' })),
      energyUseGroups: [energyUseGroup({ guid: 'utilities', name: 'Utilities', color: '#29bb9c' }), energyUseGroup({ guid: 'roasting', name: 'Roasting', color: '#9b59b6' })] });
    const before = JSON.stringify(store.snapshot());
    const fixture = TestBed.createComponent(ChartHost); fixture.componentInstance.facilityGuid.set('facility-a'); fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(EnergyUseChartsComponent)).componentInstance as EnergyUseChartsComponent;
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); fixture.detectChanges(); };
    const media = cdp() as { send(command: string, parameters: Record<string, unknown>): Promise<void> };
    try {
      await page.viewport(1400, 850); await page.getByRole('button', { name: 'Charts', exact: true }).click(); await settle();
      await vi.waitFor(() => expect(root.querySelector('#inventory-chart-sheet')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(851));
      const plot = root.querySelector<HTMLElement>('.energy-use-charts__plot')!;
      const chart = () => echarts.getInstanceByDom(plot)!;
      expect((chart().getOption() as { legend: { show: boolean }[] }).legend[0].show).toBe(false);
      const clickLabel = async (name: string) => {
        const label = chart().getZr().storage.getDisplayList().find(element => element.type === 'tspan'
          && (element as unknown as { style: { text: string } }).style.text === name)!;
        expect(label).toBeDefined();
        const bounds = label.getBoundingRect();
        const [x, y] = label.transformCoordToGlobal(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.elementLocator(plot).click({ position: { x, y } }); await settle();
      };
      for (const [width, theme] of [[1400, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`; await settle();
        expect(root.querySelector<HTMLElement>('.energy-use-charts__accessible')!.getBoundingClientRect().width).toBeLessThanOrEqual(1);
        const series = (chart().getOption() as { series: { data: { children: { itemStyle: { color: string }; children: { itemStyle: { color: string } }[] }[] }[] }[] }).series[0];
        expect(series.data[0].children.map(group => group.itemStyle.color)).toEqual(['#29bb9c', '#9b59b6']);
        expect(series.data[0].children.every(group => group.children.every(item => item.itemStyle.color === group.itemStyle.color))).toBe(true);
        const text = chart().getZr().storage.getDisplayList().filter(element => element.type === 'tspan').map(element => (element as unknown as { style: { text: string } }).style.text);
        expect(text).toContain('Steam Boiler'); expect(text.some(value => value.includes('%'))).toBe(true);
        expect(text.some(value => /\d{4}-\d{2}-\d{2}/.test(value))).toBe(false);
        expect(plot.scrollHeight).toBeLessThanOrEqual(plot.clientHeight + 1);
        await page.screenshot({ element: root, path: `../../../../../../../tmp/energy-use-results/treemap-only-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
      await page.viewport(1400, 850); root.className = 'v1-root'; await settle();
      await clickLabel('Utilities'); expect(component.active()?.name).toBe('Utilities');
      plot.focus(); await userEvent.keyboard('{Backspace}'); await settle(); expect(component.active()).toBeUndefined();
      await clickLabel('Roasting'); expect(component.active()?.name).toBe('Roasting');
      await clickLabel('North plant (2025)'); expect(component.active()).toBeUndefined();
      await media.send('Emulation.setEmulatedMedia', { media: 'print' }); await settle();
      expect(getComputedStyle(root.querySelector<HTMLElement>('.workspace-bottom-sheet-layer')!).display).toBe('none');
      await media.send('Emulation.setEmulatedMedia', { media: '', features: [] });
      await page.getByRole('button', { name: 'Close charts', exact: true }).click();
      await vi.waitFor(() => expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull()); await settle();
      expect(document.activeElement?.textContent).toContain('Charts');
      expect(JSON.stringify(store.snapshot())).toBe(before);
    } finally { await media.send('Emulation.setEmulatedMedia', { media: '', features: [] }); fixture.destroy(); }
  });

  it('shows facility/account shares without dates or energy balances and keeps small/filtered shares accurate', async () => {
    TestBed.configureTestingModule({ imports: [ChartHost], providers: [provideRouter([])] });
    const store = TestBed.inject(AccountWorkspaceStore);
    const item = (guid: string, name: string, amount: number, facilityId = 'facility-a') => energyUseItem({ guid, name, facilityId,
      energyUseGroupId: facilityId === 'facility-a' ? 'group-a' : 'group-b',
      utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: amount, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] });
    const base = energyUsesSnapshot([item('main', 'Main', 100), item('rest', 'Rest', 99.6), item('tiny', 'Tiny', .4), item('other', 'Other', 200, 'facility-b')]);
    store.publish({ ...base, account: { ...base.account, energyUnit: 'kWh' }, facilities: base.facilities.map(facility => ({ ...facility, fiscalYear: 'calendarYear', energyUnit: 'kWh' })),
      energyUseGroups: [energyUseGroup({ color: '#29bb9c' }), energyUseGroup({ guid: 'group-b', facilityId: 'facility-b', color: '#9b59b6' })] });
    const before = JSON.stringify(store.snapshot());
    const fixture = TestBed.createComponent(ChartHost); fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); fixture.detectChanges(); };
    try {
      await page.viewport(1400, 900); await page.getByRole('button', { name: 'Charts', exact: true }).click(); await settle();
      await vi.waitFor(() => expect(root.querySelector('#inventory-chart-sheet')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(901));
      const plot = root.querySelector<HTMLElement>('.energy-use-charts__plot')!;
      const chart = () => echarts.getInstanceByDom(plot)!;
      const hover = async (name: string) => {
        const native = chart() as unknown as { getModel(): { getSeriesByIndex(index: number): { getData(): { indexOfName(name: string): number } } } };
        const index = native.getModel().getSeriesByIndex(0).getData().indexOfName(name);
        expect(index).toBeGreaterThanOrEqual(0);
        chart().dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index }); await settle();
        return chart().getZr().storage.getDisplayList().filter(element => element.type === 'tspan')
          .map(element => (element as unknown as { style: { text: string } }).style.text).join('\n');
      };
      const main = await hover('Main');
      expect(main).toContain('50% of Facility Usage'); expect(main).toContain('25% of Account Usage');
      expect(main).not.toContain('Matching Fiscal'); expect(main).not.toContain('Energy Balance'); expect(main).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      await page.screenshot({ element: root, path: '../../../../../../../tmp/energy-use-results/treemap-facility-account-hover.png' });
      const tiny = await hover('Tiny'); expect(tiny).toContain('<1% of Facility Usage'); expect(tiny).toContain('<1% of Account Usage');
      fixture.componentInstance.shownGuids.set(['main']); await settle();
      const filtered = await hover('Main'); expect(filtered).toContain('50% of Facility Usage'); expect(filtered).toContain('25% of Account Usage');
      expect(root.querySelector('.energy-use-charts__accessible')?.textContent).toContain('25% of Account Usage');
      expect(JSON.stringify(store.snapshot())).toBe(before);
    } finally { fixture.destroy(); }
  });
});
