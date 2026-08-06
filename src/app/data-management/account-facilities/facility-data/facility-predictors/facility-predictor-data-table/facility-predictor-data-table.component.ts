import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-facility-predictor-data-table',
  templateUrl: './facility-predictor-data-table.component.html',
  styleUrl: './facility-predictor-data-table.component.css',
  standalone: false
})
export class FacilityPredictorDataTableComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facility: IdbFacility;
  predictor: IdbPredictor;

  showDeletePredictorEntry: boolean = false;
  isSaved: boolean = true;
  calculatingDegreeDays: boolean;
  constructor(
    private activatedRoute: ActivatedRoute,
    private toastNotificationService: ToastNotificationsService,
    private router: Router

  ) {
  }

  ngOnInit() {
    this.facility = this.accountWorkspaceStore.selectedFacility();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.setPredictor(predictorId);
      } else {
        this.goToManagePredictors();
      }
    });
  }

  setPredictor(predictorId: string) {
    let predictor: IdbPredictor = this.accountWorkspaceQuery.getPredictorByGuid(predictorId);
    if (predictor) {
      this.predictor = JSON.parse(JSON.stringify(predictor));
    } else {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.goToManagePredictors();
    }
  }

  goToManagePredictors() {
    this.router.navigateByUrl('data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors')
  }

}
