import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { UtilityMeterDataService } from 'src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-confirm-readings',
  templateUrl: './confirm-readings.component.html',
  styleUrls: ['./confirm-readings.component.css']
})
export class ConfirmReadingsComponent implements OnInit {

  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSet: false,
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
    meterData: []
  };
  paramsSub: Subscription;
  meterDataSummaries: Array<MeterDataSummary>;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private utilityMeterDataService: UtilityMeterDataService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      this.setSummary();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  continue() {

  }

  getFacilityName(facilityId: string): string {
    let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == facilityId });
    return facility.name;
  }

  setSummary() {
    let dataSummaries: Array<MeterDataSummary> = new Array();
    this.fileReference.meters.forEach(meter => {
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
      dataSummaries.push({
        meterName: meter.name,
        facilityName: this.getFacilityName(meter.facilityId),
        existingEntries: existingReadings.length,
        invalidEntries: invalidReadings.length,
        newEntries: newReadings.length
      })
    })
    this.meterDataSummaries = dataSummaries;
  }



}


export interface MeterDataSummary {
  meterName: string,
  facilityName: string,
  existingEntries: number,
  invalidEntries: number,
  newEntries: number
}