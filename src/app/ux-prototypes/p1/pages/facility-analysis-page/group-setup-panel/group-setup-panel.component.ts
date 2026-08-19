import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AnalysisGroup, AnalysisGroupPredictorVariable, AnalysisType } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { cloneP1AnalysisWithGroup, getP1AnalysisTypeLabel } from '../facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-facility-analysis-group-setup-panel',
  templateUrl: './group-setup-panel.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisGroupSetupPanelComponent {
  @Input({ required: true }) analysis: IdbAnalysisItem;
  @Input({ required: true }) group: AnalysisGroup;
  @Input() canWrite = false;

  @Output() saveAnalysis = new EventEmitter<IdbAnalysisItem>();

  readonly typeLabel = getP1AnalysisTypeLabel;
  readonly analysisTypes: AnalysisType[] = ['absoluteEnergyConsumption', 'energyIntensity', 'regression', 'skip'];

  saveGroup(group: AnalysisGroup): void {
    this.saveAnalysis.emit(cloneP1AnalysisWithGroup(this.analysis, group));
  }

  updateType(value: AnalysisType): void {
    this.saveGroup({ ...structuredClone(this.group), analysisType: value });
  }

  updatePredictor(predictor: AnalysisGroupPredictorVariable, productionInAnalysis: boolean): void {
    const updatedGroup = structuredClone(this.group);
    updatedGroup.predictorVariables = updatedGroup.predictorVariables.map(item =>
      item.id === predictor.id ? { ...item, productionInAnalysis } : item
    );
    this.saveGroup(updatedGroup);
  }

  updateBanking(applyBanking: boolean): void {
    this.saveGroup({ ...structuredClone(this.group), applyBanking });
  }
}
