import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getHasDuplicateReadings } from 'src/app/shared/helper-pipes/invalid-meter.pipe';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-utility-banner',
  templateUrl: './utility-banner.component.html',
  styleUrls: ['./utility-banner.component.css'],
  standalone: false
})
export class UtilityBannerComponent implements OnInit {

  modalOpen: boolean;
  modalOpenSub: Subscription;

  facility: IdbFacility;
  facilitySub: Subscription;

  predictorDataSub: Subscription;
  meterDataSub: Subscription;
  predictorsNeedUpdate: boolean;
  metersHaveErrors: boolean;
  predictorTimer: any;
  meterDataTimer: any;
  meterData: Array<IdbUtilityMeterData>;
  constructor(private sharedDataService: SharedDataService,
    private exportToExcelTemplateService: ExportToExcelTemplateService, private facilityDbService: FacilitydbService,
    private predictorDataHelperService: PredictorDataHelperService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.setPredictorsNeedUpdate();
      this.setMetersHaveErrors();
    });
    this.predictorDataSub = this.predictorDataDbService.accountPredictorData.subscribe(val => {
      this.setPredictorsNeedUpdate();
    });
    this.meterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.meterData = val;
      this.setPredictorsNeedUpdate();
      this.setMetersHaveErrors();
    })
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.predictorDataSub.unsubscribe();
    this.meterDataSub.unsubscribe();
  }

  exportData() {
    this.exportToExcelTemplateService.exportFacilityData(this.facility.guid);
  }

  setPredictorsNeedUpdate() {
    if (this.predictorTimer) {
      clearTimeout(this.predictorTimer)
    }
    this.predictorTimer = setTimeout(() => {
      let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(this.facility);
      this.predictorsNeedUpdate = (predictorsNeedUpdate.length > 0);
    }, 500);
  }

  setMetersHaveErrors() {
    if (this.meterData) {
      if (this.meterDataTimer) {
        clearTimeout(this.meterDataTimer)
      }
      this.meterDataTimer = setTimeout(() => {
        let utilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facility.guid);
        let metersHaveErrors: boolean = false;
        for (let m = 0; m < utilityMeters.length; m++) {
          let hasDupReadings: boolean = getHasDuplicateReadings(utilityMeters[m].guid, this.meterData).length > 0;
          if (hasDupReadings) {
            metersHaveErrors = true;
          }
        }
        this.metersHaveErrors = metersHaveErrors;
      }, 500);
    }
  }
}


