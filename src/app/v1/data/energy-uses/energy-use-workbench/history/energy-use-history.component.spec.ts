import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem, energyUseSource, energyUsesSnapshot } from '../../energy-uses.testing';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseHistoryComponent } from './energy-use-history.component';
describe('Item History read model', () => {
  it('renders saved and carried values through the latest account year without writing annual rows', () => {
    vi.spyOn(EChartsChartDirective.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    const snapshot = energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'later', utilityData: [energyUseSource({ energyUse: [{ year: 2026, energyUse: 50, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })]);
    const facility = { ...snapshot.facilities[0], energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
    const entry = signal({ item: snapshot.energyUseEquipment[0], facility });
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: EnergyUseWorkbenchContextService, useValue: { entry } }] });
    TestBed.inject(AccountWorkspaceStore).publish(snapshot);
    const fixture = TestBed.createComponent(EnergyUseHistoryComponent); fixture.detectChanges();
    expect(fixture.componentInstance.details().map(row => row.year)).toEqual([2024, 2025, 2026]);
    expect(fixture.nativeElement.textContent).toContain('Carried forward from FY 2024');
    expect(snapshot.energyUseEquipment[0].utilityData[0].energyUse).toHaveLength(1); vi.restoreAllMocks();
  });
});
