import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UtilityMeterDataService } from 'src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-confirm-readings',
  templateUrl: './confirm-readings.component.html',
  styleUrls: ['./confirm-readings.component.css']
})
export class ConfirmReadingsComponent implements OnInit {

  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSubmitted: false,
    id: undefined,
    workbook: undefined,
    isTemplate: false,
    selectedWorksheetName: '',
    selectedWorksheetData: [],
    columnGroups: [],
    headerMap: [],
    meterFacilityGroups: [],
    predictorFacilityGroups: [],
    importFacilities: [],
    meters: [],
    meterData: [],
    predictorEntries: [],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
  paramsSub: Subscription;
  meterDataSummaries: Array<MeterDataSummary>;
  metersIncluded: boolean;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private utilityMeterDataService: UtilityMeterDataService, private energyUnitsHelperService: EnergyUnitsHelperService,
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
    if(facility){
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
            let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit) == false);
            let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
            form = this.utilityMeterDataService.getGeneralMeterDataForm(reading, displayVolumeInput, displayEnergyUse);
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

  goBack() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/manage-meters');
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