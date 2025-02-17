import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-facility-predictor-data-entry',
  templateUrl: './facility-predictor-data-entry.component.html',
  styleUrl: './facility-predictor-data-entry.component.css',
  standalone: false
})
export class FacilityPredictorDataEntryComponent {

  facility: IdbFacility;
  predictor: IdbPredictor;
  predictorData: IdbPredictorData;

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
        this.setPredictorEntry(predictorId);
      } else {
        this.goToManagePredictors();
      }
    });
  }


  setPredictorEntry(entryGuid: string) {
    let predictorData: IdbPredictorData = this.predictorDataDbService.getByGuid(entryGuid);
    if (predictorData) {
      this.predictorData = JSON.parse(JSON.stringify(predictorData));
      this.predictor = this.predictorDbService.getByGuid(this.predictorData.predictorId);
    } else {
      this.goToManagePredictors();
    }
  }

  async save() {
    this.isSaved = true;
    await firstValueFrom(this.predictorDataDbService.updateWithObservable(this.predictorData));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorDataV2(account, this.facility);
  }

  async saveAndQuit() {
    await this.save();
    this.toastNotificationService.showToast('Predictor data changes saved!', undefined, undefined, undefined, 'alert-success');
    this.cancel();
  }

  async saveAndAddAnother() {
    await this.save();
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
    let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor, predictorData);
    newPredictorData = await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictorDataV2(account, selectedFacility);
    this.router.navigateByUrl('data-wizard/' + newPredictorData.accountId + '/facilities/' + newPredictorData.facilityId + '/predictors/' + newPredictorData.predictorId + '/predictor-data/edit-entry/' + newPredictorData.guid);
    this.toastNotificationService.showToast('Predictor entry added!', undefined, undefined, undefined, 'alert-success');
  }


  goToManagePredictors() {
    this.router.navigateByUrl('data-wizard/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors')
  }

  canDeactivate(): Observable<boolean> {
    if (!this.isSaved) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  cancel() {
    this.isSaved = true;
    this.router.navigateByUrl('data-wizard/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors/' + this.predictor.guid + '/predictor-data');

  }

}
