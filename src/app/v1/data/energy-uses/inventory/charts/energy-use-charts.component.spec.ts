import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem, energyUseSource, energyUsesSnapshot } from '../../energy-uses.testing';
import { buildEnergyUseInventory } from '../energy-use-inventory.models';
import { EnergyUseChartsComponent } from './energy-use-charts.component';

function setup() {
  TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
  const base = energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'newer', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 50, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] }),
    energyUseItem({ guid: 'foreign', facilityId: 'facility-b', utilityData: [energyUseSource({ energyUse: [{ year: 2028, energyUse: 500, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })]);
  const snapshot = { ...base, account: { ...base.account, energyUnit: 'kWh' }, facilities: base.facilities.map(facility => ({ ...facility, energyUnit: 'kWh', fiscalYear: 'calendarYear' as const })) };
  const store = TestBed.inject(AccountWorkspaceStore); store.publish(snapshot);
  const entries = buildEnergyUseInventory(snapshot.account.guid, snapshot.facilities, snapshot.energyUseEquipment, snapshot.energyUseGroups);
  const fixture = TestBed.createComponent(EnergyUseChartsComponent);
  fixture.componentRef.setInput('entries', entries.slice(0, 1)); fixture.componentRef.setInput('ready', true); fixture.componentRef.setInput('facilityGuid', 'facility-a'); fixture.detectChanges();
  fixture.componentInstance.show(); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, entries, store };
}

describe('Energy Use chart scope and memory', () => {
  it('uses filtered items for totals but determines the year horizon from the unfiltered facility, independently of account preferences', () => {
    const { fixture, component, store } = setup();
    expect(component.year()).toBe(2025); expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0].sources[0].state).toBe('carried');
    expect(component.tree()[0].kind).toBe('group');
    fixture.componentRef.setInput('facilityGuid', undefined); fixture.detectChanges();
    expect(component.year()).toBe(2028);
    fixture.componentRef.setInput('facilityGuid', 'facility-a'); fixture.detectChanges(); expect(component.year()).toBe(2025);
    expect(store.energyUseEquipment()[0].utilityData[0].energyUse).toHaveLength(1);
  });

  it('walks breadcrumbs, goes to the parent and recovers when filtering removes a drilled branch', () => {
    const { fixture, component, entries } = setup();
    component.drill(component.tree()[0].id); fixture.detectChanges();
    expect(component.path().map(node => node.kind)).toEqual(['group']);
    component.close(); component.show(); fixture.detectChanges(); expect(component.active()?.kind).toBe('group');
    component.parent(); fixture.detectChanges(); expect(component.active()).toBeUndefined();
    component.drill(component.tree()[0].id); fixture.detectChanges();
    fixture.componentRef.setInput('entries', entries.filter(entry => entry.facility.guid === 'facility-b')); fixture.detectChanges();
    expect(component.nodeId()).toBe(''); expect(component.path()).toEqual([]);
  });

  it('keeps zero and missing values accessible when no treemap area can be drawn', () => {
    const { fixture, component } = setup();
    expect(component.positive()).toBe(false);
    expect(component.links()[0]).toMatchObject({ value: 0, percentOfPeriod: null });
    expect(component.details()[0].amount).toBe(0);
    expect(fixture.componentInstance.option().series).toBeDefined();
  });
});
