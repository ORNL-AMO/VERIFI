import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { DataValidationSettingsEditor } from '../data-validation-settings-editor.service';
import { configureDataValidationSettingsTest } from '../data-validation-settings.testing';
import { DataValidationSettingsPanelComponent } from './data-validation-settings-panel.component';

describe('Data Validation account-copy confirmation', () => {
  it('portals the confirmation and changes only the confirmed group', async () => {
    const { account, facility, facilityUpdate } = configureDataValidationSettingsTest();
    account.set({ ...account(), expectedRangeSettings: { enabled: false } });
    facility.set({ ...facility(), expectedRangeSettings: { enabled: true, useAccountSettings: false } });
    const portal = { show: vi.fn(), hide: vi.fn() };
    TestBed.configureTestingModule({ imports: [DataValidationSettingsPanelComponent], providers: [{ provide: ModalPortalService, useValue: portal }] });
    const editor = TestBed.inject(DataValidationSettingsEditor);
    editor.initialize(true);
    const fixture = TestBed.createComponent(DataValidationSettingsPanelComponent);
    fixture.componentRef.setInput('editor', editor);
    fixture.componentRef.setInput('facilityContext', true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[aria-label="Expected-range warnings"] button') as HTMLButtonElement;
    button.click();
    expect(portal.show).toHaveBeenCalledTimes(1);
    expect(facilityUpdate).not.toHaveBeenCalled();
    fixture.componentInstance.cancelAccountUpdateConfirm();
    expect(facilityUpdate).not.toHaveBeenCalled();
    button.click();
    fixture.componentInstance.confirmAccountSettingsUpdate();
    await editor.save('expectedRange');
    expect(facility().expectedRangeSettings).toEqual({ enabled: false, useAccountSettings: true });
    expect(facility().dataStalenessSettings).toEqual({ enabled: true, thresholdMonths: 3, useAccountSettings: true });
    expect(portal.hide).toHaveBeenCalledTimes(2);
  });
});
