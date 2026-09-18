import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkScrollable } from '@angular/cdk/scrolling';
import { NgModule, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { CommandNotificationBridgeService } from '@app/v1/shared/notifications/command-notification-bridge.service';
import { NotificationsModule } from '@app/v1/shared/notifications/notifications.module';
import { FacilityPickerComponent } from '../section-nav/facility-picker/facility-picker.component';
import { PrimaryRailComponent } from '../primary-rail/primary-rail.component';
import { SectionNavComponent } from '../section-nav/section-nav.component';
import { SupportPanelComponent } from '../support-panel/support-panel.component';
import { WorkspaceNavigationService, SUPPORT_PANEL_TABS, WORKSPACE_SECTIONS } from '../workspace-navigation.service';
import { WorkspaceShellComponent } from './workspace-shell.component';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';

@NgModule({
  imports: [CommonModule, FormsModule, IconComponent, NotificationsModule, RouterModule.forRoot([]), ScrollingModule],
  declarations: [
    WorkspaceShellComponent,
    PrimaryRailComponent,
    SectionNavComponent,
    FacilityPickerComponent,
    SupportPanelComponent
  ]
})
class WorkspaceShellTestModule { }

describe('WorkspaceShellComponent', () => {
  let fixture: ComponentFixture<WorkspaceShellComponent>;
  let navigation: any;
  let status: any;

  beforeEach(() => {
    navigation = {
      sections: vi.fn(() => WORKSPACE_SECTIONS),
      panelTabs: vi.fn(() => SUPPORT_PANEL_TABS),
      isSupportPanelOpen: vi.fn(() => true),
      contextMode: vi.fn(() => 'account'),
      routeMotion: vi.fn(() => 'workspace-entry'),
      account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
      facilities: vi.fn(() => [{ guid: 'facility-a', name: 'Facility A' }]),
      facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
      activeSection: vi.fn(() => 'home'),
      activePanelTab: vi.fn(() => 'help'),
      panelContent: vi.fn(() => ({
        help: ['Help text'],
        todos: [presentFinding(makeFinding('account.facilities.missing', 'error', 'readiness', {
          kind: 'account', guid: 'account-a', name: 'Account A', accountGuid: 'account-a'
        }))],
        discardedWarnings: [],
        results: [{ label: 'Facilities', value: '1', tone: 'info' }],
        details: [{ label: 'Context', value: 'Account workspace' }]
      })),
      showWelcome: vi.fn(),
      setContext: vi.fn(),
      setFacility: vi.fn(),
      setPanelTab: vi.fn(),
      hideSupportPanel: vi.fn(),
      toggleSupportPanel: vi.fn(),
      isSingleSiteWorkspace: vi.fn(() => false),
      hasSingleSiteRecovery: vi.fn(() => false),
      singleSiteWorkspaceState: vi.fn(() => 'none'),
      accountRoute: vi.fn((accountGuid: string) =>
        ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview']
      ),
      facilityRoute: vi.fn((facilityGuid: string) =>
        ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview']
      )
    };
    status = {
      state: vi.fn(() => 'ready'),
      navigateTo: vi.fn(),
      warningActionError: vi.fn(() => undefined),
      canManageWarnings: vi.fn(() => true),
      discardWarning: vi.fn(),
      restoreWarning: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [WorkspaceShellTestModule],
      providers: [
        { provide: CommandNotificationBridgeService, useValue: {} },
        { provide: WorkspaceNavigationService, useValue: navigation },
        { provide: WorkspaceStatusService, useValue: status }
      ]
    });
    fixture = TestBed.createComponent(WorkspaceShellComponent);
    fixture.detectChanges();
  });

  it('renders the workspace frame regions', () => {
    expect(fixture.nativeElement.querySelector('app-primary-rail')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-section-nav')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-support-panel')).not.toBeNull();
  });

  it('mounts notification toasts in the main workspace grid area', () => {
    const region = fixture.nativeElement.querySelector('.v1-workspace__notifications');

    expect(region.querySelector('app-notification-toast-host')).not.toBeNull();
  });

  it('registers the main workspace pane as the CDK scroll container for drag auto-scroll', () => {
    const scrollable = fixture.debugElement.query(By.directive(CdkScrollable));

    expect(scrollable.nativeElement.classList.contains('v1-workspace__main')).toBe(true);
  });

  it('applies motion classes from the current v1 route transition', () => {
    const workspace = fixture.nativeElement.querySelector('.v1-workspace');

    expect(workspace.classList.contains('v1-workspace--entry')).toBe(true);
    expect(workspace.classList.contains('v1-workspace--account')).toBe(true);
  });

  it('offers discard for active warnings and restore for discarded warnings', () => {
    const entity = { kind: 'account' as const, guid: 'account-a', name: 'Account A', accountGuid: 'account-a' };
    const activeWarning = presentFinding(makeFinding('account.configuration.default-name', 'warning', 'configuration', entity));
    const discardedWarning = presentFinding(makeFinding('facility.meter-groups.missing', 'warning', 'readiness', {
      kind: 'facility', guid: 'facility-a', name: 'Facility A', accountGuid: 'account-a', facilityGuid: 'facility-a'
    }));
    navigation.activePanelTab.mockReturnValue('todos');
    navigation.panelContent.mockReturnValue({
      help: [],
      todos: [activeWarning],
      discardedWarnings: [discardedWarning],
      results: [],
      details: []
    });
    fixture.destroy();
    fixture = TestBed.createComponent(WorkspaceShellComponent);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('.v1-panel__content button'));
    buttons.find(button => button.nativeElement.textContent.includes('Discard'))?.triggerEventHandler('click');
    buttons.find(button => button.nativeElement.textContent.includes('Restore'))?.triggerEventHandler('click');

    expect(status.discardWarning).toHaveBeenCalledWith(activeWarning);
    expect(status.restoreWarning).toHaveBeenCalledWith(discardedWarning);
  });

  it('focuses the stable Todo region after discarding the last Todo', async () => {
    const activeWarning = presentFinding(makeFinding('account.configuration.default-name', 'warning', 'configuration', {
      kind: 'account', guid: 'account-a', name: 'Account A', accountGuid: 'account-a'
    }));
    navigation.activePanelTab.mockReturnValue('todos');
    const panelContent = signal({
      help: [], todos: [activeWarning], discardedWarnings: [], results: [], details: []
    });
    navigation.panelContent.mockImplementation(() => panelContent());
    status.discardWarning.mockImplementation(async () => {
      panelContent.set({
        help: [], todos: [], discardedWarnings: [activeWarning], results: [], details: []
      });
      return true;
    });
    fixture.destroy();
    fixture = TestBed.createComponent(WorkspaceShellComponent);
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.directive(SupportPanelComponent)).componentInstance as SupportPanelComponent;

    await panel.discardWarning(activeWarning);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[aria-labelledby="v1-todo-heading"]'));
  });

  it('focuses the stable Todo region after restoring a warning without a matching Todo', async () => {
    const discardedWarning = presentFinding(makeFinding('meter.currency.stale', 'warning', 'currency', {
      kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a'
    }));
    navigation.activePanelTab.mockReturnValue('todos');
    const panelContent = signal({
      help: [], todos: [], discardedWarnings: [discardedWarning], results: [], details: []
    });
    navigation.panelContent.mockImplementation(() => panelContent());
    status.restoreWarning.mockImplementation(async () => {
      panelContent.set({
        help: [], todos: [], discardedWarnings: [], results: [], details: []
      });
      return true;
    });
    fixture.destroy();
    fixture = TestBed.createComponent(WorkspaceShellComponent);
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.directive(SupportPanelComponent)).componentInstance as SupportPanelComponent;

    await panel.restoreWarning(discardedWarning);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[aria-labelledby="v1-todo-heading"]'));
  });
});
