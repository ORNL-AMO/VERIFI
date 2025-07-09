import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { FacilityGroupAnalysisItem } from '../analysis-report.component';

@Component({
  selector: 'app-analysis-facility-report',
  standalone: false,

  templateUrl: './analysis-facility-report.component.html',
  styleUrl: './analysis-facility-report.component.css'
})
export class AnalysisFacilityReportComponent {

  @Input()
  facilityDetails: Array<IdbAnalysisItem>;
  @Input()
  analysisReportSetup: AnalysisReportSetup;
  @Input()
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = [];
  absoluteGroupItems: Array<FacilityGroupAnalysisItem> = [];
  selectedReport: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService) { }

  ngOnChanges() {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
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




