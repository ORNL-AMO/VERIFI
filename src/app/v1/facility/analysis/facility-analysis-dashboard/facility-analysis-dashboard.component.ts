import { Component, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-facility-analysis-dashboard',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './facility-analysis-dashboard.component.html',
  styleUrls: ['./facility-analysis-dashboard.component.css']
})
export class FacilityAnalysisDashboardComponent {
  readonly workspace = inject(AccountWorkspaceStore);
}
