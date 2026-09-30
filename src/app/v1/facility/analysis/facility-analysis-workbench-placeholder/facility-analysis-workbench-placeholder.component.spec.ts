import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisWorkbenchPlaceholderComponent } from './facility-analysis-workbench-placeholder.component';

describe('FacilityAnalysisWorkbenchPlaceholderComponent', () => {
  it('shows a recoverable missing-analysis state for stale deep links', async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityAnalysisWorkbenchPlaceholderComponent, RouterModule.forRoot([])],
      providers: [
        { provide: AccountWorkspaceStore, useValue: { selectedFacility: signal({ guid: 'facility-a' }), selectedFacilityAnalyses: signal([]) } },
        { provide: WorkspaceNavigationService, useValue: { activeAnalysisGuid: signal('missing'), facilityAnalysisRoute: () => ['/analysis'] } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(FacilityAnalysisWorkbenchPlaceholderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Analysis unavailable');
    expect(fixture.nativeElement.textContent).toContain('does not exist');
    expect(fixture.nativeElement.textContent).toContain('Back to analyses');
  });
});
