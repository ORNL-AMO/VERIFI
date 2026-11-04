import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormRecord } from '@angular/forms';
import { Router } from '@angular/router';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { AnalysisInventoryResultsService } from '@app/v1/analysis/inventory/analysis-inventory-results.service';
import { AnalysisColumnSection } from '@app/v1/shared/analysis-results/column-options/analysis-column-options.component';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { reportAnalysisSelectionCard } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.models';
import { REPORT_ANALYSIS_ORIGIN_QUERY } from '@app/v1/reports/shared/analysis-inspection/report-analysis-origin';
import { ReportAnalysisInspectionController } from '@app/v1/reports/shared/analysis-inspection/report-analysis-inspection-controller';
import { getAnalysisReportDefaults } from '../analysis-report-defaults';
import { getSelectedRegressionModel } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { FacilityAnalysisReportService } from '../analysis-report.service';
import { COLUMN_OPTIONS, SectionKey } from '../analysis-report-settings';
import { matchingReportContentPreset, REPORT_CONTENT_GROUPS, REPORT_CONTENT_PRESETS, ReportContentPreset, reportContentPresetChanges } from './analysis-report-content';

@Component({ selector: 'app-analysis-report-setup', standalone: false,
  templateUrl: './analysis-report-setup.component.html', styleUrls: ['./analysis-report-setup.component.css'], providers: [AnalysisInventoryResultsService] })
export class AnalysisReportSetupComponent {
  readonly report = inject(FacilityAnalysisReportService);
  readonly context = this.report.context;
  readonly editor = this.report.editor;
  readonly inventories = inject(AnalysisInventoryWorkspaceService);
  private readonly outcomes = inject(AnalysisInventoryResultsService);
  private readonly router = inject(Router);
  readonly entries = computed(() => this.inventories.entries().filter(entry => entry.scope === 'facility'
    && entry.facility.guid === this.context.facility()?.guid));
  readonly analysisCards = computed(() => this.entries().map(entry => reportAnalysisSelectionCard(
    entry.card.analysis.guid, entry.card.analysis, entry.card.status, this.inventories.statusState())));
  readonly showCategory = computed(() => new Set(this.entries().map(entry => entry.card.analysis.analysisCategory)).size > 1);
  readonly unavailableSelection = computed(() => !!this.editor.draft().analysis && !this.editor.selectedAnalysis());
  readonly unavailableYear = computed(() => this.editor.draft().settings?.reportYear != null
    && this.report.calendarizationState() === 'ready' && !this.report.periods().includes(this.editor.draft().settings!.reportYear!));
  readonly contentGroups = REPORT_CONTENT_GROUPS;
  readonly contentPresets = REPORT_CONTENT_PRESETS;
  readonly selectedPreset = computed(() => {
    const settings = this.editor.draft().settings;
    return settings ? matchingReportContentPreset(settings) : undefined;
  });
  readonly presetControl = new FormControl<ReportContentPreset['id'] | 'custom'>('custom', { nonNullable: true });
  readonly hasIncludedTables = computed(() => {
    const settings = this.editor.draft().settings;
    return !!settings && this.contentGroups.some(group => (!group.key || settings[group.key])
      && group.rows.some(row => row.usesResultColumns && settings[row.key] && !!row.table && settings[row.table]));
  });
  readonly columnSections = [
    { key: 'use' as const, label: 'Consumption columns', control: this.editor.form.controls.settings.controls.analysisTableColumns.controls.energy },
    { key: 'improvement' as const, label: 'Improvement columns', control: this.editor.form.controls.settings.controls.analysisTableColumns.controls.incrementalImprovement }
  ].map(section => ({ ...section, options: COLUMN_OPTIONS.filter(option => option.section === section.key) }));
  readonly predictorOptions = computed(() => {
    const analysis = this.editor.selectedAnalysis(), columns = this.editor.draft().settings?.analysisTableColumns;
    const variables = new Map((analysis?.groups ?? []).filter(group => !['skip', 'skipAnalysis'].includes(group.analysisType))
      .flatMap(group => [...(group.predictorVariables ?? []), ...(getSelectedRegressionModel(group)?.predictorVariables ?? [])])
      .map(variable => [variable.id, variable]));
    return [...variables.values()].map(predictor => ({ predictor,
      display: columns?.predictors.find(item => item.predictor.id === predictor.id)?.display ?? (!!columns?.productionVariables && !!predictor.productionInAnalysis),
      usedInAnalysis: !!predictor.productionInAnalysis }));
  });
  readonly predictorForm = new FormRecord<FormControl<boolean>>({});
  private readonly predictorColumnOptions = signal<AnalysisColumnSection['options']>([]);
  readonly columnOptionSections = computed<readonly AnalysisColumnSection[]>(() => [
    ...this.columnSections.map(section => ({ id: section.key, label: section.label,
      options: section.options.map(option => ({ id: option.key, label: option.label,
        control: this.editor.form.controls.settings.controls.analysisTableColumns.controls[option.key] })) })),
    { id: 'predictors', label: 'Production variables', options: this.predictorColumnOptions() }
  ]);
  readonly columnSummary = computed(() => {
    const columns = this.editor.draft().settings?.analysisTableColumns;
    return this.columnSections.map(section => `${section.label.replace(' columns', '')}: ${section.options.filter(option => columns?.[option.key]).length} selected`)
      .concat(`Production variables: ${this.predictorOptions().filter(option => option.display).length} selected`).join(' · ');
  });
  private readonly inspection = new ReportAnalysisInspectionController({
    key: this.context.key, canSelect: this.editor.canEdit,
    find: guid => this.entries().find(entry => entry.card.analysis.guid === guid),
    setDemand: entries => this.outcomes.setDemand(entries),
    select: (_value, entry) => this.editor.form.controls.analysis.setValue(entry.card.analysis.guid),
    flush: () => this.editor.flush(),
    navigate: async entry => {
      const report = this.context.report();
      if (!report || entry.scope !== 'facility') return;
      await this.router.navigate(this.context.navigation.facilityAnalysisWorkbenchRoute(entry.facility.guid, entry.card.analysis.guid), { queryParams: {
        [REPORT_ANALYSIS_ORIGIN_QUERY.accountGuid]: report.accountId, [REPORT_ANALYSIS_ORIGIN_QUERY.reportGuid]: report.guid,
        [REPORT_ANALYSIS_ORIGIN_QUERY.scope]: 'facility', [REPORT_ANALYSIS_ORIGIN_QUERY.facilityGuid]: report.facilityId
      } });
    }
  });
  readonly openingAnalysis = this.inspection.opening;
  readonly inspected = computed(() => {
    const entry = this.inspection.entry();
    return entry ? { ...entry, outcomeDisplay: analysisOutcomeDisplay(this.outcomes.states()[entry.key] ?? { state: 'loading', message: 'Results not loaded' }, entry.card.category) } : undefined;
  });
  constructor() {
    effect(() => {
      this.context.key();
      this.presetControl.setValue(this.selectedPreset()?.id ?? 'custom', { emitEvent: false });
    });
    effect(() => {
      if (this.editor.canEdit()) this.presetControl.enable({ emitEvent: false });
      else this.presetControl.disable({ emitEvent: false });
    });
    this.presetControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(id => {
      const preset = this.contentPresets.find(option => option.id === id);
      if (preset) this.applyContentPreset(preset);
    });
    effect(() => {
      const settings = this.editor.draft().settings, canEdit = this.editor.canEdit();
      const controls = this.editor.form.controls.settings.controls;
      if (!settings) return;
      for (const group of this.contentGroups) for (const row of group.rows) {
        const groupEnabled = canEdit && (!group.key || settings[group.key]);
        const contentEnabled = groupEnabled && settings[row.key];
        const setEnabled = (key: SectionKey, enabled: boolean) => {
          const control = controls[key];
          if (enabled && control.disabled) control.enable({ emitEvent: false });
          else if (!enabled && control.enabled) control.disable({ emitEvent: false });
        };
        setEnabled(row.key, groupEnabled);
        if (row.table) setEnabled(row.table, contentEnabled);
        if (row.charts) setEnabled(row.charts, contentEnabled);
        for (const period of row.periods) setEnabled(period.key, contentEnabled && !!row.table && settings[row.table]);
      }
    });
    effect(() => {
      const options = this.predictorOptions(), ids = new Set(options.map(item => item.predictor.id));
      for (const id of Object.keys(this.predictorForm.controls)) if (!ids.has(id)) this.predictorForm.removeControl(id, { emitEvent: false });
      for (const option of options) {
        const control = this.predictorForm.controls[option.predictor.id];
        if (control) control.setValue(option.display, { emitEvent: false });
        else this.predictorForm.addControl(option.predictor.id, new FormControl(option.display, { nonNullable: true }), { emitEvent: false });
      }
      if (this.editor.canEdit()) this.predictorForm.enable({ emitEvent: false }); else this.predictorForm.disable({ emitEvent: false });
      this.predictorColumnOptions.set(options.map(option => ({ id: option.predictor.id,
        label: option.predictor.name + (option.predictor.unit ? ` (${option.predictor.unit})` : ''),
        usedInAnalysis: option.usedInAnalysis, control: this.predictorForm.controls[option.predictor.id] })));
    });
    const columns = this.editor.form.controls.settings.controls.analysisTableColumns;
    this.editor.form.controls.analysis.valueChanges.pipe(takeUntilDestroyed()).subscribe(guid => {
      const analysis = this.context.workspace.facilityAnalyses().find(item => item.guid === guid && item.facilityId === this.context.facility()?.guid);
      if (!analysis) return;
      const previous = columns.controls.predictors.value;
      const variables = new Map(analysis.groups.filter(group => !['skip', 'skipAnalysis'].includes(group.analysisType))
        .flatMap(group => [...group.predictorVariables, ...(getSelectedRegressionModel(group)?.predictorVariables ?? [])]).map(variable => [variable.id, variable]));
      columns.controls.predictors.setValue([...variables.values()].map(predictor => ({ predictor, usedInAnalysis: !!predictor.productionInAnalysis,
        display: previous.find(item => item.predictor.id === predictor.id)?.display ?? (!!columns.controls.productionVariables.value && !!predictor.productionInAnalysis) })), { emitEvent: false });
    });
    for (const section of this.columnSections) section.control.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      for (const option of section.options) columns.controls[option.key].setValue(value, { emitEvent: false });
    });
    columns.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      columns.controls.energy.setValue(this.columnSections[0].options.some(option => columns.controls[option.key].value), { emitEvent: false });
      columns.controls.incrementalImprovement.setValue(this.columnSections[1].options.some(option => columns.controls[option.key].value), { emitEvent: false });
    });
    columns.controls.productionVariables.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      columns.controls.predictors.setValue(this.predictorOptions().map(option => ({ ...option, display: value })), { emitEvent: false });
    });
    this.predictorForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(values => {
      const selections = this.predictorOptions().map(option => ({ ...option, display: values[option.predictor.id] ?? false }));
      columns.controls.productionVariables.setValue(selections.some(option => option.display), { emitEvent: false });
      columns.controls.predictors.setValue(selections);
    });
  }
  applyContentPreset(preset: ReportContentPreset): void {
    if (!this.editor.canEdit()) return;
    this.editor.form.controls.settings.patchValue(reportContentPresetChanges(preset));
  }
  setColumnSection(id: string, visible: boolean): void {
    if (!this.editor.canEdit()) return;
    const columns = this.editor.form.controls.settings.controls.analysisTableColumns.controls;
    if (id === 'predictors') columns.productionVariables.setValue(visible);
    else this.columnSections.find(section => section.key === id)?.control.setValue(visible);
  }
  setAllColumns(visible: boolean): void {
    for (const section of this.columnOptionSections()) this.setColumnSection(section.id, visible);
  }
  resetColumns(): void {
    if (!this.editor.canEdit()) return;
    const defaults = getAnalysisReportDefaults().analysisTableColumns;
    const predictors = this.predictorOptions().map(option => ({ ...option, display: option.usedInAnalysis }));
    this.editor.form.controls.settings.controls.analysisTableColumns.patchValue({ ...defaults, incrementalImprovement: true, predictors });
  }
  inspect(guid: string): void { this.inspection.inspect(guid); }
  closeInspection(): void { this.inspection.close(); }
  selectInspected(): void { this.inspection.select(); }
  goToAnalysis(): Promise<void> { return this.inspection.goToAnalysis(); }
}
