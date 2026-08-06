import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-facility-predictor-data-bulk-update',
  templateUrl: './facility-predictor-data-bulk-update.component.html',
  styleUrl: './facility-predictor-data-bulk-update.component.css',
  standalone: false
})
export class FacilityPredictorDataBulkUpdateComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  predictor: IdbPredictor;
  constructor(
    private activatedRoute: ActivatedRoute,
    private toastNotificationService: ToastNotificationsService,
    private router: Router

  ) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.setPredictor(predictorId);
      } else {
        //route to manage predictors
        this.goToManagePredictors();
      }
    });
  }

  setPredictor(predictorId: string) {
    this.predictor = this.accountWorkspaceQuery.getPredictorByGuid(predictorId);
    if (!this.predictor) {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.goToManagePredictors();
    }
  }

  goToManagePredictors() {
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('data-management/' + facility.accountId + '/facilities/' + facility.guid + '/predictors')
  }
}
