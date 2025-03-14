import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { MeterDataSummary } from 'src/app/data-wizard/data-wizard-import/shared-process-file/process-meter-readings/process-meter-readings.component';

@Component({
    selector: 'app-confirm-readings',
    templateUrl: './confirm-readings.component.html',
    styleUrls: ['./confirm-readings.component.css'],
    standalone: false
})
export class ConfirmReadingsComponent implements OnInit {

  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  meterDataSummaries: Array<MeterDataSummary>;
  metersIncluded: boolean;
  skipAll: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private utilityMeterDataService: UtilityMeterDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      this.metersIncluded = this.fileReference.meters.length != 0
      if (this.metersIncluded) {
        this.setSummary();
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  continue() {
    if (this.metersIncluded) {
      let skipExistingReadingsMeterIds: Array<string> = new Array();
      this.meterDataSummaries.forEach(summary => {
        if (summary.skipExisting) {
          skipExistingReadingsMeterIds.push(summary.meterId);
        }
      })
      this.fileReference.skipExistingReadingsMeterIds = skipExistingReadingsMeterIds;
    }
    if (this.fileReference.isTemplate) {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-predictors');
    } else {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/set-facility-predictors');
    }
  }

  getFacilityName(facilityId: string): string {
    let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == facilityId });
    if (facility) {
      return facility.name;
    }
    return;
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
          meter: meter,
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
          skipExisting: skipExisting != undefined,
          meterReadings: meterReadings
        })
      }
    })
    this.meterDataSummaries = dataSummaries;
  }

  goBack() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/manage-meters');
  }

  setSkipAll() {
    this.meterDataSummaries.forEach(summary => {
      summary.skipExisting = this.skipAll;
    });
  }
}

