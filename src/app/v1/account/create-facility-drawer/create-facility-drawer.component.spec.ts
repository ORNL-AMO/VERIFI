import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { AccountPortfolioModule } from '../portfolio/account-portfolio.module';
import { PortfolioFacilityService } from '../portfolio/portfolio-facility.service';
import { CreateFacilityDrawerComponent } from './create-facility-drawer.component';

describe('CreateFacilityDrawerComponent', () => {
  let fixture: ComponentFixture<CreateFacilityDrawerComponent>;
  let portfolioFacilities: { createFacility: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let closed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    portfolioFacilities = {
      createFacility: vi.fn(async () => ({ guid: 'facility-new', name: 'New Facility' } as IdbFacility))
    };
    router = { navigate: vi.fn(async () => true) };
    TestBed.configureTestingModule({
      imports: [AccountPortfolioModule],
      providers: [
        SettingsFormService,
        { provide: PortfolioFacilityService, useValue: portfolioFacilities },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            account: signal({
              ...getNewIdbAccount(),
              guid: 'account-a',
              name: 'Account A',
              city: 'Oak Ridge',
              state: 'TN'
            }),
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
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-new',
      'settings',
      'profile'
    ]);
    expect(closed).toHaveBeenCalled();
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
