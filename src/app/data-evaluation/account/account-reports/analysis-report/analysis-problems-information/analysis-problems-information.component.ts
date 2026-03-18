import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { FacilityGroupAnalysisItem } from 'src/app/shared/facilityGroupItemFunction';

@Component({
  selector: 'app-analysis-problems-information',
  standalone: false,
  templateUrl: './analysis-problems-information.component.html',
  styleUrl: './analysis-problems-information.component.css'
})
export class AnalysisProblemsInformationComponent {

  @Input()
  facilityDetails: Array<IdbAnalysisItem>;
  @Input()
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  @Input({ required: false })
  isDataCheck: boolean;
  @Input({ required: false })
  isFacilityReport: boolean;
  
  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  criticalItems: Array<FacilityGroupAnalysisItem> = [];
  moderateItems: Array<FacilityGroupAnalysisItem> = [];
  minorItems: Array<FacilityGroupAnalysisItem> = [];
  selectedReport: IdbAccountReport;
  facilityReport: IdbFacilityReport;

  constructor(private accountReportDbService: AccountReportDbService,
    private facilityReportsDbService: FacilityReportsDbService  
  ) { }

  ngOnChanges() {
    if(this.isFacilityReport) {
      this.facilityReport = this.facilityReportsDbService.selectedReport.getValue();
    }
    else {
      this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    }
    this.getRegressionGroupItems(this.executiveSummaryItems);
    this.getCriticalItems(this.regressionGroupItems);
    this.getModerateItems(this.regressionGroupItems);
    this.getMinorItems(this.regressionGroupItems);
  }

  getRegressionGroupItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.regressionGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }

  getCriticalItems(regressionGroupItems: Array<FacilityGroupAnalysisItem>) {
    this.criticalItems = regressionGroupItems.filter(item => {
      return (item.group.analysisType == 'regression' && !item.selectedModel.isValid);
    });
  }

  getModerateItems(regressionGroupItems: Array<FacilityGroupAnalysisItem>) {
    this.moderateItems = regressionGroupItems.filter(item => {
      return (item.group.analysisType == 'regression' && !item.selectedModel.SEPValidationPass && item.selectedModel.dataValidationNotes && item.selectedModel.dataValidationNotes.length > 0);
    });
  }

  getMinorItems(regressionGroupItems: Array<FacilityGroupAnalysisItem>) {
    this.minorItems = regressionGroupItems.filter(item => {
      return (item.group.analysisType == 'regression' && item.selectedModel.modelNotes && item.selectedModel.modelNotes.length > 0);
    });
  }
}
