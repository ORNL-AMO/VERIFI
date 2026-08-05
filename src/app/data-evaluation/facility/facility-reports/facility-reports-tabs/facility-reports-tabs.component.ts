import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { FacilityReportStatusCheck } from 'src/app/calculations/status-check-calculations/facilityReportStatusCheck';

@Component({
  selector: 'app-facility-reports-tabs',
  templateUrl: './facility-reports-tabs.component.html',
  styleUrl: './facility-reports-tabs.component.css',
  standalone: false
})
export class FacilityReportsTabsComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private facilityReportsDbService: FacilityReportsDbService = inject(FacilityReportsDbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  modalOpen: Signal<boolean> = toSignal(this.sharedDataService.modalOpen);
  selectedReport: Signal<IdbFacilityReport> = toSignal(this.facilityReportsDbService.selectedReport);
  reportList: Signal<Array<IdbFacilityReport>> = toSignal(this.facilityReportsDbService.facilityReports);
  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  analysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);

  selectedReportStatusCheck: Signal<FacilityReportStatusCheck> = computed(() => {
    const report = this.selectedReport();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (report && facilityStatusCheck) {
      const reportCheck = facilityStatusCheck.facilityReportStatusChecks.find(check => check.guid === report.guid);
      return reportCheck;
    }
    return undefined;
  });

  analysisVisited: Signal<boolean> = computed(() => {
    const selectedReport = this.selectedReport();
    const analysisItems = this.analysisItems();
    if (selectedReport) {
      let analysisItem: IdbAnalysisItem = analysisItems.find(item => item.guid === selectedReport.analysisItemId);
      return analysisItem ? analysisItem.isAnalysisVisited : false;
    }
    return false;
  });

  url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  inDashboard: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('dashboard');
  });

  showDropdown: boolean = false;

  goToDashboard() {
    const facility = this.facility();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/reports/dashboard');
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbFacilityReport) {
    this.facilityReportsDbService.selectedReport.next(item);
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/reports/setup');
    this.showDropdown = false;
  }
}
