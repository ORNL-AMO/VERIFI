import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { SettingsFieldsComponent } from './settings-fields.component';
import { EnergyUseSettingsFormService } from '../energy-use-settings-form.service';
import { energyUseSettings } from '../../models/energy-use-settings.models';
import { energyUseItem } from '../../energy-uses.testing';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';

describe('Energy Use shared fields', () => {
  it('uses typed source actions and theme-aware selects without replacing saved setup', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(SettingsFieldsComponent), form = new EnergyUseSettingsFormService().build(energyUseSettings(energyUseItem({ utilityMeterGroupIds: [] })));
    fixture.componentRef.setInput('form', form); fixture.componentRef.setInput('accountGuid', 'account-a'); fixture.componentRef.setInput('facilityGuid', 'facility-a');
    fixture.componentRef.setInput('editorKey', 'account-a:facility-a:energy-a');
    fixture.detectChanges(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('select:not(.v1-select)')).toHaveLength(0);
    const units = fixture.nativeElement.querySelector('select[formControlName="units"]') as HTMLSelectElement;
    expect(units.classList.contains('input-group-text')).toBe(true);
    expect(units.querySelector('option[value="MMBtuhr"]')?.textContent?.trim()).toBe('MMBtu/hr');
    expect(fixture.nativeElement.querySelector('input[formControlName="numberOfEquipment"]')?.closest('label')?.textContent).toContain('# of Equipment');
    const confirmed = vi.fn(); fixture.componentInstance.utilitiesConfirmed.subscribe(confirmed);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.textContent?.includes('Select Utilities')) as HTMLButtonElement;
    expect(fixture.componentInstance.sourceRows()[0].icon).toBe('electricity');
    button.click(); fixture.detectChanges();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    expect(confirmed).not.toHaveBeenCalled();
    const selection = { baseline: form.controls.sources.getRawValue(), selected: ['Electricity', 'Natural Gas'] as const };
    fixture.componentInstance.confirmUtilities(selection); expect(confirmed).toHaveBeenCalledWith(selection);
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(form.controls.sources.getRawValue()).toEqual(energyUseSettings(energyUseItem()).sources);
  });
  it.each(['utilities', 'meter-groups'] as const)('rejects an obsolete %s confirmation before the identity-change effect runs', kind => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(SettingsFieldsComponent);
    const form = new EnergyUseSettingsFormService().build(energyUseSettings(energyUseItem({ utilityMeterGroupIds: [] })));
    for (const [name, value] of Object.entries({ form, editorKey: 'account-a:facility-a:energy-a', accountGuid: 'account-a', facilityGuid: 'facility-a' })) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    const confirmed = vi.fn();
    fixture.componentInstance.utilitiesConfirmed.subscribe(confirmed); fixture.componentInstance.meterGroupsConfirmed.subscribe(confirmed);
    if (kind === 'utilities') fixture.componentInstance.openUtilities(); else fixture.componentInstance.openMeterGroups();
    fixture.detectChanges();
    form.controls.notes.setValue('Independent metadata change'); fixture.detectChanges();
    expect(fixture.componentInstance.drawer()).toBe(kind);
    const utilities = { baseline: form.controls.sources.getRawValue(), selected: ['Electricity', 'Natural Gas'] as const };
    fixture.componentRef.setInput('editorKey', 'account-a:facility-a:energy-b');
    // Reject immediately, without relying on another render to close the panel.
    if (kind === 'utilities') fixture.componentInstance.confirmUtilities(utilities);
    else fixture.componentInstance.confirmMeterGroups({ baseline: [], selected: [], utilities });
    expect(confirmed).not.toHaveBeenCalled();
    expect(fixture.componentInstance.drawer()).toBeUndefined();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(form.controls.sources.length).toBe(1);
  });
});
