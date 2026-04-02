import { Component, Input } from '@angular/core';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-analysis-problems-information',
  standalone: false,
  templateUrl: './analysis-problems-information.component.html',
  styleUrl: './analysis-problems-information.component.css'
})
export class AnalysisProblemsInformationComponent {
  @Input({ required: false })
  isDataCheck: boolean;
  @Input()
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  @Input()
  facilityReport: IdbFacilityReport;
  @Input()
  accountReport: IdbAccountReport;


  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  criticalItems: Array<FacilityGroupAnalysisItem> = [];
  moderateItems: Array<FacilityGroupAnalysisItem> = [];
  minorItems: Array<FacilityGroupAnalysisItem> = [];

  constructor() { }

  ngOnChanges() {
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
