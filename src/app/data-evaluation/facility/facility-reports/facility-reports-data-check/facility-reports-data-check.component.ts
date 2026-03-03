import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

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
  facilityDetails: Array<IdbAnalysisItem> = [];

  constructor(private analysisDbService: AnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService
  ) { }

  ngOnInit(): void {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      if (this.analysisItem) {
        this.facilityDetails.push(this.analysisItem);
      }
      this.initializeFacilityGroups();
      this.setAnalysisVisited();
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

  async setAnalysisVisited() {
    if (this.analysisItem) {
      this.analysisItem.isAnalysisVisited = true;
      this.analysisItem.dataCheckedDate = new Date();
      await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
      this.analysisDbService.analysisVisited.next();
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      await this.dbChangesService.setAnalysisItems(account, false, selectedFacility);
      this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
    }
  }
}

export interface FacilityGroupAnalysisItem {
  group: AnalysisGroup,
  selectedModel: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}
