import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityGroupAnalysisItem, getGroupItem } from 'src/app/shared/facilityGroupItemFunction';

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
  facilityDetails: Array<IdbAnalysisItem> = [];

  constructor(private analysisDbService: AnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService) { }

  ngOnInit(): void {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.facilityDetails = [];
      this.executiveSummaryItems = [];
      if (this.analysisItem) {
        this.facilityDetails.push(this.analysisItem);
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
    this.analysisItem.groups.forEach(group => {
      let groupItem: FacilityGroupAnalysisItem = getGroupItem(group, this.analysisItem.facilityId, this.analysisItem.baselineYear);
      if (groupItem) {
        this.executiveSummaryItems.push(groupItem);
      }
    });
    this.executiveSummaryItems = this.executiveSummaryItems.filter(item => {
      return item.group.analysisType != 'skip';
    });
  }
}