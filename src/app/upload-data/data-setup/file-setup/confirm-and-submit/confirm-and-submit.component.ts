import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterDataService } from 'src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
    selector: 'app-confirm-and-submit',
    templateUrl: './confirm-and-submit.component.html',
    styleUrls: ['./confirm-and-submit.component.css'],
    standalone: false
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
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private sharedDataService: SharedDataService,
    private utilityMeterDataService: UtilityMeterDataService,
    private predictorDbService: PredictorDbService,
  private predictorDataDbService: PredictorDataDbService) { }

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
        await firstValueFrom(this.facilityDbService.updateWithObservable(facility));
      } else {
        await firstValueFrom(this.facilityDbService.addWithObservable(facility));
      }
    }

    this.loadingService.setLoadingMessage('Uploading Meters..');
    for (let i = 0; i < this.fileReference.meters.length; i++) {
      let meter: IdbUtilityMeter = this.fileReference.meters[i];
      if (!meter.skipImport) {
        if (meter.id) {
          await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
        } else {
          await firstValueFrom(this.utilityMeterDbService.addWithObservable(meter));
        }
      }
    }

    this.loadingService.setLoadingMessage('Creating Meter Groups..');
    for (let i = 0; i < this.fileReference.newMeterGroups.length; i++) {
      let meterGroup: IdbUtilityMeterGroup = this.fileReference.newMeterGroups[i];
      await firstValueFrom(this.utilityMeterGroupDbService.addWithObservable(meterGroup));
    }

    this.loadingService.setLoadingMessage('Uploading Meter Data...');
    for (let i = 0; i < this.fileReference.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = this.fileReference.meterData[i];
      let meter: IdbUtilityMeter = this.fileReference.meters.find(meter => { return meter.guid == meterData.meterId })
      if (!meter.skipImport) {
        let form: FormGroup;
        if (meter.source == 'Electricity') {
          form = this.utilityMeterDataService.getElectricityMeterDataForm(meterData);
        } else {
          let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
          let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
          let displayHeatCapacity: boolean = checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope);
          let displayVehicleFuelEfficiency: boolean = (meter.scope == 2 && meter.vehicleCategory == 2);
          form = this.utilityMeterDataService.getGeneralMeterDataForm(meterData, displayVolumeInput, displayEnergyUse, displayHeatCapacity, displayVehicleFuelEfficiency, meter.source);
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
              await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(meterData));
            }
          } else {
            await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterData));
          }
        }
      }
    }

    this.loadingService.setLoadingMessage('Uploading Predictors..');
    for (let i = 0; i < this.fileReference.predictors.length; i++) {
      let predictor: IdbPredictor = this.fileReference.predictors[i];
      if (predictor.id) {
        let skipPredictorData: boolean = false;
        for (let x = 0; x < this.fileReference.skipExistingPredictorFacilityIds.length; x++) {
          if (this.fileReference.skipExistingPredictorFacilityIds[x] == predictor.facilityId) {
            skipPredictorData = true;
          }
        }
        if (!skipPredictorData) {
          await firstValueFrom(this.predictorDbService.updateWithObservable(predictor));
        }
      } else {
        await firstValueFrom(this.predictorDbService.addWithObservable(predictor));
      }
    }
    this.loadingService.setLoadingMessage('Uploading Predictor Data..');
    for (let i = 0; i < this.fileReference.predictorData.length; i++) {
      let predictorData: IdbPredictorData = this.fileReference.predictorData[i];
      if (predictorData.id) {
        let skipPredictorData: boolean = false;
        for (let x = 0; x < this.fileReference.skipExistingPredictorFacilityIds.length; x++) {
          if (this.fileReference.skipExistingPredictorFacilityIds[x] == predictorData.facilityId) {
            skipPredictorData = true;
          }
        }
        if (!skipPredictorData) {
          await firstValueFrom(this.predictorDataDbService.updateWithObservable(predictorData));
        }
      } else {
        await firstValueFrom(this.predictorDataDbService.addWithObservable(predictorData));
      }
    }

    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.loadingService.setLoadingMessage('Finishing Up...');
    await this.dbChangesService.selectAccount(selectedAccount, false)
    this.fileReference.dataSubmitted = true;
    let fileReferenceIndex: number = this.uploadDataService.fileReferences.findIndex(ref => { return ref.id == this.fileReference.id });
    this.uploadDataService.fileReferences[fileReferenceIndex] = this.fileReference;
    this.hasNextFile = fileReferenceIndex < (this.uploadDataService.fileReferences.length - 1);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast(this.fileReference.name + ' Data Submitted', undefined, undefined, false, "alert-success");
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
