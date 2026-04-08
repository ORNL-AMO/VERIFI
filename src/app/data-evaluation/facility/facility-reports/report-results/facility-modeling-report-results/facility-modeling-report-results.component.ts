import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-facility-modeling-report-results',
  standalone: false,
  templateUrl: './facility-modeling-report-results.component.html',
  styleUrl: './facility-modeling-report-results.component.css',
})
export class FacilityModelingReportResultsComponent {

  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  analysisItem: IdbAnalysisItem;

  constructor(private analysisDbService: AnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private regressionModelsService: RegressionModelsService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.executiveSummaryItems = [];
      if (this.analysisItem) {
        this.initializeFacilityGroups();
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
}