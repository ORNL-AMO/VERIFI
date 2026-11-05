import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesModule } from '../energy-uses.module';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { SettingsFieldsComponent } from '../forms/settings-fields/settings-fields.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { energyUseFacility, energyUseGroup, energyUseItem } from '../energy-uses.testing';
import { CreateEnergyUseDrawerComponent } from './create-energy-use-drawer.component';

describe('Energy Use creation drawer', () => {
  function setup(initialFacility?: string) {
    const store = { account: signal({ guid: 'account-a' }), canWrite: signal(true), hasPending: signal(false), facilities: signal([{ ...energyUseFacility(), fiscalYear: 'calendarYear', energyUnit: 'kWh' }]),
      energyUseGroups: signal([energyUseGroup()]), meterGroups: signal([]), meters: signal([]) };
    const actions = { create: vi.fn(async () => energyUseItem()) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions }] });
    const fixture = TestBed.createComponent(CreateEnergyUseDrawerComponent);
    if (initialFacility) fixture.componentRef.setInput('initialFacilityGuid', initialFacility);
    fixture.detectChanges(); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, actions };
  }
  it('requires an explicit portfolio facility and initializes a scoped facility without readings', () => {
    const { fixture, component } = setup(); expect(component.canCreate()).toBe(false);
    component.contextForm.controls.facilityGuid.setValue('facility-a'); fixture.detectChanges(); fixture.detectChanges();
    expect(component.canCreate()).toBe(true); expect(component.contextForm.controls.initialYear.value).toBe(new Date().getFullYear() - 1);
    expect(fixture.nativeElement.textContent).toContain('Rated capacity');
  });
  it.each(['utilities', 'meter-groups'] as const)('closes the %s selection when the creation facility changes without losing the draft', kind => {
    const { fixture, component, store, actions } = setup('facility-a');
    store.facilities.set([...store.facilities(), { ...store.facilities()[0], guid: 'facility-b', name: 'South plant' }]);
    component.form.controls.name.setValue('Draft equipment'); fixture.detectChanges();
    const fields = fixture.debugElement.query(By.directive(SettingsFieldsComponent)).componentInstance as SettingsFieldsComponent;
    const initialKey = fields.editorKey();
    if (kind === 'utilities') fields.openUtilities(); else fields.openMeterGroups();
    fixture.detectChanges(); expect(fields.drawer()).toBe(kind);
    component.contextForm.controls.facilityGuid.setValue('facility-b'); fixture.detectChanges(); fixture.detectChanges();
    expect(fields.editorKey()).not.toBe(initialKey);
    expect(fields.drawer()).toBeUndefined();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(component.form.controls.name.value).toBe('Draft equipment');
    expect(actions.create).not.toHaveBeenCalled();
  });
  it('submits one valid compound draft and retains errors and values after failure', async () => {
    const { fixture, component, actions } = setup('facility-a');
    component.form.controls.name.setValue('New item'); component.contextForm.controls.groupName.setValue('Production');
    actions.create.mockRejectedValueOnce(new Error('Write failed')); await component.submit(); fixture.detectChanges();
    expect(component.error()).toBe('Write failed'); expect(component.form.controls.name.value).toBe('New item'); expect(component.dirty()).toBe(true);
    const created = vi.fn(); component.created.subscribe(created); await component.submit();
    expect(actions.create.mock.calls[1]).toEqual([expect.objectContaining({ initialYear: new Date().getFullYear() - 1, group: { kind: 'new', name: 'Production' } }), 'account-a', 'facility-a', expect.objectContaining({ item: expect.objectContaining({ guid: expect.any(String) }) })]);
    expect(created).toHaveBeenCalledTimes(1); expect(component.dirty()).toBe(false);
  });
  it('protects dirty dismissal and blocks duplicate submits while creating', async () => {
    const { component, actions } = setup('facility-a'); const closed = vi.fn(); component.closed.subscribe(closed);
    component.form.controls.name.setValue('New'); component.contextForm.controls.groupName.setValue('Group');
    component.requestClose(); expect(component.discardOpen()).toBe(true); expect(closed).not.toHaveBeenCalled();
    let complete!: (value: ReturnType<typeof energyUseItem>) => void;
    actions.create.mockImplementationOnce(() => new Promise(resolve => complete = resolve));
    const pending = component.submit(); await component.submit(); component.requestClose();
    expect(actions.create).toHaveBeenCalledTimes(1); expect(closed).not.toHaveBeenCalled();
    complete(energyUseItem()); await pending;
  });
});
