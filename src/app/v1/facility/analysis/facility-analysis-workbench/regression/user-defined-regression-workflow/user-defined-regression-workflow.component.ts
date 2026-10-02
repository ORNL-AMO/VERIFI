import { Component, computed, input, output } from '@angular/core';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { RegressionModelValidationComponent } from '../model-validation/regression-model-validation.component';
import { RegressionModelValidationState, modelPeriodMonthCount, userDefinedValidationMessage } from '../regression-model-validation.service';
import { formatRegressionNumber } from '../regression-number-format';

export type RegressionRangeField = 'regressionModelStartMonth' | 'regressionStartYear' | 'regressionModelEndMonth' | 'regressionEndYear';
export type RegressionUserField = 'regressionConstant' | 'regressionModelNotes';

@Component({
  selector: 'app-user-defined-regression-workflow',
  standalone: true,
  imports: [RegressionModelValidationComponent],
  templateUrl: './user-defined-regression-workflow.component.html',
  styleUrls: ['./user-defined-regression-workflow.component.css']
})
export class UserDefinedRegressionWorkflowComponent {
  readonly group = input.required<AnalysisGroup>();
  readonly analysis = input.required<IdbAnalysisItem>();
  readonly months = input.required<readonly { readonly name: string; readonly monthNumValue: number }[]>();
  readonly yearOptions = input.required<readonly number[]>();
  readonly validationState = input.required<RegressionModelValidationState>();
  readonly hasDataIssue = input(false);

  readonly predictorToggled = output<string>();
  readonly coefficientChanged = output<{ predictorId: string; event: Event }>();
  readonly rangeChanged = output<{ field: RegressionRangeField; event: Event }>();
  readonly valueChanged = output<{ field: RegressionUserField; event: Event }>();
  readonly validationRetryRequested = output<void>();

  readonly rangeMonths = computed(() => modelPeriodMonthCount(this.group()));
  readonly formMessage = computed(() => userDefinedValidationMessage(this.group()));
  readonly equation = computed(() => {
    const group = this.group();
    return [
      formatRegressionNumber(group.regressionConstant, '—'),
      ...group.predictorVariables
        .filter(predictor => predictor.productionInAnalysis)
        .map(predictor => `(${formatRegressionNumber(predictor.regressionCoefficient, '—')} × ${predictor.name})`)
    ].join(' + ');
  });
  readonly rangeComplete = computed(() => [
    this.group().regressionModelStartMonth,
    this.group().regressionStartYear,
    this.group().regressionModelEndMonth,
    this.group().regressionEndYear
  ].every(value => Number.isFinite(value)));
}
