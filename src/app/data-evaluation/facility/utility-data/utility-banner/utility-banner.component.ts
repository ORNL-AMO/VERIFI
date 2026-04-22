import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';
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
  predictorTimer: any;
  meterData: Array<IdbUtilityMeterData>;
  includeWeatherData: boolean = false;
  showExportModal: boolean = false;
  loadingSub: Subscription;
  constructor(private sharedDataService: SharedDataService,
    private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service, private facilityDbService: FacilitydbService,
    private predictorDataHelperService: PredictorDataHelperService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private loadingService: LoadingService
  ) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.setPredictorsNeedUpdate();
    });
    this.predictorDataSub = this.predictorDataDbService.accountPredictorData.subscribe(val => {
      this.setPredictorsNeedUpdate();
    });
    this.meterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.meterData = val;
      this.setPredictorsNeedUpdate();
    });
    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'export-facilities-to-excel') {
        this.exportToExcelTemplateV3Service.triggerExportDownload();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.predictorDataSub.unsubscribe();
    this.meterDataSub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  openExportModal() {
    this.includeWeatherData = false;
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
  }

  exportData() {
    this.showExportModal = false;
    this.loadingService.setContext('export-facilities-to-excel');
    this.loadingService.setTitle('Exporting Facility');
    this.exportToExcelTemplateV3Service.setExportFacilityDataMessages();
    this.loadingService.setCurrentLoadingIndex(0);
    this.exportToExcelTemplateV3Service.exportFacilityData(this.includeWeatherData, this.facility.guid);
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
}


