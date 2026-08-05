import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { STATUS_CHECK_OPTIONS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-predictors-status-check',
  standalone: false,
  templateUrl: './predictors-status-check.component.html',
  styleUrl: './predictors-status-check.component.css'
})
export class PredictorsStatusCheckComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input({ required: true }) predictorsStatusChecks: Array<PredictorStatusCheck>;
  @Input({ required: true }) predictorsStatus: STATUS_CHECK_OPTIONS;
  @Input({ required: true }) hasNoPredictors: boolean;
  @Input({ required: true }) facilityPredictorActionUrl: string;

  private router: Router = inject(Router);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);

  goToPredictor(predictorId: string) {
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl(`/data-evaluation/facility/${facility.guid}/utility/predictors/predictor/${predictorId}/entries-table`);
  }
}
