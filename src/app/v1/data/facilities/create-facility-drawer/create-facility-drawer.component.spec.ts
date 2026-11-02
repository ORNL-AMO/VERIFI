import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAccount } from '@data/models/idbModels/account';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { DataModule } from '@app/v1/data/data.module';
import { FacilityActionsService } from '../facility-actions.service';
import { CreateFacilityDrawerComponent } from './create-facility-drawer.component';

describe('CreateFacilityDrawerComponent', () => {
  let fixture: ComponentFixture<CreateFacilityDrawerComponent>;
  let portfolioFacilities: { createFacility: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let closed: ReturnType<typeof vi.fn>;
  let created: ReturnType<typeof vi.fn<(facility: IdbFacility) => void>>;
  let activeAccount: ReturnType<typeof signal<IdbAccount>>;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    portfolioFacilities = {
      createFacility: vi.fn(async () => ({ guid: 'facility-new', accountId: 'account-a', name: 'New Facility' } as IdbFacility))
    };
    activeAccount = signal({ ...getNewIdbAccount(), guid: 'account-a', name: 'Account A', city: 'Oak Ridge', state: 'TN' });
    router = { navigate: vi.fn(async () => true) };
    TestBed.configureTestingModule({
      imports: [DataModule],
      providers: [
        SettingsFormService,
        { provide: FacilityActionsService, useValue: portfolioFacilities },
        { provide: AccountWorkspaceStore, useValue: { account: activeAccount, canWrite: () => true, hasPending: () => false } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            account: activeAccount,
            facilitySettingsRoute: (facilityGuid: string, detail = 'profile') => [
              '/v1',
              'workspace',
              'facility',
              facilityGuid,
              'settings',
              detail
            ]
          }
        },
        { provide: Router, useValue: router }
      ]
    });
    fixture = TestBed.createComponent(CreateFacilityDrawerComponent);
    closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    created = vi.fn<(facility: IdbFacility) => void>(); fixture.componentInstance.created.subscribe(created);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires only facility name before creating', async () => {
    await fixture.componentInstance.createFacility();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Name is required');
    expect(portfolioFacilities.createFacility).not.toHaveBeenCalled();
  });

  it('uses the create account drawer structure instead of a settings panel body', () => {
    const drawerLayer: HTMLElement | null = fixture.nativeElement.querySelector('.v1-drawer-layer');
    const drawerBody: HTMLElement | null = fixture.nativeElement.querySelector('.v1-drawer__body');
    const form: HTMLFormElement | null = fixture.nativeElement.querySelector('form.v1-form');
    const description: HTMLElement | null = fixture.nativeElement.querySelector('#v1-create-facility-description');

    expect(drawerLayer).toBeTruthy();
    expect(drawerBody).toBeTruthy();
    expect(form).toBeTruthy();
    expect(description?.textContent).toContain('Start with a facility name');
    expect(form?.getAttribute('aria-describedby')).toBe('v1-create-facility-description');
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).classList.contains('v1-btn--action')).toBe(true);
    expect(fixture.nativeElement.querySelector('form.v1-settings-panel')).toBeNull();
  });

  it('keeps create disabled when the facility name control has a nullable value', () => {
    fixture.componentInstance.form.controls['name'].setValue(null);
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(submitButton.disabled).toBe(true);
  });

  it('creates with name-only defaults when optional profile details stay collapsed', async () => {
    fixture.componentInstance.form.controls['name'].setValue('  New Plant  ');

    await fixture.componentInstance.createFacility();

    expect(portfolioFacilities.createFacility).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Plant',
      includeProfileDetails: false
    }));
    expect(created).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ guid: 'facility-new', accountId: 'account-a' }));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });

  it('passes optional profile details when expanded', async () => {
    fixture.componentInstance.toggleProfileDetails();
    fixture.componentInstance.form.patchValue({
      name: 'New Plant',
      city: 'Knoxville',
      classification: 'Warehouse'
    });

    await fixture.componentInstance.createFacility();

    expect(portfolioFacilities.createFacility).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Plant',
      includeProfileDetails: true,
      city: 'Knoxville',
      classification: 'Warehouse'
    }));
  });

  it('keeps entered values visible when creation fails', async () => {
    portfolioFacilities.createFacility.mockRejectedValueOnce(new Error('failed'));
    fixture.componentInstance.form.controls['name'].setValue('Unsaved Plant');

    await fixture.componentInstance.createFacility();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls['name'].value).toBe('Unsaved Plant');
    expect(fixture.nativeElement.textContent).toContain('Facility could not be created');
    expect(closed).not.toHaveBeenCalled();
    expect(created).not.toHaveBeenCalled();
    await fixture.componentInstance.createFacility();
    expect(created).toHaveBeenCalledOnce();
  });

  it.each(['destroyed', 'account-switched'] as const)('suppresses a completed facility output when the drawer is %s', async reason => {
    let complete!: (facility: IdbFacility) => void;
    portfolioFacilities.createFacility.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    fixture.componentInstance.form.controls['name'].setValue('Committed Plant');
    const saving = fixture.componentInstance.createFacility();
    await fixture.componentInstance.createFacility();
    expect(portfolioFacilities.createFacility).toHaveBeenCalledOnce();
    if (reason === 'destroyed') fixture.destroy();
    else activeAccount.set({ ...activeAccount(), guid: 'account-b' });
    complete({ guid: 'facility-new', accountId: 'account-a', name: 'Committed Plant' } as IdbFacility);
    await saving;
    expect(created).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not report a late persistence failure after destruction', async () => {
    let fail!: (error: Error) => void;
    portfolioFacilities.createFacility.mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    fixture.componentInstance.form.controls['name'].setValue('Committed Plant');
    const saving = fixture.componentInstance.createFacility();
    fixture.destroy(); fail(new Error('Late failure')); await saving;
    expect(fixture.componentInstance.createError).toBe('');
    expect(created).not.toHaveBeenCalled();
  });

  describe('drawer focus lifecycle', () => {
    function dispatchKey(el: HTMLElement, key: string): void {
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }

    it('emits closed when Escape is pressed on the drawer', () => {
      const aside = fixture.nativeElement.querySelector('aside') as HTMLElement;

      dispatchKey(aside, 'Escape');

      expect(closed).toHaveBeenCalled();
    });

    it('does not emit closed on Escape while creating', () => {
      fixture.componentInstance.isCreating = true;
      const aside = fixture.nativeElement.querySelector('aside') as HTMLElement;

      dispatchKey(aside, 'Escape');

      expect(closed).not.toHaveBeenCalled();
    });
  });
});
