import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-submit-import-data',
  standalone: false,

  templateUrl: './submit-import-data.component.html',
  styleUrl: './submit-import-data.component.css'
})
export class SubmitImportDataComponent {
  fileReference: FileReference;
  paramsSub: Subscription;

  importSummary: {
    numFacilities: number,
    numUtilityData: number,
    numPredictorData: number
  } = {
      numFacilities: 0,
      numPredictorData: 0,
      numUtilityData: 0
    };
  facilitySummaries: Array<ImportSummaryItem> = [];
  constructor(
    private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private uploadDataService: UploadDataService,
    private router: Router,
    private accountDbService: AccountdbService
  ) { }


  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
      this.setFacilitySummaries();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  async submitImport() {
    this.fileReference = await this.uploadDataService.submit(this.fileReference);
    let fileReferences: Array<FileReference> = this.dataManagementService.fileReferences.getValue();
    fileReferences = fileReferences.filter(fileRef => { return fileRef.id != this.fileReference.id });
    this.dataManagementService.fileReferences.next(fileReferences);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + account.guid + '/import-data')
  }

  setFacilitySummaries() {
    this.facilitySummaries = new Array();
    this.fileReference.importFacilities.forEach(facility => {
      let meters: Array<IdbUtilityMeter> = this.fileReference.meters.filter(meter => {
        return meter.facilityId == facility.guid
      });
      let predictors: Array<IdbPredictor> = this.fileReference.predictors.filter(predictor => {
        return predictor.facilityId == facility.guid;
      });
      if (meters.length != 0 && predictors.length != 0) {
        let newMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
          return meter.id == undefined;
        });
        let existingMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
          return meter.id != undefined;
        });
        let newPredictors: Array<IdbPredictor> = predictors.filter(predictor => {
          return predictor.id == undefined;
        });
        let existingPredictors: Array<IdbPredictor> = predictors.filter(predictor => {
          return predictor.id != undefined;
        });
        this.facilitySummaries.push({
          facility: facility,
          newMeters: newMeters.map(meter => {
            return this.getMeterItem(meter)
          }),
          existingMeters: existingMeters.map(meter => {
            return this.getMeterItem(meter)
          }),
          newPredictors: newPredictors.map(meter => {
            return this.getPredictorItem(meter)
          }),
          existingPredictors: existingPredictors.map(meter => {
            return this.getPredictorItem(meter)
          })
        })
      }
    });
    this.importSummary = {
      numFacilities: this.facilitySummaries.length,
      numPredictorData: this.fileReference.predictorData.length,
      numUtilityData: this.fileReference.meterData.length
    }
  }

  getMeterItem(meter: IdbUtilityMeter): {
    meter: IdbUtilityMeter,
    existingReadings: Array<IdbUtilityMeterData>,
    existingDateRange: { startDate: Date, endDate: Date },
    newReadings: Array<IdbUtilityMeterData>,
    newDateRange: { startDate: Date, endDate: Date }
  } {
    let existingReadings: Array<IdbUtilityMeterData> = this.fileReference.meterData.filter(mData => {
      return mData.meterId == meter.guid && mData.id != undefined
    });
    let minExistingStartDate: Date;
    let maxExistingStartDate: Date;
    if (existingReadings.length > 0) {
      let minExisting: IdbUtilityMeterData = _.minBy(existingReadings, (data: IdbUtilityMeterData) => {
        return new Date(data.readDate);
      });
      minExistingStartDate = new Date(minExisting.readDate);
      let maxExisting: IdbUtilityMeterData = _.maxBy(existingReadings, (data: IdbUtilityMeterData) => {
        return new Date(data.readDate);
      });
      maxExistingStartDate = new Date(maxExisting.readDate);
    }
    let newReadings: Array<IdbUtilityMeterData> = this.fileReference.meterData.filter(mData => {
      return mData.meterId == meter.guid && mData.id == undefined
    });
    let minNewStartDate: Date;
    let maxNewStartDate: Date;
    if (newReadings.length > 0) {
      let minNew: IdbUtilityMeterData = _.minBy(newReadings, (data: IdbUtilityMeterData) => {
        return new Date(data.readDate);
      });
      minNewStartDate = new Date(minNew.readDate);
      let maxNew: IdbUtilityMeterData = _.maxBy(newReadings, (data: IdbUtilityMeterData) => {
        return new Date(data.readDate);
      });
      maxNewStartDate = new Date(maxNew.readDate);
    }
    return {
      meter: meter,
      existingReadings: existingReadings,
      existingDateRange: {
        startDate: minExistingStartDate,
        endDate: maxExistingStartDate
      },
      newReadings: newReadings,
      newDateRange: {
        startDate: minNewStartDate,
        endDate: maxNewStartDate
      }
    }
  }
  getPredictorItem(predictor: IdbPredictor): {
    predictor: IdbPredictor,
    existingReadings: Array<IdbPredictorData>,
    existingDateRange: { startDate: Date, endDate: Date },
    newReadings: Array<IdbPredictorData>,
    newDateRange: { startDate: Date, endDate: Date }
  } {

    let existingReadings: Array<IdbPredictorData> = this.fileReference.predictorData.filter(pData => {
      return pData.predictorId == predictor.guid && pData.id != undefined
    });

    let minExistingStartDate: Date;
    let maxExistingStartDate: Date;
    if (existingReadings.length > 0) {
      let minExisting: IdbPredictorData = _.minBy(existingReadings, (data: IdbPredictorData) => {
        return new Date(data.date);
      });
      minExistingStartDate = new Date(minExisting.date);
      let maxExisting: IdbPredictorData = _.maxBy(existingReadings, (data: IdbPredictorData) => {
        return new Date(data.date);
      });
      maxExistingStartDate = new Date(maxExisting.date);
    }
    let newReadings: Array<IdbPredictorData> = this.fileReference.predictorData.filter(pData => {
      return pData.predictorId == predictor.guid && pData.id == undefined
    });
    let minNewStartDate: Date;
    let maxNewStartDate: Date;
    if (newReadings.length > 0) {
      let minNew: IdbPredictorData = _.minBy(newReadings, (data: IdbPredictorData) => {
        return new Date(data.date);
      });
      minNewStartDate = new Date(minNew.date);
      let maxNew: IdbPredictorData = _.maxBy(newReadings, (data: IdbPredictorData) => {
        return new Date(data.date);
      });
      maxNewStartDate = new Date(maxNew.date);
    }




    return {
      predictor: predictor,
      existingReadings: existingReadings,
      existingDateRange: {
        startDate: minExistingStartDate,
        endDate: maxExistingStartDate
      },
      newReadings: newReadings,
      newDateRange: {
        startDate: minNewStartDate,
        endDate: maxNewStartDate
      }
    }
  }
}

export interface ImportSummaryItem {
  facility: IdbFacility,
  newMeters: Array<{
    meter: IdbUtilityMeter,
    existingReadings: Array<IdbUtilityMeterData>,
    existingDateRange: { startDate: Date, endDate: Date },
    newReadings: Array<IdbUtilityMeterData>,
    newDateRange: { startDate: Date, endDate: Date }
  }>,
  existingMeters: Array<{
    meter: IdbUtilityMeter,
    existingReadings: Array<IdbUtilityMeterData>,
    existingDateRange: { startDate: Date, endDate: Date },
    newReadings: Array<IdbUtilityMeterData>,
    newDateRange: { startDate: Date, endDate: Date }
  }>,
  newPredictors: Array<{
    predictor: IdbPredictor,
    existingReadings: Array<IdbPredictorData>,
    existingDateRange: { startDate: Date, endDate: Date },
    newReadings: Array<IdbPredictorData>,
    newDateRange: { startDate: Date, endDate: Date }
  }>,
  existingPredictors: Array<{
    predictor: IdbPredictor,
    existingReadings: Array<IdbPredictorData>,
    existingDateRange: { startDate: Date, endDate: Date },
    newReadings: Array<IdbPredictorData>,
    newDateRange: { startDate: Date, endDate: Date }
  }>
}
