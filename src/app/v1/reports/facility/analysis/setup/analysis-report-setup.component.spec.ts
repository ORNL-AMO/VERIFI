import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { facilityAnalysisReportFixture } from '../testing/analysis-report-test-fixtures';
import { ReportAnalysisSelectionComponent } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.component';
import { AnalysisReportSetupComponent } from './analysis-report-setup.component';
import { getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';
describe('facility report setup controls', () => {
  it('preserves stored options during hydration and filters without saving or changing the selected analysis', async () => {
    const { snapshot, report, meters } = facilityAnalysisReportFixture();
    const view = await setupReportWorkbench([report], [{ provide: WorkspaceCalendarizationService,
      useValue: { calendarizeBase: () => of({ state: 'ready', meters }), project: () => ({ state: 'ready', meters }) } }], snapshot);
    const workbench = await view.open('facility-report');
    const setup = view.harness.routeDebugElement!.query(By.directive(ReportAnalysisSelectionComponent)).componentInstance as ReportAnalysisSelectionComponent;
    expect(workbench.editor.form.controls.settings.controls.reportYear.value).toBe(2023);
    const root = view.harness.routeNativeElement!;
    expect(root.querySelector('.report-setup-top #report-workbench-name')).not.toBeNull();
    expect(root.querySelector<HTMLSelectElement>('.report-setup-top #facility-analysis-report-year')?.required).toBe(true);
    expect(root.querySelector('label[for=facility-analysis-report-year]')?.textContent).toContain('Report year *');
    expect(root.querySelector('#report-configuration-heading')).toBeNull();
    expect(root.querySelector('#report-name-help')).toBeNull();
    setup.form.controls.baselineYear.setValue(2000); view.harness.detectChanges();
    expect(setup.filteredCards()).toHaveLength(0); expect(setup.hiddenSelection()).toBeDefined();
    expect(workbench.editor.form.controls.analysis.value).toBe('facility-analysis');
    expect(view.updateSetup).not.toHaveBeenCalled(); expect(view.store.committedRevision()).toBeUndefined();
    workbench.editor.form.controls.settings.controls.analysisTableColumns.controls.energy.setValue(false);
    expect(workbench.editor.form.controls.settings.controls.analysisTableColumns.controls.actualEnergy.value).toBe(false);
    expect(await workbench.editor.flush()).toBe(true); expect(view.updateSetup).toHaveBeenCalledOnce();
  });

  it('applies each content preset without changing the year, linked analysis, columns or predictor choices', async () => {
    const fixture = facilityAnalysisReportFixture();
    fixture.report.analysisReportSettings.groupModelDetails = false;
    fixture.report.analysisReportSettings.analysisTableColumns.predictors = [{
      predictor: { id: 'saved-guid', name: 'Saved variable', unit: 'units', production: true, productionInAnalysis: true, regressionCoefficient: 1 },
      display: false, usedInAnalysis: true
    }];
    const { root, view, workbench } = await openSetup(fixture);
    const before = structuredClone(workbench.editor.form.controls.settings.getRawValue());
    const expected = [
      ['Facility Annual Summary', true, false, false, false, false],
      ['Facility+Groups Annual Summary', true, false, true, false, false],
      ['Facility Detail', true, true, false, false, false],
      ['Facility+Groups Detail', true, true, true, true, false],
      ['Full Analysis', true, true, true, true, true]
    ] as const;
    expect(root.querySelectorAll('.content-preset')).toHaveLength(6);
    expect(root.querySelector('.content-presets input')).toBeNull();
    for (const [label, annual, monthly, groupAnnual, groupMonthly, modelDetails] of expected) {
      selectPreset(root, label); view.harness.detectChanges();
      const settings = workbench.editor.form.controls.settings.getRawValue();
      expect(settings).toMatchObject({ reportYear: before.reportYear, facilityAnnualResults: annual, facilityMonthlyResults: monthly,
        groupReports: groupAnnual, groupAnnualResults: groupAnnual, groupMonthlyResults: groupMonthly, groupModelDetails: modelDetails });
      expect(settings.analysisTableColumns).toEqual(before.analysisTableColumns);
      expect(workbench.editor.form.controls.analysis.value).toBe('facility-analysis');
      expect(root.querySelector('.content-preset[aria-pressed=true]')?.textContent).toContain(label);
    }
    expect(await workbench.editor.flush()).toBe(true);
    expect(view.updateSetup).toHaveBeenCalledOnce();
    expect(view.updateSetup.mock.calls[0][2].analysisReportSettings.analysisTableColumns).toBeUndefined();
    expect(view.updateSetup.mock.calls[0][2].analysisReportSettings.reportYear).toBeUndefined();
    expect(view.updateSetup.mock.calls[0][2].analysisItemId).toBeUndefined();
    const table = root.querySelector<HTMLInputElement>('[data-content-section=facilityAnnualResults] td.content-format input')!;
    table.click(); view.harness.detectChanges();
    expect(root.querySelector('.content-preset[aria-pressed=true]')?.textContent).toContain('Custom');
    expect(root.querySelector('.options-grid')).toBeNull();
    expect(root.textContent).not.toContain('Configuration:');
    expect(root.textContent).not.toContain('Presets change');
    expect(root.querySelector('[data-content-section=groupModelDetails]')?.textContent).not.toContain('statistics, validation');
  });

  it('lets Custom keep the current configuration without scheduling a save', async () => {
    const { root, view, workbench, setup } = await openSetup();
    const before = workbench.editor.form.getRawValue();
    selectPreset(root, 'Custom'); view.harness.detectChanges();
    expect(setup.presetControl.value).toBe('custom');
    expect(workbench.editor.form.getRawValue()).toEqual(before);
    expect(workbench.editor.needsProtection()).toBe(false);
    expect(view.updateSetup).not.toHaveBeenCalled();
    workbench.editor.name.setValue('New name'); view.harness.detectChanges();
    expect(setup.presetControl.value).toBe('custom');
  });

  it('keeps disabled sections visible and preserves their detailed choices through save and re-enable', async () => {
    const { root, view, workbench } = await openSetup();
    selectPreset(root, 'Full Analysis'); view.harness.detectChanges();
    const before = workbench.editor.form.controls.settings.getRawValue();
    const groupToggle = root.querySelector<HTMLInputElement>('.content-scope input')!;
    groupToggle.click(); view.harness.detectChanges();
    const groupRow = root.querySelector('[data-content-section=groupMonthlyResults]')!;
    expect(groupRow).not.toBeNull();
    expect([...groupRow.querySelectorAll('input')].every(input => input.disabled)).toBe(true);
    expect(workbench.editor.form.controls.settings.getRawValue()).toMatchObject({
      groupReports: false, groupMonthlyResultsTable: before.groupMonthlyResultsTable,
      groupMonthlyResultsTableModelYear: before.groupMonthlyResultsTableModelYear, groupMonthlyResultsGraphs: before.groupMonthlyResultsGraphs
    });
    expect(await workbench.editor.flush()).toBe(true); view.harness.detectChanges();
    expect([...groupRow.querySelectorAll('input')].every(input => input.disabled)).toBe(true);
    groupToggle.click(); view.harness.detectChanges();
    expect([...groupRow.querySelectorAll('input')].every(input => !input.disabled && input.checked)).toBe(true);
    const facilityToggle = root.querySelector<HTMLInputElement>('[data-content-section=facilityMonthlyResults] th input')!;
    facilityToggle.click(); view.harness.detectChanges();
    expect(root.querySelector<HTMLInputElement>('[data-content-section=facilityMonthlyResults] td input')!.disabled).toBe(true);
    expect(workbench.editor.form.controls.settings.getRawValue().facilityMonthlyResultsTable).toBe(true);
    const beforePending = workbench.editor.form.controls.settings.getRawValue();
    view.store.setPending({ id: 99, label: 'Another workspace operation' }); view.harness.detectChanges();
    expect([...root.querySelectorAll<HTMLButtonElement>('.content-preset')].every(button => button.disabled)).toBe(true);
    expect(root.querySelector<HTMLInputElement>('[data-content-section=facilityAnnualResults] input')!.disabled).toBe(true);
    view.store.clearPending(99); view.harness.detectChanges();
    expect(root.querySelector<HTMLInputElement>('[data-content-section=facilityAnnualResults] input')!.disabled).toBe(false);
    expect(root.querySelector<HTMLInputElement>('[data-content-section=facilityMonthlyResults] td input')!.disabled).toBe(true);
    expect(workbench.editor.form.controls.settings.getRawValue()).toEqual(beforePending);
  });

  it('shows columns inline without writes and preserves bulk/reset and GUID-based production variable choices', async () => {
    const fixture = facilityAnalysisReportFixture();
    const variable = { id: 'production-guid', name: 'A long production variable', unit: 'units', production: true, productionInAnalysis: true, regressionCoefficient: 1 };
    fixture.analysis.groups[0].predictorVariables = [variable];
    fixture.report.analysisReportSettings.analysisTableColumns.predictors = [{ predictor: { ...variable, name: 'Older label' }, display: false, usedInAnalysis: true }];
    const { root, view, workbench } = await openSetup(fixture);
    const before = structuredClone(workbench.editor.form.controls.settings.getRawValue().analysisTableColumns);
    expect(before).toMatchObject({ baselineAdjustmentForNormalization: true, baselineAdjustmentForOther: true, baselineAdjustment: true });
    expect(root.querySelector('.report-table-columns app-analysis-column-options')).not.toBeNull();
    expect(root.querySelector('app-analysis-column-picker')).toBeNull();
    expect(view.updateSetup).not.toHaveBeenCalled();
    expect(workbench.editor.form.controls.settings.getRawValue().analysisTableColumns).toEqual(before);
    const predictorLabel = [...root.querySelectorAll<HTMLLabelElement>('.analysis-result-columns__check')].find(label => label.textContent?.includes(variable.name))!;
    expect(predictorLabel).toBeDefined(); expect(predictorLabel.querySelector('input')!.checked).toBe(false);
    click(root, 'Hide All'); view.harness.detectChanges();
    expect(workbench.editor.form.controls.settings.getRawValue().analysisTableColumns).toMatchObject({ energy: false, actualEnergy: false, incrementalImprovement: false, productionVariables: false });
    click(root, 'Show All'); view.harness.detectChanges();
    expect(workbench.editor.form.controls.settings.getRawValue().analysisTableColumns).toMatchObject({ energy: true, actualEnergy: true, incrementalImprovement: true, productionVariables: true, predictors: [{ predictor: { id: variable.id }, display: true }] });
    click(root, 'Reset columns'); view.harness.detectChanges();
    expect(workbench.editor.form.controls.settings.getRawValue().analysisTableColumns).toMatchObject({ ...getAnalysisReportSettings().analysisTableColumns, incrementalImprovement: true,
      baselineAdjustmentForNormalization: false, baselineAdjustmentForOther: false, baselineAdjustment: false,
      predictors: [{ predictor: variable, display: true, usedInAnalysis: true }] });
    expect(await workbench.editor.flush()).toBe(true); expect(view.updateSetup).toHaveBeenCalledOnce();
  });

  it('hides inline columns when no effective table is included without clearing their settings', async () => {
    const { root, view, workbench } = await openSetup();
    selectPreset(root, 'Facility Detail'); view.harness.detectChanges();
    const settings = workbench.editor.form.controls.settings;
    const columns = structuredClone(settings.getRawValue().analysisTableColumns);
    settings.patchValue({ facilityAnnualResultsTable: false, facilityMonthlyResultsTable: false }); view.harness.detectChanges();
    expect(root.querySelector('.report-table-columns')).toBeNull();
    // Group table switches are retained, but their parent sections are excluded.
    expect(settings.getRawValue().groupAnnualResultsTable).toBe(true);
    settings.patchValue({ groupReports: true, groupModelDetails: true }); view.harness.detectChanges();
    expect(root.querySelector('.report-table-columns')).toBeNull();
    settings.patchValue({ groupAnnualResults: true }); view.harness.detectChanges();
    expect(root.querySelector('.report-table-columns')).not.toBeNull();
    expect(settings.getRawValue().analysisTableColumns).toEqual(columns);
    settings.patchValue({ groupReports: false }); view.harness.detectChanges();
    expect(root.querySelector('.report-table-columns')).toBeNull();
    settings.patchValue({ facilityAnnualResultsTable: true }); view.harness.detectChanges();
    expect(root.querySelector('.report-table-columns')).not.toBeNull();
    expect(settings.getRawValue().analysisTableColumns).toEqual(columns);
  });
});

async function openSetup(fixture = facilityAnalysisReportFixture()) {
  const view = await setupReportWorkbench([fixture.report], [{ provide: WorkspaceCalendarizationService,
    useValue: { calendarizeBase: () => of({ state: 'ready', meters: fixture.meters }), project: () => ({ state: 'ready', meters: fixture.meters }) } }], fixture.snapshot);
  const workbench = await view.open('facility-report'); view.harness.detectChanges();
  const setup = view.harness.routeDebugElement!.query(By.directive(AnalysisReportSetupComponent)).componentInstance as AnalysisReportSetupComponent;
  return { view, workbench, setup, root: view.harness.routeNativeElement! };
}
function click(root: HTMLElement, label: string): void {
  const button = [...root.querySelectorAll('button')].find(item => item.textContent?.trim() === label);
  expect(button).toBeDefined(); button!.click();
}
function selectPreset(root: HTMLElement, label: string): void {
  const option = [...root.querySelectorAll<HTMLButtonElement>('.content-preset')].find(item => item.textContent?.trim() === label);
  expect(option).toBeDefined(); option!.click();
}
