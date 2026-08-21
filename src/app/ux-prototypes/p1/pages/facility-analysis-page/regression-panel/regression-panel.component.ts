import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { cloneP1AnalysisWithGroup, getP1SelectedModel } from '../facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-facility-analysis-regression-panel',
  templateUrl: './regression-panel.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisRegressionPanelComponent {
  @Input({ required: true }) analysis: IdbAnalysisItem;
  @Input({ required: true }) group: AnalysisGroup;
  @Input() canWrite = false;

  @Output() saveAnalysis = new EventEmitter<IdbAnalysisItem>();

  readonly selectedModel = getP1SelectedModel;

  selectModel(modelId: string): void {
    this.saveGroup({ ...structuredClone(this.group), selectedModelId: modelId });
  }

  updateUserDefined(key: 'regressionConstant' | 'regressionModelYear', value: number): void {
    this.saveGroup({ ...structuredClone(this.group), [key]: value });
  }

  private saveGroup(group: AnalysisGroup): void {
    this.saveAnalysis.emit(cloneP1AnalysisWithGroup(this.analysis, group));
  }
}
