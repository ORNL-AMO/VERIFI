import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorBrowseCardComponent } from './predictor-browse-card/predictor-browse-card.component';

@Component({
  selector: 'app-predictors-dashboard',
  templateUrl: './predictors-dashboard.component.html',
  styleUrls: ['./predictors-dashboard.component.css'],
  standalone: true,
  imports: [IconComponent, DataEmptyStateComponent, PredictorBrowseCardComponent, RouterLink]
})
export class PredictorsDashboardComponent {
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly accountPredictorsRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'predictors'] : undefined;
  });
}
