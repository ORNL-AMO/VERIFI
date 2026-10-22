import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, group, meter } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';
import { MeterDraftSlideoutComponent } from '@app/v1/facility/data/meters/meters-dashboard/meter-dashboard-slideout/meter-draft-slideout/meter-draft-slideout.component';
import { CreateMeterDrawerComponent } from './create-meter-drawer.component';

const draft = { name: 'Main Electric', source: 'Electricity' as const };

describe('CreateMeterDrawerComponent', () => {
  function setup(single = false) {
    const facilities = signal([facility(), ...(single ? [] : [facility({ guid: 'facility-b', name: 'Beta' })])]);
    const canWrite = signal(true);
    const hasPending = signal(false);
    const activeAccount = signal(account());
    const actions = { createMeter: vi.fn().mockResolvedValue(meter({ guid: 'created', facilityId: 'facility-b' })) };
    TestBed.configureTestingModule({
      declarations: [CreateMeterDrawerComponent],
      imports: [ReactiveFormsModule, MeterDraftSlideoutComponent],
      providers: [{ provide: AccountWorkspaceStore, useValue: {
        account: activeAccount, facilities, canWrite, hasPending,
        meterGroups: signal([group({ guid: 'group-a' }), group({ guid: 'group-b', facilityId: 'facility-b', name: 'Beta group' })])
      } }]
    }).overrideComponent(CreateMeterDrawerComponent, { set: { providers: [{ provide: MetersDashboardActionsService, useValue: actions }] } });
    const fixture = TestBed.createComponent(CreateMeterDrawerComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const form = fixture.debugElement.query(By.directive(MeterDraftSlideoutComponent)).componentInstance as MeterDraftSlideoutComponent;
    const submit = () => [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.type === 'submit') as HTMLButtonElement;
    return { fixture, component, form, submit, actions, facilities, canWrite, hasPending, activeAccount };
  }

  it('requires a facility and meter name, filters groups and clears stale selections when switching facilities', () => {
    const { fixture, component, form, submit } = setup();
    form.form.controls.name.setValue(draft.name);
    fixture.detectChanges();
    expect(submit().disabled).toBe(true);
    const selector = fixture.nativeElement.querySelector('[meterContext] select') as HTMLSelectElement;
    selector.value = 'facility-a';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(form.groups.map(item => item.guid)).toEqual(['group-a']);
    expect(submit().disabled).toBe(false);
    form.form.controls.groupId.setValue('group-a');
    component.facilityControl.setValue('facility-b');
    fixture.detectChanges();
    expect(form.groups.map(item => item.guid)).toEqual(['group-b']);
    expect(form.form.controls.groupId.value).toBeUndefined();
    expect(selector.classList.contains('v1-select')).toBe(true);
  });

  it('uses the chosen facility, blocks repeat submissions and emits the successfully created meter', async () => {
    const { fixture, component, form, submit, actions } = setup();
    const created = vi.fn();
    component.created.subscribe(created);
    component.facilityControl.setValue('facility-b');
    form.form.controls.name.setValue(draft.name);
    fixture.detectChanges();
    let resolve!: (value: ReturnType<typeof meter>) => void;
    actions.createMeter.mockImplementation(() => new Promise(done => { resolve = done; }));
    const saving = component.createMeter(draft);
    await component.createMeter(draft);
    fixture.detectChanges();
    expect(submit().disabled).toBe(true);
    expect(component.facilityControl.disabled).toBe(true);
    expect(form.form.controls.name.disabled).toBe(true);
    expect(actions.createMeter).toHaveBeenCalledExactlyOnceWith(draft, 'facility-b');
    resolve(meter({ guid: 'created', facilityId: 'facility-b' }));
    await saving;
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ guid: 'created', facilityId: 'facility-b' }));
  });

  it('keeps the form open with the draft after a failed save and supports retry', async () => {
    const { fixture, component, form, actions } = setup(true);
    expect(component.facilityControl.value).toBe('facility-a');
    form.form.controls.name.setValue(draft.name);
    actions.createMeter.mockRejectedValueOnce(new Error('Could not save meter'));
    await component.createMeter(draft);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not save meter');
    expect(form.form.controls.name.value).toBe(draft.name);
    expect(form.form.controls.name.enabled).toBe(true);
    await component.createMeter(draft);
    expect(actions.createMeter).toHaveBeenCalledTimes(2);
  });

  it('prevents saves for deleted facilities, read-only or pending workspaces, and changed accounts', async () => {
    const { fixture, component, facilities, canWrite, hasPending, activeAccount, actions } = setup();
    component.facilityControl.setValue('facility-b');
    facilities.set([facility()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('This facility is no longer available');
    await component.createMeter(draft);
    component.facilityControl.setValue('facility-a');
    canWrite.set(false);
    await component.createMeter(draft);
    canWrite.set(true);
    hasPending.set(true);
    await component.createMeter(draft);
    hasPending.set(false);
    activeAccount.set(account({ guid: 'account-b' }));
    await component.createMeter(draft);
    expect(actions.createMeter).not.toHaveBeenCalled();
  });
});
