import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { FacilityHomeService } from '../facility-home.service';
import { Router } from '@angular/router';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { getDateFromMeterData, getLatestMeterData } from 'src/app/shared/dateHelperFunctions';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getAnalysisSetupErrors } from 'src/app/shared/validation/analysisValidation';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';

@Component({
  selector: 'app-facility-home-summary',
  templateUrl: './facility-home-summary.component.html',
  styleUrls: ['./facility-home-summary.component.css'],
  standalone: false
})
export class FacilityHomeSummaryComponent implements OnInit {


  facility: IdbFacility;
  lastBill: IdbUtilityMeterData;
  latestEnergyAnalysisItem: IdbAnalysisItem;
  latestWaterAnalysisItem: IdbAnalysisItem;
  sources: Array<MeterSource>;
  selectedFacilitySub: Subscription;

  waterAnalysisNeeded: boolean;
  energyAnalysisNeeded: boolean;
  meterReadingsNeeded: boolean;
  predictorsNeeded: boolean;
  includeWeatherData: boolean = false;
  showExportModal: boolean = false;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  energyAnalysisHasErrors: boolean;
  waterAnalysisHasErrors: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService, private facilityHomeService: FacilityHomeService,
    private router: Router,
    private utilityMeterDbService: UtilityMeterdbService,
    private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service,
    private loadingService: LoadingService,
    private calanderizatonService: CalanderizationService,
    private predictorDataDbService: PredictorDataDbService
  ) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.setFacilityStatus();
    });
    this.calanderizedMetersSub = this.calanderizatonService.calanderizedMeters.subscribe(calanderizedMeters => {
      this.calanderizedMeters = calanderizedMeters;
      this.setEnergyAnalysisHasErrors();
      this.setWaterAnalysisHasErrors();
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
  }

  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/' + urlStr);
    } else {
      this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/import-data');
    }
  }

  setFacilityStatus() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.lastBill = getLatestMeterData(facilityMeterData);
    this.setMeterReadingsNeeded();
    this.latestEnergyAnalysisItem = this.facilityHomeService.latestEnergyAnalysisItem;
    this.setEnergyAnalysisNeeded();
    this.latestWaterAnalysisItem = this.facilityHomeService.latestWaterAnalysisItem;
    this.setWaterAnalysisNeeded();
    this.setSources();
  }

  setMeterReadingsNeeded() {
    let currentDate: Date = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    if (this.lastBill) {
      let lastBillDate: Date = getDateFromMeterData(this.lastBill);
      if (lastBillDate < currentDate) {
        this.meterReadingsNeeded = true;
      } else {
        this.meterReadingsNeeded = false;
      }
    } else {
      this.meterReadingsNeeded = true;
    }
  }

  setEnergyAnalysisNeeded() {
    if (this.latestEnergyAnalysisItem) {
      this.energyAnalysisNeeded = false;
    } else if (this.facility.sustainabilityQuestions.energyReductionGoal) {
      this.energyAnalysisNeeded = true;
    } else {
      this.energyAnalysisNeeded = false;
    }
  }

  setWaterAnalysisNeeded() {
    if (this.latestWaterAnalysisItem) {
      this.waterAnalysisNeeded = false;
    } else if (this.facility.sustainabilityQuestions.waterReductionGoal) {
      this.waterAnalysisNeeded = true;
    } else {
      this.waterAnalysisNeeded = false;
    }
  }

  setEnergyAnalysisHasErrors() {
    if (this.latestEnergyAnalysisItem) {
      let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();
      this.energyAnalysisHasErrors = getAnalysisSetupErrors(this.latestEnergyAnalysisItem, this.calanderizedMeters, this.facility, predictorData).hasError;
    } else {
      this.energyAnalysisHasErrors = false;
    }
  }

  setWaterAnalysisHasErrors() {
    if (this.latestWaterAnalysisItem) {
      let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();
      this.waterAnalysisHasErrors = getAnalysisSetupErrors(this.latestWaterAnalysisItem, this.calanderizedMeters, this.facility, predictorData).hasError;
    } else {
      this.waterAnalysisHasErrors = false;
    }
  }

  setSources() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let sources: Array<MeterSource> = facilityMeters.map(meter => { return meter.source });
    this.sources = _.uniq(sources);
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
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.loadingService.setContext('export-facilities-to-excel');
    this.loadingService.setTitle('Exporting Facility');
    this.loadingService.setCurrentLoadingIndex(0);
    this.loadingService.addLoadingMessage('Exporting to .xlsx template');
    this.exportToExcelTemplateV3Service.exportFacilityData(this.includeWeatherData, selectedFacility.guid);
  }

  goToDataManagement() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid);
  }
}
