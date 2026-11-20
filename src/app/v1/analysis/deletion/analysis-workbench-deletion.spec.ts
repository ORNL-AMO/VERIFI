import { AnalysisUsageService } from '../used-by/analysis-usage.service';
import { NO_ERRORS_SCHEMA, Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterLink, RouterOutlet, provideRouter } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountAnalysisWorkbenchComponent } from '../account/workbench/account-analysis-workbench.component';
import { AccountAnalysisWorkbenchContext } from '../account/workbench/account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../account/workbench/editing/account-analysis-autosave.service';
import { FacilityAnalysisWorkbenchComponent } from '../facility/workbench/facility-analysis-workbench.component';
import { FacilityAnalysisWorkbenchContext } from '../facility/workbench/facility-analysis-workbench-context.service';
import { FacilityAnalysisAutosaveService } from '../facility/workbench/editing/facility-analysis-autosave.service';

afterEach(() => TestBed.resetTestingModule());

it.each(['account', 'facility'] as const)('retains the %s Setup outlet after deletion publishes until navigation completes', scope => {
  const component: Type<unknown> = scope === 'account' ? AccountAnalysisWorkbenchComponent : FacilityAnalysisWorkbenchComponent;
  const contextToken = scope === 'account' ? AccountAnalysisWorkbenchContext : FacilityAnalysisWorkbenchContext;
  const editorToken = scope === 'account' ? AccountAnalysisAutosaveService : FacilityAnalysisAutosaveService;
  const deletionActive = signal(true);
  const owner = signal({ guid: 'owner', name: 'Owner' });
  TestBed.overrideComponent(component, { set: {
    imports: [RouterOutlet, RouterLink, IconComponent], schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: AnalysisUsageService, useValue: { dirty: signal(false), saving: signal(false) } },
      { provide: contextToken, useValue: { account: owner, facility: owner, analysis: signal(undefined) } },
      { provide: editorToken, useValue: { deletionActive } }
    ]
  } });
  TestBed.configureTestingModule({ imports: [component], providers: [
    provideRouter([]), { provide: WorkspaceNavigationService, useValue: {
      accountAnalysisRoute: () => ['/analyses'], facilityInventoryLink: () => ({ route: ['/analyses'] })
    } }
  ] });
  const fixture = TestBed.createComponent(component); fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
  deletionActive.set(false); fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain('Analysis not found');
});
