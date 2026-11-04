import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, meter } from '@app/v1/data/meters/facility-meters.testing';
import { ImportMeterEditorComponent } from './import-meter-editor.component';

describe('ImportMeterEditorComponent', () => {
  it.each([12345, '0012345', 'A-0123'])('keeps imported account identifier %s and saved units when another field changes', accountNumber => {
    const fixture = setup(accountNumber);
    const saved = vi.fn(); fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.form.controls.name.setValue('Reviewed meter');
    fixture.componentInstance.save();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ meter: expect.objectContaining({
      name: 'Reviewed meter', accountNumber, startingUnit: 'DTherms', energyUnit: 'DTherms', groupId: 'import-group-guid'
    }) }));
  });

  it('retains dirty edits when contextual inputs refresh', () => {
    const fixture = setup('00123');
    const form = fixture.componentInstance.form;
    form.controls.name.setValue('Local name'); form.markAsDirty();
    fixture.componentRef.setInput('facility', facility({ volumeGasUnit: 'SCF', energyUnit: 'GJ' }));
    fixture.componentRef.setInput('metersWithPersistedReadings', ['meter-a']); fixture.detectChanges();
    expect(fixture.componentInstance.form).toBe(form);
    expect(form.controls.name.value).toBe('Local name');
    expect(form.controls.startingUnit.value).toBe('DTherms');
    expect(form.controls.startingUnit.disabled).toBe(true);
  });

  it('uses a portal confirmation to keep or discard a staged meter edit on close', async () => {
    const fixture = setup('00123');
    const close = vi.fn(); fixture.componentInstance.cancelled.subscribe(close);
    const show = vi.spyOn(TestBed.inject(ModalPortalService), 'show');
    fixture.componentInstance.form.controls.name.setValue('Local name'); fixture.componentInstance.form.markAsDirty();
    const cancelled = fixture.componentInstance.requestClose();
    expect(show).toHaveBeenCalledOnce();
    fixture.componentInstance.resolveDiscard(false); await cancelled; expect(close).not.toHaveBeenCalled();
    const confirmed = fixture.componentInstance.requestClose();
    fixture.componentInstance.resolveDiscard(true); await confirmed; expect(close).toHaveBeenCalledOnce();
  });
});

function setup(accountNumber: number | string) {
  const facilityValue = facility({ volumeGasUnit: 'SCF', energyUnit: 'MMBtu' });
  const fixture = TestBed.configureTestingModule({ imports: [ImportMeterEditorComponent], providers: [{
    provide: AccountWorkspaceStore, useValue: { account: () => account(), selectedFacility: () => facilityValue, facilities: () => [facilityValue] }
  }] }).createComponent(ImportMeterEditorComponent);
  fixture.componentRef.setInput('meter', meter({ source: 'Natural Gas', scope: 1, accountNumber, startingUnit: 'DTherms', energyUnit: 'DTherms', groupId: 'import-group-guid' }));
  fixture.componentRef.setInput('facility', facilityValue);
  fixture.componentRef.setInput('account', account());
  fixture.detectChanges();
  return fixture;
}
