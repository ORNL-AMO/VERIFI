import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterDataService } from 'src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-confirm-and-submit',
  templateUrl: './confirm-and-submit.component.html',
  styleUrls: ['./confirm-and-submit.component.css']
})
export class ConfirmAndSubmitComponent implements OnInit {

  fileReference: FileReference;
  paramsSub: Subscription;
  hasNextFile: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router, private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictordbService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private sharedDataService: SharedDataService,
    private utilityMeterDataService: UtilityMeterDataService,
    private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  goBack() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-predictors');
  }

  async submit() {
    this.sharedDataService.modalOpen.next(true);
    this.loadingService.setLoadingMessage('Submitting File Data..');
    this.loadingService.setLoadingStatus(true);

    this.loadingService.setLoadingMessage('Uploading Facilities..');
    for (let i = 0; i < this.fileReference.importFacilities.length; i++) {
      let facility: IdbFacility = this.fileReference.importFacilities[i];
      if (facility.id) {
        await this.facilityDbService.updateWithObservable(facility).toPromise();
      } else {
        await this.facilityDbService.addWithObservable(facility).toPromise();
      }
    }

    this.loadingService.setLoadingMessage('Uploading Meters..');
    for (let i = 0; i < this.fileReference.meters.length; i++) {
      let meter: IdbUtilityMeter = this.fileReference.meters[i];
      if (meter.id) {
        if (!meter.skipImport) {
          await this.utilityMeterDbService.updateWithObservable(meter).toPromise();
        }
      } else {
        await this.utilityMeterDbService.addWithObservable(meter).toPromise();
      }
    }

    this.loadingService.setLoadingMessage('Creating Meter Groups..');
    for (let i = 0; i < this.fileReference.newMeterGroups.length; i++) {
      let meterGroup: IdbUtilityMeterGroup = this.fileReference.newMeterGroups[i];
      await this.utilityMeterGroupDbService.addWithObservable(meterGroup).toPromise();
    }

    this.loadingService.setLoadingMessage('Uploading Meter Data...');
    for (let i = 0; i < this.fileReference.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = this.fileReference.meterData[i];
      let meter: IdbUtilityMeter = this.fileReference.meters.find(meter => { return meter.guid == meterData.meterId })

      let form: FormGroup;
      if (meter.source == 'Electricity') {
        form = this.utilityMeterDataService.getElectricityMeterDataForm(meterData);
      } else {
        let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit) == false);
        let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
        form = this.utilityMeterDataService.getGeneralMeterDataForm(meterData, displayVolumeInput, displayEnergyUse);
      }

      if (form.valid) {
        if (meterData.id) {
          let skipMeterData: boolean = false;
          for (let x = 0; x < this.fileReference.skipExistingReadingsMeterIds.length; x++) {
            if (this.fileReference.skipExistingReadingsMeterIds[x] == meterData.meterId) {
              skipMeterData = true;
            }
          }
          if (!skipMeterData) {
            await this.utilityMeterDataDbService.updateWithObservable(meterData).toPromise();
          }
        } else {
          await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
        }
      }
    }

    this.loadingService.setLoadingMessage('Uploading Predictors..');
    //TODO: make sure old predictor entries have new predictor data.
    for (let i = 0; i < this.fileReference.predictorEntries.length; i++) {
      let predictorEntry: IdbPredictorEntry = this.fileReference.predictorEntries[i];
      if (predictorEntry.id) {
        let skipPredictorData: boolean = false;
        for (let x = 0; x < this.fileReference.skipExistingPredictorFacilityIds.length; x++) {
          if (this.fileReference.skipExistingPredictorFacilityIds[x] == predictorEntry.facilityId) {
            skipPredictorData = true;
          }
        }
        if (!skipPredictorData) {
          await this.predictorDbService.updateWithObservable(predictorEntry).toPromise();
        }
      } else {
        await this.predictorDbService.addWithObservable(predictorEntry).toPromise();
      }
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.loadingService.setLoadingMessage('Finishing Up...');
    await this.dbChangesService.selectAccount(selectedAccount)
    this.fileReference.dataSubmitted = true;
    let fileReferenceIndex: number = this.uploadDataService.fileReferences.findIndex(ref => { return ref.id == this.fileReference.id });
    this.uploadDataService.fileReferences[fileReferenceIndex] = this.fileReference;
    this.hasNextFile = fileReferenceIndex < (this.uploadDataService.fileReferences.length - 1);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast(this.fileReference.name + ' Data Submitted', undefined, undefined, false, "bg-success");
    this.sharedDataService.modalOpen.next(false);
  }

  goToNext() {
    let fileReferenceIndex: number = this.uploadDataService.fileReferences.findIndex(ref => { return ref.id == this.fileReference.id });
    let nextFile: FileReference = this.uploadDataService.fileReferences[fileReferenceIndex + 1];
    if (nextFile.isTemplate) {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + nextFile.id + '/template-facilities');
    } else {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + nextFile.id);
    }
  }


  goToUpload() {
    this.router.navigateByUrl('/upload');
  }

  goToAccountDashboard() {
    this.router.navigateByUrl('/account');
  }
}
