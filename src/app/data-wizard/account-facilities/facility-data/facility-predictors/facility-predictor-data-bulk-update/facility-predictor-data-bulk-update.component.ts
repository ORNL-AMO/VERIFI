import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-facility-predictor-data-bulk-update',
  templateUrl: './facility-predictor-data-bulk-update.component.html',
  styleUrl: './facility-predictor-data-bulk-update.component.css',
  standalone: false
})
export class FacilityPredictorDataBulkUpdateComponent {

  predictor: IdbPredictor;
  constructor(private activatedRoute: ActivatedRoute,
    private predictorDbService: PredictorDbService,
    private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
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
    this.predictor = this.predictorDbService.getByGuid(predictorId);
    if (!this.predictor) {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.goToManagePredictors();
    }
  }

  goToManagePredictors() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('data-wizard/' + facility.accountId + '/facilities/' + facility.guid + '/predictors')
  }
}
