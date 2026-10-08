import { Component, computed, input, output } from '@angular/core';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { RegressionModelValidationComponent } from '../model-validation/regression-model-validation.component';
import { RegressionModelValidationState, groupWithGeneratedModel } from '../regression-model-validation.service';
import { formatRegressionNumber } from '@app/v1/facility/analysis/regression-number-format';
import { modeledQuantityLabel } from '../regression-labels';

@Component({
  selector: 'app-regression-model-review-slideout',
  standalone: true,
  imports: [WorkspaceSlideoutComponent, IconComponent, RegressionModelValidationComponent],
  templateUrl: './regression-model-review-slideout.component.html',
  styleUrls: ['./regression-model-review-slideout.component.css']
})
export class RegressionModelReviewSlideoutComponent {
  readonly model = input.required<JStatRegressionModel>();
  readonly group = input.required<AnalysisGroup>();
  readonly analysis = input.required<IdbAnalysisItem>();
  readonly currentModel = input<JStatRegressionModel | undefined>();
  readonly validationState = input.required<RegressionModelValidationState>();

  readonly closed = output<void>();
  readonly selected = output<JStatRegressionModel>();
  readonly retryRequested = output<void>();

  readonly isCurrent = computed(() => this.model().modelId === this.group().selectedModelId);
  readonly modeledQuantityLabel = computed(() => modeledQuantityLabel(this.analysis().analysisCategory));
  readonly reviewGroup = computed(() => groupWithGeneratedModel(this.group(), this.model()));
  readonly coefficients = computed(() => this.model().predictorVariables.map((variable, index) => ({
    id: variable.id,
    name: variable.name,
    coefficient: formatRegressionNumber(this.model().coef[index + 1]),
    pValue: formatRegressionNumber(this.model().t?.p?.[index + 1])
  })));
  readonly equation = computed(() => [
    formatRegressionNumber(this.model().coef[0]),
    ...this.model().predictorVariables.map((variable, index) => `(${formatRegressionNumber(this.model().coef[index + 1])} × ${variable.name})`)
  ].join(' + '));
  readonly summary = computed(() => ({
    adjustedR2: formatRegressionNumber(this.model().adjust_R2),
    r2: formatRegressionNumber(this.model().R2),
    pValue: formatRegressionNumber(this.model().modelPValue),
    constant: formatRegressionNumber(this.model().coef[0])
  }));
  readonly comparison = computed(() => ({
    candidate: {
      adjustedR2: formatRegressionNumber(this.model().adjust_R2, '—'),
      r2: formatRegressionNumber(this.model().R2, '—'),
      pValue: formatRegressionNumber(this.model().modelPValue, '—')
    },
    current: {
      adjustedR2: formatRegressionNumber(this.currentModel()?.adjust_R2, '—'),
      r2: formatRegressionNumber(this.currentModel()?.R2, '—'),
      pValue: formatRegressionNumber(this.currentModel()?.modelPValue, '—')
    }
  }));
}
