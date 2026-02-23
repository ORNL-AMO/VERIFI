import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { FacilityGroupAnalysisItem } from '../analysis-report.component';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';

@Component({
  selector: 'app-analysis-facility-report',
  standalone: false,

  templateUrl: './analysis-facility-report.component.html',
  styleUrl: './analysis-facility-report.component.css'
})
export class AnalysisFacilityReportComponent {

  @Input()
  facilityDetails: Array<IdbAnalysisItem>;
  @Input( { required: false })
  analysisReportSetup: AnalysisReportSetup;
  @Input()
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  @Input({ required: false })
  isDataCheck: boolean;
  @Input({ required: false })
  isFacilityReport: boolean;
  
  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = [];
  absoluteGroupItems: Array<FacilityGroupAnalysisItem> = [];
  selectedReport: IdbAccountReport;
  facilityReport:IdbFacilityReport;
  showTitle: boolean = false;

  constructor(private accountReportDbService: AccountReportDbService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnChanges() {
    if(this.isFacilityReport) {
      this.facilityReport = this.facilityReportsDbService.selectedReport.getValue();
      if(this.facilityReport && !this.facilityReport.modelingReportSettings.includeIssuesSummary) {
        this.showTitle = true;
      }
    }
    else {
      this.selectedReport = this.accountReportDbService.selectedReport.getValue();
      if (this.analysisReportSetup && !this.analysisReportSetup.includeProblemsInformation) {
        this.showTitle = true;
      }
    }
    
    this.getRegressionGroupItems(this.executiveSummaryItems);
    this.getClassicIntensityItems(this.executiveSummaryItems);
    this.getAbsoluteItems(this.executiveSummaryItems);
  }

  getRegressionGroupItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.regressionGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }

  getClassicIntensityItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.classicIntensityGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'energyIntensity';
    });
  }

  getAbsoluteItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.absoluteGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'absoluteEnergyConsumption';
    });
  }
}




