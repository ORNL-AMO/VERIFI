import { Component, computed, effect, inject, OnInit, Signal } from '@angular/core';
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
import { AnalysisValidationService } from 'src/app/shared/validation/services/analysis-validation.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisSetupErrors } from 'src/app/models/validation';

@Component({
  selector: 'app-facility-home-summary',
  templateUrl: './facility-home-summary.component.html',
  styleUrls: ['./facility-home-summary.component.css'],
  standalone: false
})
export class FacilityHomeSummaryComponent {
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private router: Router = inject(Router);
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service = inject(ExportToExcelTemplateV3Service);
  private loadingService: LoadingService = inject(LoadingService);
  private analysisValidationService: AnalysisValidationService = inject(AnalysisValidationService);

  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  latestEnergyAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  navigationAfterLoading: Signal<string> = toSignal(this.loadingService.navigationAfterLoading, { initialValue: undefined });
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData, { initialValue: [] });
  facilityMeters: Signal<Array<IdbUtilityMeter>> = toSignal(this.utilityMeterDbService.facilityMeters, { initialValue: [] });
  analysisSetupErrors: Signal<Array<AnalysisSetupErrors>> = toSignal(this.analysisValidationService.analysisSetupErrors, { initialValue: undefined });

  lastBill: Signal<IdbUtilityMeterData> = computed(() => {
    let facilityMeterData = this.facilityMeterData();
    return getLatestMeterData(facilityMeterData);
  });

  sources: Signal<Array<MeterSource>> = computed(() => {
    let facilityMeters = this.facilityMeters();
    let sources: Array<MeterSource> = facilityMeters.map(meter => { return meter.source });
    return _.uniq(sources);
  });

  waterAnalysisNeeded: Signal<boolean> = computed(() => {
    const latestWaterAnalysisItem = this.latestWaterAnalysisItem();
    if (latestWaterAnalysisItem) {
      return false;
    } else {
      const facility = this.facility();
      if (facility?.sustainabilityQuestions.waterReductionGoal) {
        return true;
      } else {
        return false;
      }
    }
  });
  energyAnalysisNeeded: Signal<boolean> = computed(() => {
    const latestEnergyAnalysisItem = this.latestEnergyAnalysisItem()
    if (latestEnergyAnalysisItem) {
      return false;
    } else {
      const facility = this.facility();
      if (facility?.sustainabilityQuestions.energyReductionGoal) {
        return true;
      } else {
        return false;
      }
    }
  });

  meterReadingsNeeded: Signal<boolean> = computed(() => {
    let lastBill = this.lastBill();
    let currentDate: Date = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    if (lastBill) {
      let lastBillDate: Date = getDateFromMeterData(lastBill);
      if (lastBillDate < currentDate) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  });
  // predictorsNeeded: Signal<boolean> = computed(() => {
  //   const facility = this.facility();
  //   if (facility?.sustainabilityQuestions.predictorsNeeded) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // });
  includeWeatherData: boolean = false;
  showExportModal: boolean = false;

  energyAnalysisHasErrors: Signal<boolean> = computed(() => {
    const latestEnergyAnalysisItem = this.latestEnergyAnalysisItem();
    const analysisSetupErrors = this.analysisSetupErrors();
    if (latestEnergyAnalysisItem) {
      const setupErrors: AnalysisSetupErrors = analysisSetupErrors.find(error => error.analysisId === latestEnergyAnalysisItem.guid);
      if (setupErrors) {
        return setupErrors.hasError;
      } else {
        return false;
      }
    } else {
      return false;
    }
  });
  waterAnalysisHasErrors: Signal<boolean> = computed(() => {
    const latestWaterAnalysisItem = this.latestWaterAnalysisItem();
    const analysisSetupErrors = this.analysisSetupErrors();
    if (latestWaterAnalysisItem) {
      const setupErrors: AnalysisSetupErrors = analysisSetupErrors.find(error => error.analysisId === latestWaterAnalysisItem.guid);
      if (setupErrors) {
        return setupErrors.hasError;
      } else {
        return false;
      }
    } else {
      return false;
    }
  });
  constructor() {
    effect(() => {
      const loadingContext = this.navigationAfterLoading();
      if (loadingContext === 'export-facilities-to-excel') {
        this.exportToExcelTemplateV3Service.triggerExportDownload();
      }
    });

  }


  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/' + urlStr);
    } else {
      this.router.navigateByUrl('/data-management/' + this.facility().accountId + '/import-data');
    }
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
    this.exportToExcelTemplateV3Service.setExportFacilityDataMessages();
    this.loadingService.setCurrentLoadingIndex(0);
    this.exportToExcelTemplateV3Service.exportFacilityData(this.includeWeatherData, selectedFacility.guid);
  }

  goToDataManagement() {
    this.router.navigateByUrl('/data-management/' + this.facility().accountId + '/facilities/' + this.facility().guid);
  }
}
