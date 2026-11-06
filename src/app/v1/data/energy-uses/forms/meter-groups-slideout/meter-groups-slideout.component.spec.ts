import { TestBed } from '@angular/core/testing';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { EnergyUsesModule } from '../../energy-uses.module';
import { defaultEnergyUseSource } from '../../models/energy-use-settings.models';
import { MeterGroupsSlideoutComponent } from './meter-groups-slideout.component';

describe('Energy Use meter-group selection', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(MeterGroupsSlideoutComponent);
    const groups = ['electric-a', 'electric-b', 'gas-a'].map(guid => ({ ...getNewIdbUtilityMeterGroup('Energy', guid, 'facility-a', 'account-a'), guid }));
    const meters = groups.map(group => ({ guid: `${group.guid}-meter`, accountId: 'account-a', facilityId: 'facility-a', groupId: group.guid,
      source: group.guid === 'gas-a' ? 'Natural Gas' : 'Electricity' } as IdbUtilityMeter));
    fixture.componentRef.setInput('accountGuid', 'account-a'); fixture.componentRef.setInput('facilityGuid', 'facility-a');
    fixture.componentRef.setInput('groups', groups); fixture.componentRef.setInput('meters', meters);
    fixture.componentRef.setInput('sources', [defaultEnergyUseSource()]); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, groups, meters };
  }
  it('derives the utility selection from groups only after confirmation', () => {
    const { fixture, component } = setup(), confirmed = vi.fn(); component.confirmed.subscribe(confirmed);
    component.form.controls['gas-a'].setValue(true); fixture.detectChanges();
    expect(component.sources()).toEqual([defaultEnergyUseSource()]); expect(component.linkedIds()).toEqual([]);
    expect(confirmed).not.toHaveBeenCalled(); component.confirm();
    expect(confirmed).toHaveBeenCalledWith({ baseline: [], selected: ['gas-a'],
      utilities: { baseline: [defaultEnergyUseSource()], selected: ['Natural Gas'] } });
  });
  it('allows one group per utility source and permits different utilities together', () => {
    const { fixture, component } = setup();
    component.form.controls['electric-a'].setValue(true); fixture.detectChanges();
    expect(component.form.controls['electric-b'].disabled).toBe(true);
    expect(component.form.controls['gas-a'].enabled).toBe(true);
    component.form.controls['gas-a'].setValue(true); fixture.detectChanges();
    expect(component.canConfirm()).toBe(true);
  });
  it('blocks an obsolete selection without changing its draft or saved links', () => {
    const { fixture, component } = setup(), confirmed = vi.fn(); component.confirmed.subscribe(confirmed);
    component.form.controls['gas-a'].setValue(true); fixture.detectChanges();
    fixture.componentRef.setInput('linkedIds', ['electric-a']); fixture.detectChanges();
    expect(component.stale()).toBe(true); expect(component.selected()).toEqual(['gas-a']);
    component.confirm(); expect(confirmed).not.toHaveBeenCalled();
  });
});
