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
});
