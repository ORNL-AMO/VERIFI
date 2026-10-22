import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { WorkspaceContextComponent } from './workspace-context.component';
import { setupSectionNavTest } from '../section-nav-test.helpers';

describe('WorkspaceContextComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows a recovery link for invalid single-site facility counts', () => {
    const { account, hasSingleSiteRecovery, singleSiteWorkspaceState } = state;
    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    hasSingleSiteRecovery.set(true);
    singleSiteWorkspaceState.set('multiple-facilities');
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Single-facility setup needs one facility');
    expect(fixture.nativeElement.textContent).toContain('Open facility management');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toContain('data-management');
  });

  it('shows the facility picker in facility context when multiple facilities exist', () => {
    const { contextMode, facilities, selectedFacility, setFacility } = state;
    contextMode.set('facility');
    facilities.set([
      { guid: 'facility-a', name: 'Facility A' },
      { guid: 'facility-b', name: 'Facility B' }
    ]);
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-facility-picker__toggle');
    expect(toggle?.textContent).toContain('Facility A');

    toggle?.click();
    fixture.detectChanges();
    document.querySelectorAll<HTMLButtonElement>('.v1-facility-picker__item')[1].click();
    fixture.detectChanges();

    expect(setFacility).toHaveBeenCalledWith('facility-b');
  });

  it('shows one top label with a facility icon in both single-site contexts and restores the portfolio picker', () => {
    const { contextMode, facilities, isSingleSiteWorkspace } = state;
    facilities.set([{ guid: 'facility-a', name: 'Facility A' }]);
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-facility-picker__toggle')).not.toBeNull();

    isSingleSiteWorkspace.set(true);
    for (const mode of ['account', 'facility']) {
      contextMode.set(mode);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
      expect(fixture.nativeElement.querySelector('.v1-nav__account-name')?.textContent.trim()).toBe('Account A');
      expect(fixture.debugElement.query(By.css('.v1-nav__account-name app-ui-icon')).componentInstance.name).toBe('facility');
      expect(fixture.nativeElement.textContent).not.toContain('Facility A');
    }
    isSingleSiteWorkspace.set(false);
    facilities.set([...facilities(), { guid: 'facility-b', name: 'Facility B' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-facility-picker__toggle')).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.v1-nav__account-name app-ui-icon')).componentInstance.name).toBe('account');
  });

});
