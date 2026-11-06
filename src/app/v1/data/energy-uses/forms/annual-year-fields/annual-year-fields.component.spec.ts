import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { AnnualDataFieldsComponent } from '../annual-data-fields/annual-data-fields.component';
import { AnnualYearFieldsComponent } from './annual-year-fields.component';
import { EnergyUseSetupFormService } from '../energy-use-setup-form.service';
import { energyUseSetup } from '../../models/energy-use-setup.models';
import { energyUseItem } from '../../energy-uses.testing';

describe('Reusable annual year fields', () => {
  it('hides management actions in the group wizard and retains manual consumption editing', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const form = TestBed.inject(EnergyUseSetupFormService).build(energyUseSetup(energyUseItem()));
    const parent = TestBed.createComponent(AnnualDataFieldsComponent); parent.componentRef.setInput('form', form); parent.detectChanges();
    const fixture = TestBed.createComponent(AnnualYearFieldsComponent);
    fixture.componentRef.setInput('year', parent.componentInstance.years()[0]); fixture.componentRef.setInput('showManagement', false); fixture.componentRef.setInput('canEdit', true); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Copy year'); expect(fixture.nativeElement.textContent).not.toContain('Remove year');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formcontrolname="energyUse"]');
    expect(input.disabled).toBe(false); expect(input.value).toBe('0');
  });
});
