import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';
import { ImportEquipmentStepComponent } from './import-equipment-step.component';

function setup() {
  const state = createImportWizardStateStub();
  state.draft.update(draft => ({ ...draft, kind: 'footprint-tool', selectedFacilityId: 'facility-1' }));
  state.workspace.meterGroups.set([{ guid: 'gas', accountId: 'account-1', facilityId: 'facility-1', groupType: 'Energy', name: 'Gas meters' }] as never);
  state.workspace.meters.set([{ guid: 'gas-meter', groupId: 'gas', accountId: 'account-1', facilityId: 'facility-1', source: 'Natural Gas' }] as never);
  return renderImportStep(ImportEquipmentStepComponent, state);
}

describe('ImportEquipmentStepComponent', () => {
  it('groups equipment in tables and stages whole-group meter assignments until confirmation', () => {
    const { fixture, state } = setup();
    expect(fixture.nativeElement.querySelector('section h3').textContent).toContain('Process heating');
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('Boiler');
    const component = fixture.componentInstance;
    component.openMeters('use-group-1'); fixture.detectChanges();
    component.meterForm.controls['gas'].setValue(true);
    expect(state.draft().facilityEnergyUseEquipment[0].utilityMeterGroupIds).toEqual([]);
    component.close();
    expect(state.setFootprintEquipmentMapping).not.toHaveBeenCalled();
    component.openMeters('use-group-1'); fixture.detectChanges();
    component.meterForm.controls['gas'].setValue(true);
    component.confirm();
    expect(state.setFootprintEquipmentMapping).toHaveBeenCalledWith(state.draft().facilityEnergyUseEquipment, { meterGroupIds: ['gas'] });
    expect(component.panel()).toBeUndefined();
  });
  it('stages a category independently, and refuses to apply it if the draft equipment changes', () => {
    const { fixture, state } = setup();
    const component = fixture.componentInstance;
    component.openCategory('equipment-1'); component.category.setValue('Steam');
    component.confirm();
    expect(state.setFootprintEquipmentMapping).toHaveBeenCalledWith(state.draft().facilityEnergyUseEquipment, { category: 'Steam' });
    state.setFootprintEquipmentMapping.mockClear();
    component.openCategory('equipment-1'); component.category.setValue('Fan');
    state.draft.update(draft => ({ ...draft, facilityEnergyUseEquipment: draft.facilityEnergyUseEquipment.map(item => ({ ...item, name: 'Changed' })) }));
    fixture.detectChanges(); component.confirm();
    expect(component.stale()).toBe(true);
    expect(state.setFootprintEquipmentMapping).not.toHaveBeenCalled();
  });
});
