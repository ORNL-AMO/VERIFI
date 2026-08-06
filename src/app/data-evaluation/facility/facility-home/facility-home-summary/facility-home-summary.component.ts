import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, Signal } from '@angular/core';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { getLatestMeterData } from 'src/app/shared/dateHelperFunctions';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-facility-home-summary',
  templateUrl: './facility-home-summary.component.html',
  styleUrls: ['./facility-home-summary.component.css'],
  standalone: false
})
export class FacilityHomeSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service = inject(ExportToExcelTemplateV3Service);
  private loadingService: LoadingService = inject(LoadingService);

  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  navigationAfterLoading: Signal<string> = toSignal(this.loadingService.navigationAfterLoading, { initialValue: undefined });
  facilityMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.facilityMeterData()]);
  facilityMeters: Signal<Array<IdbUtilityMeter>> = computed(() => [...this.accountWorkspaceStore.facilityMeters()]);

  lastBill: Signal<IdbUtilityMeterData> = computed(() => {
    let facilityMeterData = this.facilityMeterData();
    return getLatestMeterData(facilityMeterData);
  });

  sources: Signal<Array<MeterSource>> = computed(() => {
    let facilityMeters = this.facilityMeters();
    let sources: Array<MeterSource> = facilityMeters.map(meter => { return meter.source });
    return _.uniq(sources);
  });

  includeWeatherData: boolean = false;
  showExportModal: boolean = false;

  constructor() {
    effect(() => {
      const loadingContext = this.navigationAfterLoading();
      if (loadingContext === 'export-facilities-to-excel') {
        this.exportToExcelTemplateV3Service.triggerExportDownload();
        this.loadingService.navigationAfterLoading.next(undefined);
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
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
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
