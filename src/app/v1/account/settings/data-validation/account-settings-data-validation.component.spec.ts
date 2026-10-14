import { TestBed } from '@angular/core/testing';
import { DataValidationSettingsPanelComponent } from '@app/v1/shared/settings/data-validation-settings-panel/data-validation-settings-panel.component';
import { configureDataValidationSettingsTest } from '@app/v1/shared/settings/data-validation-settings.testing';
import { AccountSettingsDataValidationComponent } from './account-settings-data-validation.component';

describe('account Data Validation settings', () => {
  it('autosaves a labeled expected-range control without affecting staleness or adding inheritance', async () => {
    const { account, accountUpdate } = configureDataValidationSettingsTest();
    TestBed.configureTestingModule({ declarations: [AccountSettingsDataValidationComponent], imports: [DataValidationSettingsPanelComponent] });
    const fixture = TestBed.createComponent(AccountSettingsDataValidationComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[aria-label="Expected-range warnings"] input[formControlName="enabled"]');
    expect(input.closest('label')?.textContent).toContain('Enable expected-range warnings');
    expect(input.disabled).toBe(false);
    input.click();
    await fixture.componentInstance.editor.save('expectedRange');
    fixture.detectChanges();
    expect(account().expectedRangeSettings).toEqual({ enabled: false });
    expect(account().dataStalenessSettings?.enabled).toBe(true);
    expect(accountUpdate).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Saved');
    expect(fixture.nativeElement.querySelector('[formControlName="useAccountSettings"]')).toBeNull();
  });
});
