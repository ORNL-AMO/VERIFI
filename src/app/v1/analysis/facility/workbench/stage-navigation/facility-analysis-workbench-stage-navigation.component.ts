import { Component, inject } from '@angular/core';
import { AnalysisStageNavigationComponent } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';

@Component({
  selector: 'app-facility-analysis-workbench-stage-navigation',
  standalone: true,
  imports: [AnalysisStageNavigationComponent, DataWorkbenchTabsComponent],
  templateUrl: './facility-analysis-workbench-stage-navigation.component.html',
  styleUrls: ['./facility-analysis-workbench-stage-navigation.component.css']
})
export class FacilityAnalysisWorkbenchStageNavigationComponent {
  readonly workflow = inject(FacilityAnalysisWorkbenchNavigationService);
}
