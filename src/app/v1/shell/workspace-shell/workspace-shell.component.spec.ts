import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { PrimaryRailComponent } from '../primary-rail/primary-rail.component';
import { SectionNavComponent } from '../section-nav/section-nav.component';
import { SupportPanelComponent } from '../support-panel/support-panel.component';
import { WorkspaceNavigationService, SUPPORT_PANEL_TABS, WORKSPACE_SECTIONS } from '../workspace-navigation.service';
import { WorkspaceShellComponent } from './workspace-shell.component';

@NgModule({
  imports: [CommonModule, RouterModule.forRoot([])],
  declarations: [
    WorkspaceShellComponent,
    PrimaryRailComponent,
    SectionNavComponent,
    SupportPanelComponent
  ]
})
class WorkspaceShellTestModule { }

describe('WorkspaceShellComponent', () => {
  let fixture: ComponentFixture<WorkspaceShellComponent>;
  let navigation: any;

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
        todos: ['Todo item'],
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

    TestBed.configureTestingModule({
      imports: [WorkspaceShellTestModule],
      providers: [
        { provide: WorkspaceNavigationService, useValue: navigation }
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

  it('applies motion classes from the current v1 route transition', () => {
    const workspace = fixture.nativeElement.querySelector('.v1-workspace');

    expect(workspace.classList.contains('v1-workspace--entry')).toBe(true);
    expect(workspace.classList.contains('v1-workspace--account')).toBe(true);
  });
});
