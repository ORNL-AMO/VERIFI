import { Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AnalysisGroupPredictorVariable, AnalysisTableColumns } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { AnalysisResultTablePeriod, DEFAULT_ANALYSIS_TABLE_COLUMNS, FacilityAnalysisResultsDisplayService } from '../facility-analysis-results-display.service';

export interface AnalysisResultColumnOption {
  readonly id: keyof AnalysisTableColumns;
  readonly label: string;
}

const ANNUAL_COLUMN_OPTIONS: readonly AnalysisResultColumnOption[] = [
  { id: 'actualEnergy', label: 'Actual use' },
  { id: 'adjusted', label: 'Adjusted' },
  { id: 'baselineAdjustmentForNormalization', label: 'Baseline adjustment for normalization' },
  { id: 'baselineAdjustmentForOther', label: 'Baseline adjustment for other' },
  { id: 'baselineAdjustment', label: 'Total baseline adjustment' },
  { id: 'SEnPI', label: 'SEnPI' },
  { id: 'bankedSavings', label: 'Banked savings' },
  { id: 'savingsUnbanked', label: 'Unbanked savings' },
  { id: 'savings', label: 'Savings' },
  { id: 'totalSavingsPercentImprovement', label: 'Total savings % improvement' },
  { id: 'newSavings', label: 'New savings' },
  { id: 'annualSavingsPercentImprovement', label: 'Annual savings % improvement' },
  { id: 'cummulativeSavings', label: 'Cumulative savings' }
];

const MONTHLY_COLUMN_OPTIONS: readonly AnalysisResultColumnOption[] = [
  { id: 'actualEnergy', label: 'Actual use' },
  { id: 'modeledEnergy', label: 'Modeled use' },
  { id: 'adjusted', label: 'Adjusted' },
  { id: 'baselineAdjustmentForNormalization', label: 'Baseline adjustment for normalization' },
  { id: 'baselineAdjustmentForOther', label: 'Baseline adjustment for other' },
  { id: 'baselineAdjustment', label: 'Total baseline adjustment' },
  { id: 'SEnPI', label: 'SEnPI' },
  { id: 'bankedSavings', label: 'Banked savings' },
  { id: 'savingsUnbanked', label: 'Unbanked savings' },
  { id: 'savings', label: 'Savings' },
  { id: 'rollingSavings', label: 'Rolling savings' },
  { id: 'rolling12MonthImprovement', label: 'Rolling 12-month improvement' }
];

@Component({
  selector: 'app-analysis-result-column-chooser',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, WorkspaceSlideoutComponent],
  templateUrl: './analysis-result-column-chooser.component.html',
  styleUrls: ['./analysis-result-column-chooser.component.css']
})
export class AnalysisResultColumnChooserComponent {
  readonly period = input<AnalysisResultTablePeriod>('annual');
  readonly hasBanking = input(false);
  readonly showModeled = input(true);
  readonly predictorScopeId = input('');
  readonly predictorVariables = input<readonly AnalysisGroupPredictorVariable[]>([]);
  readonly open = signal(false);
  readonly annualOptions = computed(() => this.optionsForBanking(ANNUAL_COLUMN_OPTIONS));
  readonly monthlyOptions = computed(() => this.optionsForBanking(MONTHLY_COLUMN_OPTIONS)
    .filter(option => this.showModeled() || option.id !== 'modeledEnergy'));
  readonly viewOptions = computed(() => this.period() === 'annual' ? this.annualOptions() : this.monthlyOptions());

  private readonly display = inject(FacilityAnalysisResultsDisplayService);
  private readonly controls = new Map<keyof AnalysisTableColumns, FormControl<boolean>>();
  private readonly predictorControls = new Map<string, FormControl<boolean>>();

  openSlideout(): void {
    this.syncPredictors();
    const columns = this.display.columns(this.period());
    for (const option of this.allOptions()) {
      this.control(option.id).setValue(columns[option.id] === true, { emitEvent: false });
    }
    for (const predictor of columns.predictors) {
      this.predictorControl(predictor.predictor.id).setValue(predictor.display, { emitEvent: false });
    }
    this.open.set(true);
  }

  closeSlideout(): void {
    this.open.set(false);
  }

  apply(): void {
    const columns: Partial<AnalysisTableColumns> = {};
    for (const option of this.allOptions()) {
      Object.assign(columns, { [option.id]: this.control(option.id).value });
    }
    this.display.setColumns(this.period(), columns);
    const scopeId = this.predictorScopeId();
    if (scopeId) {
      this.display.setPredictorVisibility(this.period(), scopeId, Object.fromEntries(
        this.predictorVariables().map(predictor => [predictor.id, this.predictorControl(predictor.id).value])
      ));
    }
    this.closeSlideout();
  }

  showAll(): void {
    this.setAll(true);
  }

  hideAll(): void {
    this.setAll(false);
  }

  useDefaults(): void {
    for (const option of this.allOptions()) {
      const value = DEFAULT_ANALYSIS_TABLE_COLUMNS[option.id];
      this.control(option.id).setValue(typeof value === 'boolean' ? value : false, { emitEvent: false });
    }
    for (const predictor of this.predictorVariables()) {
      this.predictorControl(predictor.id).setValue(predictor.productionInAnalysis, { emitEvent: false });
    }
  }

  control(column: keyof AnalysisTableColumns): FormControl<boolean> {
    let control = this.controls.get(column);
    if (!control) {
      control = new FormControl(false, { nonNullable: true });
      this.controls.set(column, control);
    }
    return control;
  }

  predictorControl(predictorId: string): FormControl<boolean> {
    let control = this.predictorControls.get(predictorId);
    if (!control) {
      control = new FormControl(false, { nonNullable: true });
      this.predictorControls.set(predictorId, control);
    }
    return control;
  }

  private allOptions(): readonly AnalysisResultColumnOption[] {
    return this.viewOptions();
  }

  private optionsForBanking(options: readonly AnalysisResultColumnOption[]): readonly AnalysisResultColumnOption[] {
    return this.hasBanking()
      ? options
      : options.filter(option => option.id !== 'bankedSavings' && option.id !== 'savingsUnbanked');
  }

  private setAll(visible: boolean): void {
    for (const option of this.allOptions()) {
      this.control(option.id).setValue(visible, { emitEvent: false });
    }
    for (const predictor of this.predictorVariables()) {
      this.predictorControl(predictor.id).setValue(visible, { emitEvent: false });
    }
  }

  private syncPredictors(): void {
    const scopeId = this.predictorScopeId();
    if (scopeId) this.display.syncPredictors(this.period(), scopeId, this.predictorVariables());
  }
}
