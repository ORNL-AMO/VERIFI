import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';
import { FacilityAnalysisAutosaveService } from './editing/facility-analysis-autosave.service';
import { FacilityAnalysisResultsService } from './results/calculation/facility-analysis-results.service';
import { FacilityAnalysisResultsDisplayService } from './results/presentation/facility-analysis-results-display.service';
import { RegressionCandidateStore } from './group/regression/regression-candidate.store';
import { FacilityAnalysisPeriodService } from './analysis-setup/facility-analysis-period.service';
import { FacilityAnalysisWorkbenchNavigationService } from './navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisWorkbenchHeaderComponent } from './header/facility-analysis-workbench-header.component';

@Component({
  selector: 'app-facility-analysis-workbench',
  standalone: true,
  providers: [
    FacilityAnalysisWorkbenchContext,
    FacilityAnalysisAutosaveService,
    FacilityAnalysisPeriodService,
    FacilityAnalysisResultsService,
    FacilityAnalysisResultsDisplayService,
    RegressionCandidateStore,
    FacilityAnalysisWorkbenchNavigationService
  ],
  imports: [RouterOutlet, RouterLink, IconComponent, FacilityAnalysisWorkbenchHeaderComponent],
  templateUrl: './facility-analysis-workbench.component.html',
  styleUrls: ['./facility-analysis-workbench.component.css']
})
export class FacilityAnalysisWorkbenchComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly workflow = inject(FacilityAnalysisWorkbenchNavigationService);

  hasUnsavedChanges(): boolean { return this.autosave.isDirty(); }
  isNavigationBlocked(): boolean { return this.autosave.isBlocked(); }
}
