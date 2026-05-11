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

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);
  facilities: Signal<Array<IdbFacility>> = toSignal(this.facilityDbService.accountFacilities);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  accountReports: Signal<Array<IdbAccountReport>> = toSignal(this.accountReportDbService.accountReports);

  showInUseMessage: Signal<boolean> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const reports = this.accountReports();
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
      return hasCorrespondingReport && this.accountAnalysisService.hideInUseMessage == false;
    }
    return false;
  });

  constructor() {
    effect(() => {
      if(!this.selectedAnalysisItem()) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard')
      }
    })
  }

  selectFacility(facilityId: string) {
    const facilities = this.facilities();
    let selectedFacility: IdbFacility = facilities.find(facility => facility.guid === facilityId);
    this.facilityDbService.selectedFacility.next(selectedFacility);
  }

  hideInUseMessage() {
    this.accountAnalysisService.hideInUseMessage = true;
  }
}
