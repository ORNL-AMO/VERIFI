import { TestBed } from '@angular/core/testing';
import { SettingsNavComponent } from './settings-nav.component';
import { setupSectionNavTest } from '../section-nav-test.helpers';

describe('SettingsNavComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows account settings navigation only when the Settings rail section is active', () => {
    const { activeSection, account } = state;
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SettingsNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Settings');
    expect(fixture.nativeElement.textContent).toContain('Profile');
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Delete account');
    expect(fixture.nativeElement.textContent).not.toContain('Account Home');
    expect(fixture.nativeElement.textContent).not.toContain('Overview');
  });

  it('shows facility settings navigation in facility context', () => {
    const { activeSection, contextMode, selectedFacility, account } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SettingsNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Settings');
    expect(fixture.nativeElement.textContent).toContain('Profile');
    expect(fixture.nativeElement.textContent).toContain('Delete facility');
    expect(fixture.nativeElement.textContent).not.toContain('Portfolio');
    expect(fixture.nativeElement.textContent).not.toContain('Delete account');
  });

  it('shows account deletion label for single-facility facility settings', () => {
    const { activeSection, contextMode, selectedFacility, account } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SettingsNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Settings');
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Delete account');

    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Portfolio');
  });

});
