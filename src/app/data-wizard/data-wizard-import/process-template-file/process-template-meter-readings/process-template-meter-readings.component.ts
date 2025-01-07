import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first, firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-process-template-meter-readings',
  templateUrl: './process-template-meter-readings.component.html',
  styleUrl: './process-template-meter-readings.component.css'
})
export class ProcessTemplateMeterReadingsComponent {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;

  meterDataSummaries: Array<MeterDataSummary>;
  skipAll: boolean = false;
  metersIncluded: boolean;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router,
    private utilityMeterDbService: UtilityMeterdbService,
    private dataWizardService: DataWizardService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private utilityMeterDataService: UtilityMeterDataService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
      this.metersIncluded = this.fileReference.meters.length != 0;
      if (this.metersIncluded) {
        this.setSummary();
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  goBack() {

  }

  next() {

  }

  async submitMeterReadings() {
    this.loadingService.setLoadingMessage('Uploading Meter Data...');
    this.loadingService.setLoadingStatus(true);
    for (let i = 0; i < this.fileReference.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = this.fileReference.meterData[i];
      if (meterData.id) {
        let summary: MeterDataSummary = this.meterDataSummaries.find(summary => { return summary.meterId == meterData.meterId });
        if (!summary.skipExisting) {
          await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(meterData));
        }
      } else {
        await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterData));
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.fileReference.meterReadingsSubmitted = true;
    this.dbChangesService.setMeterData(account);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Meter Data Uploaded!', undefined, undefined, false, 'alert-success');
  }

  setSummary() {
    let dataSummaries: Array<MeterDataSummary> = new Array();
    this.fileReference.meters.forEach(meter => {
      if (!meter.skipImport) {
        let meterReadings: Array<IdbUtilityMeterData> = this.fileReference.meterData.filter(data => { return data.meterId == meter.guid });
        let invalidReadings: Array<IdbUtilityMeterData> = new Array()
        let existingReadings: Array<IdbUtilityMeterData> = new Array()
        let newReadings: Array<IdbUtilityMeterData> = new Array()
        meterReadings.forEach(reading => {
          let form: FormGroup;
          if (meter.source == 'Electricity') {
            form = this.utilityMeterDataService.getElectricityMeterDataForm(reading);
          } else {
            let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
            let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
            let displayHeatCapacity: boolean = checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope);
            let displayVehicleFuelEfficiency: boolean = (meter.scope == 2 && meter.vehicleCategory == 2);
            form = this.utilityMeterDataService.getGeneralMeterDataForm(reading, displayVolumeInput, displayEnergyUse, displayHeatCapacity, displayVehicleFuelEfficiency);
          }
          if (form.invalid) {
            invalidReadings.push(reading);
          } else {
            if (reading.id) {
              existingReadings.push(reading);
            } else {
              newReadings.push(reading);
            }
          }

        });
        let existingStart: Date;
        let existingEnd: Date;
        if (existingReadings.length != 0) {
          existingStart = _.minBy(existingReadings, (entry) => { return entry.readDate }).readDate
          existingEnd = _.maxBy(existingReadings, (entry) => { return entry.readDate }).readDate
        }

        let newStart: Date;
        let newEnd: Date;
        if (newReadings.length != 0) {
          newStart = _.minBy(newReadings, (entry) => { return entry.readDate }).readDate
          newEnd = _.maxBy(newReadings, (entry) => { return entry.readDate }).readDate
        }

        let invalidStart: Date;
        let invalidEnd: Date;
        if (invalidReadings.length != 0) {
          invalidStart = _.minBy(invalidReadings, (entry) => { return entry.readDate }).readDate
          invalidEnd = _.maxBy(invalidReadings, (entry) => { return entry.readDate }).readDate
        }
        let skipExisting: string = this.fileReference.skipExistingReadingsMeterIds.find(id => { return id == meter.guid });
        dataSummaries.push({
          meterName: meter.name,
          meterId: meter.guid,
          facilityName: this.getFacilityName(meter.facilityId),
          existingEntries: existingReadings.length,
          existingEnd: existingEnd,
          existingStart: existingStart,
          invalidEntries: invalidReadings.length,
          invalidEnd: invalidEnd,
          invalidStart: invalidStart,
          newEntries: newReadings.length,
          newStart: newStart,
          newEnd: newEnd,
          skipExisting: skipExisting != undefined
        })
      }
    })
    this.meterDataSummaries = dataSummaries;
  }

  getFacilityName(facilityId: string): string {
    let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == facilityId });
    if (facility) {
      return facility.name;
    }
    return;
  }

  setSkipAll() {

  }

}

export interface MeterDataSummary {
  meterName: string,
  meterId: string,
  facilityName: string,
  existingEntries: number,
  existingStart: Date,
  existingEnd: Date,
  invalidEntries: number,
  invalidStart: Date,
  invalidEnd: Date,
  newEntries: number
  newStart: Date,
  newEnd: Date,
  skipExisting: boolean
}