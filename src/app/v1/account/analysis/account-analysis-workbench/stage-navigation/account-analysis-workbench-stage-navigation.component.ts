import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';

@Component({
  selector: 'app-account-analysis-workbench-stage-navigation',
  standalone: true,
  imports: [RouterLink, IconComponent, DataWorkbenchTabsComponent],
  templateUrl: './account-analysis-workbench-stage-navigation.component.html',
  styleUrls: ['./account-analysis-workbench-stage-navigation.component.css']
})
export class AccountAnalysisWorkbenchStageNavigationComponent {
  readonly workflow = inject(AccountAnalysisWorkbenchNavigationService);
}
