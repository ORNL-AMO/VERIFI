import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

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
      let groupItem: FacilityGroupAnalysisItem = this.getGroupItem(group, this.analysisItem.facilityId, this.analysisItem.baselineYear);
      if (groupItem) {
        this.executiveSummaryItems.push(groupItem);
      }
    });
    this.executiveSummaryItems = this.executiveSummaryItems.filter(item => {
      return item.group.analysisType != 'skip';
    });
  }

  getGroupItem(group: AnalysisGroup, facilityId: string, baselineYear: number): FacilityGroupAnalysisItem {
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
      if (group.selectedModelId) {
        selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
      }
    }
    return {
      group: group,
      selectedModel: selectedModel,
      facilityId: facilityId,
      baselineYear: baselineYear
    }
  }
}

export interface FacilityGroupAnalysisItem {
  group: AnalysisGroup,
  selectedModel: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}
