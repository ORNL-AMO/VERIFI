import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-facility-reports-data-check',
  standalone: false,
  templateUrl: './facility-reports-data-check.component.html',
  styleUrl: './facility-reports-data-check.component.css',
})
export class FacilityReportsDataCheckComponent {

  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  analysisItem: IdbAnalysisItem;
  
  constructor(private analysisDbService: AnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private regressionModelsService: RegressionModelsService
  ) { }

  ngOnInit(): void {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.executiveSummaryItems = [];
      if (this.analysisItem) {
        this.initializeFacilityGroups();
        this.setAnalysisVisited();
      }
    });
  }

  ngOnDestroy() {
    if (this.facilityReportSub) {
      this.facilityReportSub.unsubscribe();
    }
  }

  initializeFacilityGroups() {
    let facility: IdbFacility = this.facilityDbService.getFacilityById(this.analysisItem.facilityId);
    let reportYear: number;
    if (this.facilityReport.facilityReportType == 'analysis') {
      reportYear = this.facilityReport.analysisReportSettings.reportYear;
    } else if (this.facilityReport.facilityReportType == 'modeling') {
      reportYear = this.facilityReport.modelingReportSettings.reportYear;
    } else if (this.facilityReport.facilityReportType == 'savings') {
      reportYear = this.facilityReport.savingsReportSettings.endYear;
    }

    this.analysisItem.groups.forEach(group => {
      if (group.analysisType == 'regression') {
        let groupItem: FacilityGroupAnalysisItem = this.regressionModelsService.getGroupModelItem(group, facility, this.analysisItem, reportYear);
        if (groupItem) {
          this.executiveSummaryItems.push(groupItem);
        }
      } else if (group.analysisType != 'skip') {
        this.executiveSummaryItems.push({
          group: group,
          facilityId: facility.guid,
          baselineYear: this.analysisItem.baselineYear,
          selectedModel: undefined
        });
      }
    });
  }

  async setAnalysisVisited() {
    if (this.analysisItem) {
      this.analysisItem.isAnalysisVisited = true;
      this.analysisItem.dataCheckedDate = new Date();
      await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      await this.dbChangesService.setAnalysisItems(account, false, selectedFacility);
      this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
    }
  }
}