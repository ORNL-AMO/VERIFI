import { EnergyUseHistoryComponent } from '../../energy-use-workbench/history/energy-use-history.component';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench/energy-use-workbench-context.service';
import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem, energyUseSource, energyUseGroup, energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseInventory } from '../energy-use-inventory.models';
import { EnergyUseChartsComponent } from './energy-use-charts.component';
@Component({ standalone: true, imports: [EnergyUsesModule, PortalModule], template: '<main class="v1-root"><app-energy-use-charts [entries]="entries" [ready]="true"/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class ChartHost {
  readonly modal = inject(ModalPortalService);
  readonly store = inject(AccountWorkspaceStore);
  readonly entries = buildEnergyUseInventory(this.store.account()!.guid, this.store.facilities(), this.store.energyUseEquipment(), this.store.energyUseGroups());
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
      expect(component.rows()).toHaveLength(1000); expect(component.tree()[0].value).toBe(99950);
      expect(root.querySelector('canvas')).not.toBeNull();
      expect(root.textContent).toContain('Includes carried-forward values');
      await page.getByRole('button', { name: 'Explore 2025-01-01 / 2025-12-31', exact: true }).click(); await settle();
      expect(component.active()?.kind).toBe('period');
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-high-contrast']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`; await settle();
        const panel = root.querySelector('#inventory-chart-sheet') as HTMLElement;
        expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(width + 1);
        await page.screenshot({ element: root, path: `./__screenshots__/phase4-map-${width}-${theme || 'light'}.png` });
      }
      const reset = page.getByRole('button', { name: 'Reset drilldown', exact: true }); await reset.click();
      await userEvent.keyboard('{Tab}'); expect(root.contains(document.activeElement)).toBe(true);
      component.close(); await settle(); expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
      expect(JSON.stringify(store.snapshot())).toBe(before);
    } finally { fixture.destroy(); }
  });
  it('renders annual History with entered and carried values through a later account year', async () => {
    const item = energyUseItem({ utilityData: [energyUseSource({ energyUse: [{ year: 2022, energyUse: 100, energyUseUnit: 'kWh', overrideEnergyUse: true },
      { year: 2024, energyUse: 75, energyUseUnit: 'kWh', overrideEnergyUse: false }] })] });
    const base = energyUsesSnapshot([item, energyUseItem({ guid: 'later', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 50, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })]);
    const facility = { ...base.facilities[0], energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: EnergyUseWorkbenchContextService, useValue: { entry: signal({ item, facility }) } }] });
    TestBed.inject(AccountWorkspaceStore).publish(base);
    const fixture = TestBed.createComponent(EnergyUseHistoryComponent); fixture.nativeElement.className = 'v1-root';
    try {
      await page.viewport(1200, 850); fixture.detectChanges(); await fixture.whenStable();
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
      expect(fixture.componentInstance.details().map(row => row.amount)).toEqual([100, 100, 75, 75]);
      expect(fixture.nativeElement.textContent).toContain('Carried forward from FY 2024');
      await page.screenshot({ element: fixture.nativeElement, path: './__screenshots__/phase4-history.png' });
    } finally { fixture.destroy(); }
  });

});
