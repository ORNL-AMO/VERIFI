import { Component, computed, Input } from '@angular/core';
import { FacilityGroupAnalysisItem } from '../../calculations/regression-models.service';
import { AnalysisGroup } from 'src/app/models/analysis';

@Component({
  selector: 'app-regression-model-details-table',
  standalone: false,
  templateUrl: './regression-model-details-table.component.html',
  styleUrl: './regression-model-details-table.component.css',
})
export class RegressionModelDetailsTable {
  @Input({ required: true })
  models: Array<FacilityGroupAnalysisItem>

  hasUserDefinedModel = computed(() =>
    this.models.some(model => model.selectedModel?.isUserDefinedModel)
  );
}
