import { Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RegressionModelValidationComponent } from '../model-validation/regression-model-validation.component';
import { RegressionModelValidationState, modelPeriodMonthCount, userDefinedValidationMessage } from '../regression-model-validation.service';
import { formatRegressionNumber } from '../regression-number-format';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';

@Component({
  selector: 'app-user-defined-regression-workflow',
  standalone: true,
  imports: [RegressionModelValidationComponent, ReactiveFormsModule],
  templateUrl: './user-defined-regression-workflow.component.html',
  styleUrls: ['./user-defined-regression-workflow.component.css']
})
export class UserDefinedRegressionWorkflowComponent {
  readonly workflow = inject(FacilityAnalysisRegressionFacade);
  readonly controller = inject(FacilityAnalysisRegressionController);
  readonly group = this.workflow.group;
  readonly analysis = this.workflow.analysis;
  readonly months = this.workflow.months;
  readonly yearOptions = this.workflow.yearOptions;
  readonly validationState = this.workflow.validation.state;
  readonly hasDataIssue = this.workflow.hasUserDefinedDataIssue;

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
