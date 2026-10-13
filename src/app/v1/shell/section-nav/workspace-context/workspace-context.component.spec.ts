import { TestBed } from '@angular/core/testing';
import { WorkspaceContextComponent } from './workspace-context.component';
import { setupSectionNavTest } from '../section-nav-test.helpers';

describe('WorkspaceContextComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows a recovery link for invalid single-site facility counts', () => {
    const { facilities, account, hasSingleSiteRecovery, singleSiteWorkspaceState } = state;
    account.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    hasSingleSiteRecovery.set(true);
    singleSiteWorkspaceState.set('multiple-facilities');
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Single-facility setup needs one facility');
    expect(fixture.nativeElement.textContent).toContain('Open facility management');
    expect(fixture.nativeElement.querySelector('.v1-nav__context')).not.toBeNull();
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
    element.querySelectorAll<HTMLButtonElement>('.v1-facility-picker__item')[1].click();
    fixture.detectChanges();

    expect(setFacility).toHaveBeenCalledWith('facility-b');
  });

  it('hides the facility picker outside facility context and for single-site workspaces', () => {
    const { contextMode, facilities, isSingleSiteWorkspace } = state;
    facilities.set([
      { guid: 'facility-a', name: 'Facility A' },
      { guid: 'facility-b', name: 'Facility B' }
    ]);
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();

    contextMode.set('facility');
    isSingleSiteWorkspace.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
  });

});
