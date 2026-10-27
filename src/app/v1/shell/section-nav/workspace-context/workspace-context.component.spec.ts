import { TestBed } from '@angular/core/testing';
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

  it('leaves account identity and facility selection to the header', () => {
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-nav__account-name')).toBeNull();
  });

  it('does not repeat the account name in either single-site or portfolio contexts', () => {
    const { contextMode, isSingleSiteWorkspace } = state;
    const fixture = TestBed.createComponent(WorkspaceContextComponent);
    for (const singleSite of [true, false]) {
      isSingleSiteWorkspace.set(singleSite);
      for (const mode of ['account', 'facility']) {
        contextMode.set(mode); fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.v1-nav__account-name')).toBeNull();
        expect(fixture.nativeElement.querySelector('app-facility-picker')).toBeNull();
      }
    }
  });
});
