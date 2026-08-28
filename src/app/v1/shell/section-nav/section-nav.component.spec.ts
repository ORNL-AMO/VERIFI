import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { SectionNavComponent } from './section-nav.component';

describe('SectionNavComponent', () => {
  let activeSection: ReturnType<typeof signal<string>>;
  let contextMode: ReturnType<typeof signal<string>>;
  let selectedFacility: ReturnType<typeof signal<{ guid: string; name: string } | undefined>>;
  let account: ReturnType<typeof signal<{ guid: string; name: string; isSingleFacilityCompany?: boolean }>>;
  let isSingleSiteWorkspace: ReturnType<typeof signal<boolean>>;
  let hasSingleSiteRecovery: ReturnType<typeof signal<boolean>>;
  let singleSiteWorkspaceState: ReturnType<typeof signal<string>>;

  beforeEach(() => {
    activeSection = signal('home');
    contextMode = signal('account');
    selectedFacility = signal<{ guid: string; name: string } | undefined>(undefined);
    account = signal({ guid: 'account-a', name: 'Account A' });
    isSingleSiteWorkspace = signal(false);
    hasSingleSiteRecovery = signal(false);
    singleSiteWorkspaceState = signal('portfolio');
    TestBed.configureTestingModule({
      declarations: [SectionNavComponent],
      imports: [RouterModule.forRoot([])],
      providers: [
        {
          provide: WorkspaceNavigationService,
          useValue: {
            contextMode,
            facilities: signal([]),
            facility: selectedFacility,
            account,
            isSingleSiteWorkspace,
            hasSingleSiteRecovery,
            singleSiteWorkspaceState,
            activeSection,
            activeDetail: signal('profile'),
            accountRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'home', 'overview'],
            facilityRoute: () => ['/v1', 'workspace', 'facility', 'facility-a', 'home', 'overview'],
            accountSettingsRoute: (_accountGuid: string, detail = 'profile') => ['/v1', 'workspace', 'account', 'account-a', 'settings', detail],
            facilitySettingsRoute: (_facilityGuid: string, detail = 'profile') => ['/v1', 'workspace', 'facility', 'facility-a', 'settings', detail],
            legacyFacilityManagementRoute: () => ['/data-management', 'account-a', 'facilities'],
            setContext: () => undefined
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
    expect(fixture.nativeElement.textContent).toContain('Delete account');
    expect(fixture.nativeElement.textContent).not.toContain('Account Home');
    expect(fixture.nativeElement.textContent).not.toContain('Overview');
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
    expect(fixture.nativeElement.textContent).toContain('Delete account');
  });

  it('hides context switching and uses site labels for a valid single-site workspace', () => {
    isSingleSiteWorkspace.set(true);
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Site A' });
    activeSection.set('home');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-nav__context')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Site Home');

    activeSection.set('settings');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Site Setup');
  });

  it('shows a recovery link for invalid single-site facility counts', () => {
    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    hasSingleSiteRecovery.set(true);
    singleSiteWorkspaceState.set('multiple-facilities');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Single-site setup needs one facility');
    expect(fixture.nativeElement.textContent).toContain('Open facility management');
    expect(fixture.nativeElement.querySelector('.v1-nav__context')).not.toBeNull();
  });
});
