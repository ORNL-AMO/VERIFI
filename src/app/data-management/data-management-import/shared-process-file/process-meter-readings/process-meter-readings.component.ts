import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import * as _ from 'lodash';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';


@Component({
  selector: 'app-process-meter-readings',
  standalone: false,

  templateUrl: './process-meter-readings.component.html',
  styleUrl: './process-meter-readings.component.css'
})
export class ProcessMeterReadingsComponent {
  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;

  meterDataSummaries: Array<MeterDataSummary>;
  skipAll: boolean = false;
  metersIncluded: boolean;
  inspectMeterSummary: MeterDataSummary;
  constructor(private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private utilityMeterDataService: UtilityMeterDataService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
      this.metersIncluded = this.fileReference.meters.length != 0;
      if (this.metersIncluded) {
        this.setSummary();
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
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
            form = this.utilityMeterDataService.getGeneralMeterDataForm(reading, displayVolumeInput, displayEnergyUse, displayHeatCapacity, displayVehicleFuelEfficiency, meter.source);
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

  getFacilityName(facilityId: string): string {
    let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == facilityId });
    if (facility) {
      return facility.name;
    }
    return;
  }

  setSkipAll() {

  }

  selectMeterSummary(meterSummary: MeterDataSummary) {
    this.inspectMeterSummary = meterSummary;
  }
}

export interface MeterDataSummary {
  meter: IdbUtilityMeter,
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
  skipExisting: boolean,
  meterReadings: Array<IdbUtilityMeterData>
}