import { Component, inject } from '@angular/core';
import { AnalysisStageNavigationComponent } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';

@Component({
  selector: 'app-account-analysis-workbench-stage-navigation',
  standalone: true,
  imports: [AnalysisStageNavigationComponent, DataWorkbenchTabsComponent],
  templateUrl: './account-analysis-workbench-stage-navigation.component.html',
  styleUrls: ['./account-analysis-workbench-stage-navigation.component.css']
})
export class AccountAnalysisWorkbenchStageNavigationComponent {
  readonly workflow = inject(AccountAnalysisWorkbenchNavigationService);
}
