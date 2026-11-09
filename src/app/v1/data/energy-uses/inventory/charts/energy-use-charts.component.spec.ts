import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem, energyUseSource, energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseInventory } from '../energy-use-inventory.models';
import { EnergyUseChartsComponent } from './energy-use-charts.component';
describe('Energy Use chart scope and memory', () => {
  it('uses filtered items for totals while retaining the account year horizon and group-specific memory', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const base = energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'newer', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 50, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })]);
    const snapshot = { ...base, account: { ...base.account, energyUnit: 'kWh' }, facilities: base.facilities.map(facility => ({ ...facility, energyUnit: 'kWh', fiscalYear: 'calendarYear' as const })) };
    TestBed.inject(AccountWorkspaceStore).publish(snapshot);
    const fixture = TestBed.createComponent(EnergyUseChartsComponent), component = fixture.componentInstance;
    fixture.componentRef.setInput('entries', buildEnergyUseInventory(snapshot.account.guid, snapshot.facilities, snapshot.energyUseEquipment, snapshot.energyUseGroups).slice(0, 1));
    fixture.componentRef.setInput('ready', true); fixture.componentRef.setInput('facilityGuid', 'facility-a'); fixture.detectChanges();
    component.show(); fixture.detectChanges(); expect(component.year()).toBe(2025); expect(component.rows()).toHaveLength(1); expect(component.rows()[0].sources[0].state).toBe('carried');
    component.yearControl.setValue(2024); fixture.componentRef.setInput('groupGuid', 'other'); fixture.detectChanges(); expect(component.year()).toBe(2025);
    fixture.componentRef.setInput('groupGuid', undefined); fixture.detectChanges(); expect(component.year()).toBe(2024);
  });
});
