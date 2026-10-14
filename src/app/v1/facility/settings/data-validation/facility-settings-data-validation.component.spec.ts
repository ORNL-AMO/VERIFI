import { TestBed } from '@angular/core/testing';
import { DataValidationSettingsPanelComponent } from '@app/v1/shared/settings/data-validation-settings-panel/data-validation-settings-panel.component';
import { configureDataValidationSettingsTest } from '@app/v1/shared/settings/data-validation-settings.testing';
import { FacilitySettingsDataValidationComponent } from './facility-settings-data-validation.component';

describe('facility Data Validation settings', () => {
  it('allows a range override while retaining inherited staleness', async () => {
    const { facility, facilityUpdate } = configureDataValidationSettingsTest();
    TestBed.configureTestingModule({ declarations: [FacilitySettingsDataValidationComponent], imports: [DataValidationSettingsPanelComponent] });
    const fixture = TestBed.createComponent(FacilitySettingsDataValidationComponent);
    fixture.detectChanges();
    const range: HTMLFormElement = fixture.nativeElement.querySelector('[aria-label="Expected-range warnings"]');
    const enabled: HTMLInputElement = range.querySelector('[formControlName="enabled"]')!;
    expect(enabled.disabled).toBe(true);
    (range.querySelector('[formControlName="useAccountSettings"]') as HTMLInputElement).click();
    await fixture.componentInstance.editor.save('expectedRange');
    fixture.detectChanges();
    expect(enabled.disabled).toBe(false);
    enabled.click();
    await fixture.componentInstance.editor.save('expectedRange');
    fixture.detectChanges();
    expect(facility().expectedRangeSettings).toEqual({ enabled: false, useAccountSettings: false });
    expect(fixture.componentInstance.editor.stalenessForm.controls.enabled.disabled).toBe(true);
    expect(facilityUpdate).toHaveBeenCalledTimes(2);
  });
});
