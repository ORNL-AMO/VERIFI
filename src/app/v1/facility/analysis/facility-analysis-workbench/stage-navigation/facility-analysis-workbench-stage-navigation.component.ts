import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';

@Component({
  selector: 'app-facility-analysis-workbench-stage-navigation',
  standalone: true,
  imports: [RouterLink, IconComponent, DataWorkbenchTabsComponent],
  templateUrl: './facility-analysis-workbench-stage-navigation.component.html',
  styleUrls: ['./facility-analysis-workbench-stage-navigation.component.css']
})
export class FacilityAnalysisWorkbenchStageNavigationComponent {
  readonly workflow = inject(FacilityAnalysisWorkbenchNavigationService);
}
