import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from './account-analysis-workbench-context.service';
import { AccountAnalysisWorkbenchComponent } from './account-analysis-workbench.component';
import { AccountAnalysisWorkbenchNavigationService } from './navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisAutosaveService } from './editing/account-analysis-autosave.service';
import { AccountAnalysisFacilitySelectionService } from './select-facility-items/account-analysis-facility-selection.service';

describe('AccountAnalysisWorkbenchComponent', () => {
  it('shows a recovery destination when the route analysis no longer exists', () => {
    const context = {
      account: signal({ guid: 'account-a', name: 'Account A' }),
      analysis: signal(undefined)
    };
    TestBed.overrideComponent(AccountAnalysisWorkbenchComponent, {
      set: {
        providers: [
          { provide: AccountAnalysisWorkbenchContext, useValue: context },
          { provide: AccountAnalysisWorkbenchNavigationService, useValue: {} },
          {
            provide: AccountAnalysisAutosaveService,
            useValue: { isDirty: signal(false), isBlocked: signal(false) }
          },
          { provide: AccountAnalysisFacilitySelectionService, useValue: {} }
        ]
      }
    });
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchComponent],
      providers: [
        provideRouter([]),
        {
          provide: WorkspaceNavigationService,
          useValue: { accountAnalysisRoute: () => ['/analyses'] }
        }
      ]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Analysis not found');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe('/analyses');
  });
});
