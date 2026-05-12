import { Component, computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-utility-banner',
  templateUrl: './utility-banner.component.html',
  styleUrls: ['./utility-banner.component.css'],
  standalone: false
})
export class UtilityBannerComponent {
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service = inject(ExportToExcelTemplateV3Service);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private loadingService: LoadingService = inject(LoadingService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen, { initialValue: false });
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck, { initialValue: undefined });
  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  navigationAfterLoading: Signal<string> = toSignal(this.loadingService.navigationAfterLoading, { initialValue: undefined });

  facilityStatusCheck: Signal<FacilityStatusCheck> = computed(() => {
    const accountStatusCheck = this.accountStatusCheck();
    const selectedFacility = this.facility();
    if (!accountStatusCheck || !selectedFacility) return;
    return accountStatusCheck.facilityStatusChecks.find(fc => fc.facility.guid === selectedFacility.guid);
  });

  hasPredictorError: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!facilityStatusCheck) return false;
    return facilityStatusCheck.predictorsStatus != 'good';
  });

  hasMeterError: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!facilityStatusCheck) return false;
    return facilityStatusCheck.metersStatus != 'good';
  });

  hasMonthlyDataError: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!facilityStatusCheck) return false;
    return facilityStatusCheck.metersStatusChecks.some(msc => {
      return msc.hasNoCalendarizationMethod
    });
  });

  hasMeterGroupsError: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!facilityStatusCheck) return false;
    return facilityStatusCheck.hasNoMeterGroups;
  });

  includeWeatherData: boolean = false;
  showExportModal: boolean = false;
  constructor() {
    effect(() => {
      const context = this.navigationAfterLoading();
      if (context === 'export-facilities-to-excel') {
        this.exportToExcelTemplateV3Service.triggerExportDownload();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
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
    this.exportToExcelTemplateV3Service.exportFacilityData(this.includeWeatherData, this.facility()?.guid);
  }

  // setPredictorsNeedUpdate() {
  //   if (this.predictorTimer) {
  //     clearTimeout(this.predictorTimer)
  //   }
  //   this.predictorTimer = setTimeout(() => {
  //     let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(this.facility);
  //     this.predictorsNeedUpdate = (predictorsNeedUpdate.length > 0);
  //   }, 500);
  // }
}


