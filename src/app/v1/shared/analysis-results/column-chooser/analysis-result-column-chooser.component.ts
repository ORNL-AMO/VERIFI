import { Component, computed, inject, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AnalysisGroupPredictorVariable, AnalysisTableColumns } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisColumnPickerComponent } from '../column-picker/analysis-column-picker.component';
import { AnalysisColumnSection } from '../column-options/analysis-column-options.component';
import { AnalysisResultTablePeriod, AnalysisResultsDisplayService, DEFAULT_ANALYSIS_TABLE_COLUMNS } from '../display/analysis-results-display.service';
import { analysisResultColumnsForPeriod } from '../columns/analysis-result-columns';

export interface AnalysisResultColumnOption { readonly id: keyof AnalysisTableColumns; readonly label: string; }

@Component({
  selector: 'app-analysis-result-column-chooser', standalone: true,
  imports: [IconComponent, AnalysisColumnPickerComponent],
  templateUrl: './analysis-result-column-chooser.component.html'
})
export class AnalysisResultColumnChooserComponent {
  readonly period = input<AnalysisResultTablePeriod>('annual');
  readonly hasBanking = input(false);
  readonly showModeled = input(true);
  readonly predictorScopeId = input('');
  readonly predictorVariables = input<readonly AnalysisGroupPredictorVariable[]>([]);
  readonly open = signal(false);
  readonly annualOptions = computed(() => this.optionsForPeriod('annual'));
  readonly monthlyOptions = computed(() => this.optionsForPeriod('monthly').filter(option => this.showModeled() || option.id !== 'modeledEnergy'));
  readonly viewOptions = computed(() => this.period() === 'annual' ? this.annualOptions() : this.monthlyOptions());
  private readonly display = inject(AnalysisResultsDisplayService);
  private readonly controls = new Map<keyof AnalysisTableColumns, FormControl<boolean>>();
  private readonly predictorControls = new Map<string, FormControl<boolean>>();
  readonly pickerSections = computed<readonly AnalysisColumnSection[]>(() => [
    { id: 'results', label: this.period() === 'annual' ? 'Annual table' : 'Monthly table',
      options: this.viewOptions().map(option => ({ ...option, control: this.control(option.id) })) },
    ...(this.predictorVariables().length ? [{ id: 'predictors', label: 'Production variables',
      hint: 'Variables used in the analysis are selected by default.',
      options: this.predictorVariables().map(predictor => ({ id: predictor.id, label: predictor.name,
        usedInAnalysis: predictor.productionInAnalysis, control: this.predictorControl(predictor.id) })) }] : [])
  ]);

  openSlideout(): void {
    this.syncPredictors();
    const columns = this.display.columns(this.period());
    for (const option of this.viewOptions()) this.control(option.id).setValue(columns[option.id] === true, { emitEvent: false });
    for (const predictor of columns.predictors) this.predictorControl(predictor.predictor.id).setValue(predictor.display, { emitEvent: false });
    this.open.set(true);
  }
  closeSlideout(): void { this.open.set(false); }
  apply(): void {
    const columns: Partial<AnalysisTableColumns> = {};
    for (const option of this.viewOptions()) Object.assign(columns, { [option.id]: this.control(option.id).value });
    this.display.setColumns(this.period(), columns);
    const scopeId = this.predictorScopeId();
    if (scopeId) this.display.setPredictorVisibility(this.period(), scopeId, Object.fromEntries(this.predictorVariables().map(p => [p.id, this.predictorControl(p.id).value])));
    this.closeSlideout();
  }
  showAll(): void { this.setAll(true); }
  hideAll(): void { this.setAll(false); }
  useDefaults(): void {
    for (const option of this.viewOptions()) {
      const value = DEFAULT_ANALYSIS_TABLE_COLUMNS[option.id];
      this.control(option.id).setValue(typeof value === 'boolean' ? value : false, { emitEvent: false });
    }
    for (const predictor of this.predictorVariables()) this.predictorControl(predictor.id).setValue(predictor.productionInAnalysis, { emitEvent: false });
  }
  control(column: keyof AnalysisTableColumns): FormControl<boolean> {
    let control = this.controls.get(column);
    if (!control) { control = new FormControl(false, { nonNullable: true }); this.controls.set(column, control); }
    return control;
  }
  predictorControl(predictorId: string): FormControl<boolean> {
    let control = this.predictorControls.get(predictorId);
    if (!control) { control = new FormControl(false, { nonNullable: true }); this.predictorControls.set(predictorId, control); }
    return control;
  }
  private optionsForPeriod(period: AnalysisResultTablePeriod): readonly AnalysisResultColumnOption[] {
    return analysisResultColumnsForPeriod(period, this.hasBanking()).map(column => ({ id: column.id, label: column.selectionLabel ?? column.label }));
  }
  private setAll(visible: boolean): void {
    for (const option of this.viewOptions()) this.control(option.id).setValue(visible, { emitEvent: false });
    for (const predictor of this.predictorVariables()) this.predictorControl(predictor.id).setValue(visible, { emitEvent: false });
  }
  private syncPredictors(): void {
    const scopeId = this.predictorScopeId();
    if (scopeId) this.display.syncPredictors(this.period(), scopeId, this.predictorVariables());
  }
}
