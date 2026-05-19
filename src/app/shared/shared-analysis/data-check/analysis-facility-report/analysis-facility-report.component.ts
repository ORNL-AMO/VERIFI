import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-analysis-facility-report',
  standalone: false,

  templateUrl: './analysis-facility-report.component.html',
  styleUrl: './analysis-facility-report.component.css'
})
export class AnalysisFacilityReportComponent {
  @Input({ required: false })
  isDataCheck: boolean;
  @Input()
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  @Input()
  facilityReport: IdbFacilityReport;
  @Input()
  accountReport: IdbAccountReport;

  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = [];
  absoluteGroupItems: Array<FacilityGroupAnalysisItem> = [];
  showTitle: boolean = false;
  reportTitle: string;

  constructor(private accountReportDbService: AccountReportDbService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnChanges() {
    this.setReportTitle();
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

  setReportTitle() {
    if (this.facilityReport) {
      this.reportTitle = this.facilityReport.name;
      if(this.facilityReport && this.facilityReport.facilityReportType === 'modeling' && this.facilityReport.modelingReportSettings && !this.facilityReport.modelingReportSettings.includeIssuesSummary) {
        this.showTitle = true;
      }
    }
    else if(this.accountReport) {
      this.reportTitle = this.accountReport.name;
      if(this.accountReport && this.accountReport.analysisReportSetup && !this.accountReport.analysisReportSetup.includeProblemsInformation) {
        this.showTitle = true;
      }
    }
  }
}




