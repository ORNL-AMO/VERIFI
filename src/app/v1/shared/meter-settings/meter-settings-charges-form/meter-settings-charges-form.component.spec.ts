import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, meter } from '@app/v1/data/meters/facility-meters.testing';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterSettingsFormService, MeterSettingsRuleContext } from '../meter-settings-form.service';
import { MeterSettingsChargesFormComponent } from './meter-settings-charges-form.component';

describe('MeterSettingsChargesFormComponent', () => {
  it('shows unsupported saved types without changing them and remaps only the row the user edits', () => {
    const plant = facility({ energyUnit: 'MMBtu', volumeGasUnit: 'SCF' });
    TestBed.configureTestingModule({ declarations: [MeterSettingsChargesFormComponent], imports: [ReactiveFormsModule, IconsModule, IconComponent], providers: [
      { provide: AccountWorkspaceStore, useValue: { account: () => account(), selectedFacility: () => plant, facilities: () => [plant] } }
    ] });
    const service = TestBed.inject(MeterSettingsFormService);
    const context: MeterSettingsRuleContext = { account: account(), facility: plant, customFuels: [], customGWPs: [], meterDataExists: false };
    const saved = meter({ source: 'Natural Gas', scope: 1, startingUnit: 'SCF', energyUnit: 'MMBtu', heatCapacity: .001029,
      siteToSource: 1, charges: [
        { guid: 'demand-rider', name: 'Custom demand rider', chargeType: 'demand', displayChargeInTable: true, displayUsageInTable: true },
        { guid: 'usage-rider', name: 'Custom usage rider', chargeType: 'consumption', displayChargeInTable: false, displayUsageInTable: true },
        { guid: 'custom-fee', name: 'Custom service fee', chargeType: 'other', displayChargeInTable: true, displayUsageInTable: false }
      ] });
    const form = service.buildMeterSettingsForm(saved);
    const fixture = TestBed.createComponent(MeterSettingsChargesFormComponent);
    fixture.componentRef.setInput('form', form);
    const refreshViewModel = () => fixture.componentRef.setInput('viewModel', service.buildMeterSettingsViewModel(form, context));
    refreshViewModel();
    const edits = vi.fn();
    fixture.componentInstance.immediateChange.subscribe(kind => {
      edits(kind); service.applyMeterSettingsRuleChange(kind!, form, context); refreshViewModel();
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const selects = Array.from(root.querySelectorAll<HTMLSelectElement>('select[formControlName="chargeType"]'));
    expect(selects[0].selectedOptions[0]?.textContent).toContain('Demand');
    expect(selects[0].getAttribute('aria-invalid')).toBe('true');
    const errorId = selects[0].getAttribute('aria-describedby')!;
    expect(root.querySelector(`#${errorId}`)?.textContent).toContain('Natural Gas');
    expect(root.querySelector(`#${errorId}`)?.textContent).toContain('Choose');
    expect(form.controls.chargesArray.getRawValue()).toEqual(saved.charges);
    expect(form.pristine).toBe(true);
    expect(edits).not.toHaveBeenCalled();

    form.disable({ emitEvent: false });
    refreshViewModel();
    fixture.detectChanges();
    expect(form.errors).toBeNull();
    expect(selects[0].disabled).toBe(true);
    expect(selects[0].selectedOptions[0]?.textContent).toContain('Demand');
    expect(selects[0].getAttribute('aria-invalid')).toBe('true');
    expect(selects[0].getAttribute('aria-describedby')).toBe(errorId);
    expect(root.querySelector(`#${errorId}`)?.textContent).toContain('Natural Gas');
    expect(form.getRawValue().chargesArray).toEqual(saved.charges);
    expect(edits).not.toHaveBeenCalled();
    form.enable({ emitEvent: false });
    refreshViewModel();
    fixture.detectChanges();
    expect(selects[0].disabled).toBe(false);
    expect(selects[0].selectedOptions[0]?.textContent).toContain('Demand');
    expect(form.getRawValue().chargesArray).toEqual(saved.charges);

    const validDemand = Array.from(selects[0].options).find(option => option.textContent?.trim() === 'Demand/MDQ')!;
    selects[0].value = validDemand.value;
    selects[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(form.controls.chargesArray.at(0).getRawValue()).toEqual({ ...saved.charges![0], chargeType: 'demandMDQ' });
    expect(form.controls.chargesArray.at(1).getRawValue()).toEqual(saved.charges![1]);
    expect(form.controls.chargesArray.at(2).getRawValue()).toEqual(saved.charges![2]);
    expect(selects[0].getAttribute('aria-invalid')).toBeNull();
    expect(selects[1].getAttribute('aria-invalid')).toBe('true');
    expect(form.invalid).toBe(true);
    service.removeCharge(form, 1);
    refreshViewModel();
    fixture.detectChanges();
    expect(form.valid).toBe(true);
    expect(form.controls.chargesArray.getRawValue()).toEqual([
      { ...saved.charges![0], chargeType: 'demandMDQ' }, saved.charges![2]
    ]);
  });
});
