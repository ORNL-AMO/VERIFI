import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject, ViewChild } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CalculatedPredictorDataUpdateComponent } from '@v0/shared/shared-predictors-content/calculated-predictor-data-update/calculated-predictor-data-update.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';

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
  @ViewChild(CalculatedPredictorDataUpdateComponent)
  calculatedPredictorDataUpdate: CalculatedPredictorDataUpdateComponent;

  canDeactivate(): Observable<boolean> {
    return this.calculatedPredictorDataUpdate?.canDeactivate() ?? of(true);
  }
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
