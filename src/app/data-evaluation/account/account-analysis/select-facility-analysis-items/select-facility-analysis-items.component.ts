import { Component, computed, effect, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';

interface FacilityListItem {
  facility: IdbFacility;
  analysisItemId: string;
  analysisStatusCheck: AnalysisStatusCheck;
}

@Component({
  selector: 'app-select-facility-analysis-items',
  templateUrl: './select-facility-analysis-items.component.html',
  styleUrls: ['./select-facility-analysis-items.component.css'],
  standalone: false
})
export class SelectFacilityAnalysisItemsComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private router: Router = inject(Router);
  private accountAnalysisService: AccountAnalysisService = inject(AccountAnalysisService);
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);
  facilities: Signal<Array<IdbFacility>> = toSignal(this.facilityDbService.accountFacilities);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  accountReports: Signal<Array<IdbAccountReport>> = toSignal(this.accountReportDbService.accountReports);
  hideInUseMessage: Signal<boolean> = toSignal(this.accountAnalysisService.hideInUseMessage);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  facilityList: Signal<Array<FacilityListItem>> = computed(() => {
    const facilities = this.facilities();
    const facilityAnalysisItems = this.facilityAnalysisItems();
    const analysisItem = this.selectedAnalysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if (!facilities || !facilityAnalysisItems || !analysisItem || !accountStatusCheck) {
      return [];
    }
    return analysisItem.facilityAnalysisItems.map(facilityItem => {
      const facility = facilities.find(fac => fac.guid === facilityItem.facilityId);
      const facilityStatusCheck = accountStatusCheck.getFacilityStatusCheckByFacilityId(facilityItem.facilityId);
      const analysisStatusCheck = facilityStatusCheck?.getAnalysisStatusById(facilityItem.analysisItemId);
      return {
        facility: facility,
        analysisItemId: facilityItem.analysisItemId,
        analysisStatusCheck: analysisStatusCheck
      }
    });
  });

  configuredCount: Signal<number> = computed(() => {
    return this.facilityList().filter(item => item.analysisItemId != null && item.analysisItemId !== undefined).length;
  });

  showInUseMessage: Signal<boolean> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const reports = this.accountReports();
    const hideInUseMessage = this.hideInUseMessage();
    if (hideInUseMessage) {
      return false;
    }
    if (selectedItem && reports) {
      const hasCorrespondingReport = reports.some(report => {
        if (report.reportType == 'betterPlants' && report.betterPlantsReportSetup.analysisItemId == selectedItem.guid) {
          return true;
        } else if (report.reportType == 'analysis' && report.analysisReportSetup.analysisItemId == selectedItem.guid) {
          return true;
        } else if (report.reportType == 'accountSavings' && report.accountSavingsReportSetup.analysisItemId == selectedItem.guid) {
          return true;
        } else if (report.reportType == 'performance' && report.performanceReportSetup.analysisItemId == selectedItem.guid) {
          return true;
        }
        return false;
      });
      return hasCorrespondingReport;
    }
    return false;
  });

  constructor() {
    effect(() => {
      if (!this.selectedAnalysisItem()) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard')
      }
    });

    effect(() => {
      const selectedFacility = this.selectedFacility();
      const facilities = this.facilities();
      if (!selectedFacility && facilities && facilities.length > 0) {
        this.facilityDbService.selectedFacility.next(facilities[0]);
      }
    });
  }

  selectFacility(facilityId: string) {
    const facilities = this.facilities();
    let selectedFacility: IdbFacility = facilities.find(facility => facility.guid === facilityId);
    this.facilityDbService.selectedFacility.next(selectedFacility);
  }

  toggleHideInUseMessage() {
    this.accountAnalysisService.hideInUseMessage.next(true);
  }
}
