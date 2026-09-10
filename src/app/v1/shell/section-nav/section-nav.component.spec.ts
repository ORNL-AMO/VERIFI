import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { FacilityPickerComponent } from './facility-picker/facility-picker.component';
import { SectionNavComponent } from './section-nav.component';

describe('SectionNavComponent', () => {
  let activeSection: ReturnType<typeof signal<string>>;
  let contextMode: ReturnType<typeof signal<string>>;
  let facilities: ReturnType<typeof signal<ReadonlyArray<{ guid: string; name: string }>>>;
  let selectedFacility: ReturnType<typeof signal<{ guid: string; name: string } | undefined>>;
  let account: ReturnType<typeof signal<{ guid: string; name: string; isSingleFacilityCompany?: boolean; displayEmissions?: boolean }>>;
  let isSingleSiteWorkspace: ReturnType<typeof signal<boolean>>;
  let hasSingleSiteRecovery: ReturnType<typeof signal<boolean>>;
  let singleSiteWorkspaceState: ReturnType<typeof signal<string>>;
  let activeDetail: ReturnType<typeof signal<string>>;
  let activeMeterGuid: ReturnType<typeof signal<string | undefined>>;
  let facilityMeters: ReturnType<typeof signal<Array<{ guid: string; name: string }>>>;
  let setFacility: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    activeSection = signal('home');
    contextMode = signal('account');
    facilities = signal([]);
    selectedFacility = signal<{ guid: string; name: string } | undefined>(undefined);
    account = signal({ guid: 'account-a', name: 'Account A' });
    isSingleSiteWorkspace = signal(false);
    hasSingleSiteRecovery = signal(false);
    singleSiteWorkspaceState = signal('portfolio');
    activeDetail = signal('profile');
    activeMeterGuid = signal<string | undefined>(undefined);
    facilityMeters = signal([]);
    setFacility = vi.fn();
    TestBed.configureTestingModule({
      declarations: [SectionNavComponent, FacilityPickerComponent],
      imports: [RouterModule.forRoot([]), FormsModule],
      providers: [
        {
          provide: WorkspaceNavigationService,
          useValue: {
            contextMode,
            facilities,
            facility: selectedFacility,
            account,
            isSingleSiteWorkspace,
            hasSingleSiteRecovery,
            singleSiteWorkspaceState,
            activeSection,
            activeDetail,
            activeMeterGuid,
            accountRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'home', 'overview'],
            facilityRoute: () => ['/v1', 'workspace', 'facility', 'facility-a', 'home', 'overview'],
            accountDataRoute: (_accountGuid: string, detail = 'portfolio') => ['/v1', 'workspace', 'account', 'account-a', 'data', detail],
            facilityDataRoute: (_facilityGuid: string, detail = 'meters') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', detail],
            facilityMeterRoute: (_facilityGuid: string, meterGuid: string, tab = 'settings') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meters', meterGuid, tab],
            accountSettingsRoute: (_accountGuid: string, detail = 'profile') => ['/v1', 'workspace', 'account', 'account-a', 'settings', detail],
            facilitySettingsRoute: (_facilityGuid: string, detail = 'profile') => ['/v1', 'workspace', 'facility', 'facility-a', 'settings', detail],
            legacyFacilityManagementRoute: () => ['/data-management', 'account-a', 'facilities'],
            setContext: () => undefined,
            setFacility
          }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            facilityMeters
          }
        }
      ]
    });
  });

  it('shows home navigation only when the Home rail section is active', () => {
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Home');
    expect(fixture.nativeElement.textContent).toContain('Overview');
    expect(fixture.nativeElement.textContent).not.toContain('Account Settings');
  });

  it('shows account settings navigation only when the Settings rail section is active', () => {
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Settings');
    expect(fixture.nativeElement.textContent).toContain('Profile');
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Delete account');
    expect(fixture.nativeElement.textContent).not.toContain('Account Home');
    expect(fixture.nativeElement.textContent).not.toContain('Overview');
  });

  it('shows account portfolio and fuels custom data navigation when the Data rail section is active', () => {
    activeSection.set('data');
    activeDetail.set('portfolio');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Data');
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Custom Database Items');
    expect(fixture.nativeElement.textContent).toContain('Fuels');
    expect(fixture.nativeElement.textContent).not.toContain('Grid Factors');
    expect(fixture.nativeElement.textContent).not.toContain('Global Warming Potentials');
    expect(fixture.nativeElement.textContent).not.toContain('Account Settings');
  });

  it('shows emissions custom data navigation only when emissions display is enabled', () => {
    account.set({ guid: 'account-a', name: 'Account A', displayEmissions: true });
    activeSection.set('data');
    activeDetail.set('custom-grid-factors');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Grid Factors');
    expect(fixture.nativeElement.textContent).toContain('Fuels');
    expect(fixture.nativeElement.textContent).toContain('Global Warming Potentials');
    expect(activeLinks(fixture.nativeElement).map(link => link.textContent?.trim())).toEqual(['Grid Factors']);
  });

  it('shows facility data navigation in facility context', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Data');
    expect(fixture.nativeElement.textContent).toContain('Meters');
    expect(fixture.nativeElement.textContent).toContain('Predictors');
    expect(fixture.nativeElement.textContent).toContain('Energy Uses');
    expect(fixture.nativeElement.textContent).not.toContain('Custom Database Items');
    expect(activeLinks(fixture.nativeElement).map(link => link.textContent?.trim())).toEqual(['Predictors']);
  });

  it('shows sorted meter links under an expanded meters parent on meter routes', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    facilityMeters.set([
      { guid: 'meter-gas', name: 'Gas Backup' },
      { guid: 'meter-electric', name: 'Electric Main' }
    ]);
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const toggle = element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle');
    const childLinks = meterChildLinks(element);

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(childLinks.map(link => link.querySelector('span')?.textContent?.trim())).toEqual(['Electric Main', 'Gas Backup']);
    expect(childLinks[0].getAttribute('href')).toContain('/v1/workspace/facility/facility-a/data/meters/meter-electric/settings');
    expect(activeLinks(element).map(link => link.textContent?.trim())).toEqual(['Meters']);
  });

  it('collapses and re-expands meter links on meter routes', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    facilityMeters.set([{ guid: 'meter-electric', name: 'Electric Main' }]);
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const toggle = element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle');
    expect(meterChildLinks(element)).toHaveLength(1);

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(meterChildLinks(element)).toHaveLength(0);

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(meterChildLinks(element)).toHaveLength(1);
  });

  it('can manually expand meter links from another facility data route', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    facilityMeters.set([{ guid: 'meter-electric', name: 'Electric Main' }]);
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(meterChildLinks(element)).toHaveLength(0);

    element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle')?.click();
    fixture.detectChanges();

    expect(meterChildLinks(element)).toHaveLength(1);
    expect(activeLinks(element).map(link => link.textContent?.trim())).toEqual(['Predictors']);

    selectedFacility.set({ guid: 'facility-b', name: 'Facility B' });
    fixture.detectChanges();

    expect(meterChildLinks(element)).toHaveLength(0);
  });

  it('marks an individual meter link active on meter workbench routes', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    activeMeterGuid.set('meter-gas');
    facilityMeters.set([
      { guid: 'meter-electric', name: 'Electric Main' },
      { guid: 'meter-gas', name: 'Gas Backup' }
    ]);
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const currentLinks = Array.from<HTMLAnchorElement>(element.querySelectorAll('[aria-current="page"]'));

    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0].textContent).toContain('Gas Backup');
    expect(currentLinks[0].classList.contains('v1-nav__child')).toBe(true);
  });

  it('does not show a meter child toggle when there are no meters', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.v1-nav__child-toggle')).toBeNull();
    expect(meterChildLinks(element)).toHaveLength(0);
  });

  it('shows facility settings navigation in facility context', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Settings');
    expect(fixture.nativeElement.textContent).toContain('Profile');
    expect(fixture.nativeElement.textContent).toContain('Delete facility');
    expect(fixture.nativeElement.textContent).not.toContain('Portfolio');
    expect(fixture.nativeElement.textContent).not.toContain('Delete account');
  });

  it('shows account deletion label for single-facility facility settings', () => {
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Settings');
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Delete account');

    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Portfolio');
  });

  it('hides context switching for a valid single-facility workspace', () => {
    isSingleSiteWorkspace.set(true);
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('home');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-nav__context')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Facility Home');

    activeSection.set('settings');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Settings');
  });

  it('shows a recovery link for invalid single-site facility counts', () => {
    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    hasSingleSiteRecovery.set(true);
    singleSiteWorkspaceState.set('multiple-facilities');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Single-facility setup needs one facility');
    expect(fixture.nativeElement.textContent).toContain('Open facility management');
    expect(fixture.nativeElement.querySelector('.v1-nav__context')).not.toBeNull();
  });

  it('shows the facility picker in facility context when multiple facilities exist', () => {
    contextMode.set('facility');
    facilities.set([
      { guid: 'facility-a', name: 'Facility A' },
      { guid: 'facility-b', name: 'Facility B' }
    ]);
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle');
    expect(toggle?.textContent).toContain('Facility A');

    toggle?.click();
    fixture.detectChanges();
    element.querySelectorAll<HTMLButtonElement>('.v1-facility-picker__item')[1].click();
    fixture.detectChanges();

    expect(setFacility).toHaveBeenCalledWith('facility-b');
  });

  it('hides the facility picker outside facility context and for single-site workspaces', () => {
    facilities.set([
      { guid: 'facility-a', name: 'Facility A' },
      { guid: 'facility-b', name: 'Facility B' }
    ]);
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();

    contextMode.set('facility');
    isSingleSiteWorkspace.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
  });

  function activeLinks(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from<HTMLAnchorElement>(element.querySelectorAll('.v1-nav__group a.active'));
  }

  function meterChildLinks(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from<HTMLAnchorElement>(element.querySelectorAll('.v1-nav__child'));
  }
});
