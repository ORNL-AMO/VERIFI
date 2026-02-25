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
  energyAnalysisHasErrors: boolean;
  waterAnalysisHasErrors: boolean;
  includeWeatherData: boolean = false;
  showExportModal: boolean = false;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService, private facilityHomeService: FacilityHomeService,
    private router: Router,
    private utilityMeterDbService: UtilityMeterdbService,
    private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service,
    private loadingService: LoadingService
  ) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.setFacilityStatus();
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
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
    this.setAnalysisErrors();
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
    let currentDate: Date = new Date();
    if (this.latestEnergyAnalysisItem) {
      if (this.latestEnergyAnalysisItem.reportYear < currentDate.getFullYear() - 1) {
        this.energyAnalysisNeeded = true;
      } else {
        this.energyAnalysisNeeded = false;
      }
    } else if (this.facility.sustainabilityQuestions.energyReductionGoal) {
      this.energyAnalysisNeeded = true;
    } else {
      this.energyAnalysisNeeded = false;
    }
  }

  setWaterAnalysisNeeded() {
    let currentDate: Date = new Date();
    if (this.latestWaterAnalysisItem) {
      if (this.latestWaterAnalysisItem.reportYear < currentDate.getFullYear() - 1) {
        this.waterAnalysisNeeded = true;
      } else {
        this.waterAnalysisNeeded = false;
      }
    } else if (this.facility.sustainabilityQuestions.waterReductionGoal) {
      this.waterAnalysisNeeded = true;
    } else {
      this.waterAnalysisNeeded = false;
    }
  }

  setAnalysisErrors() {
    if (this.latestEnergyAnalysisItem) {
      this.energyAnalysisHasErrors = this.latestEnergyAnalysisItem.setupErrors.hasError || this.latestEnergyAnalysisItem.setupErrors.groupsHaveErrors;
    }
    if (this.latestWaterAnalysisItem) {
      this.waterAnalysisHasErrors = this.latestWaterAnalysisItem.setupErrors.hasError || this.latestWaterAnalysisItem.setupErrors.groupsHaveErrors;
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
