import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
  selector: 'app-facility-predictor-data-table',
  templateUrl: './facility-predictor-data-table.component.html',
  styleUrl: './facility-predictor-data-table.component.css'
})
export class FacilityPredictorDataTableComponent {

  facility: IdbFacility;
  predictor: IdbPredictor;

  showDeletePredictorEntry: boolean = false;
  isSaved: boolean = true;
  calculatingDegreeDays: boolean;
  constructor(private activatedRoute: ActivatedRoute,
    private predictorDbService: PredictorDbService,
    private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private loadingService: LoadingService,
    private predictorDataDbService: PredictorDataDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService
  ) {
  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
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
    let predictor: IdbPredictor = this.predictorDbService.getByGuid(predictorId);
    if (predictor) {
      this.predictor = JSON.parse(JSON.stringify(predictor));
    } else {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.goToManagePredictors();
    }
  }

  goToManagePredictors() {
    this.router.navigateByUrl('data-wizard/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors')
  }

}
