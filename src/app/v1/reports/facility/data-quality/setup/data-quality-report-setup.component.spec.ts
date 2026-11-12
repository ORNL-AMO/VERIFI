import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityReport, dataQualitySnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportSetupComponent } from './data-quality-report-setup.component';
import { dataQualitySettingsDraft, METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';

async function setup(snapshot = dataQualitySnapshot()) {
  const view = await setupReportWorkbench([...snapshot.facilityReports], [], snapshot);
  const workbench = await view.open();
  const component = view.harness.routeDebugElement!.query(By.directive(DataQualityReportSetupComponent)).componentInstance as DataQualityReportSetupComponent;
  return { ...view, workbench, component, editor: component.editor };
}

describe('Data Quality report Setup', () => {
  it.each(['manual', 'analysis'] as const)('groups %s Setup into three labelled sections with subordinate source headings', async mode => {
    const snapshot = dataQualitySnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings.selectedMode = mode;
    const { harness } = await setup(snapshot);
    const root = harness.routeNativeElement!.querySelector('app-data-quality-report-setup > .report-setup')!;
    const sections = [...root.querySelectorAll(':scope > .report-setup-section')];
    expect(sections.map(section => section.querySelector(':scope > h2')!.textContent))
      .toEqual(['Report information', 'Choose report data', 'Included Content']);
    for (const section of sections) {
      expect(section.tagName).toBe('SECTION');
      expect(section.getAttribute('aria-labelledby')).toBe(section.querySelector(':scope > h2')!.id);
    }
    expect(root.querySelector('#report-workbench-name')!.closest('.report-setup-section')).toBe(sections[0]);
    expect(root.querySelector('.selection-mode')!.closest('.report-setup-section')).toBe(sections[1]);
    expect(root.querySelector(mode === 'manual' ? '.source-sections' : 'app-report-analysis-selection')!
      .closest('.report-setup-section')).toBe(sections[1]);
    expect(root.querySelector('.content-matrix')!.closest('.report-setup-section')).toBe(sections[2]);
    if (mode === 'manual') {
      expect(root.querySelector('#data-quality-meters-heading')!.tagName).toBe('H3');
      expect(root.querySelector('#data-quality-predictors-heading')!.tagName).toBe('H3');
    }
  });
  it('inspects each analysis without changing the selection and selects through the existing autosave', async () => {
    const snapshot = dataQualitySnapshot();
    snapshot.facilityAnalyses.push({ ...snapshot.facilityAnalyses[0], id: 31, guid: 'analysis-b', name: 'Other analysis' });
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' });
    const { component, harness, editor, updateSetup, store } = await setup(snapshot);
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('.report-analysis-card__inspect').length).toBe(2);
    root.querySelector<HTMLButtonElement>('[aria-label="Inspect Other analysis"]')!.click(); harness.detectChanges();
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Other analysis');
    expect(dialog.textContent).toContain('Go To Analysis');
    expect(editor.draft().settings.selectedAnalysisItemId).toBe('analysis-a');
    expect(updateSetup).not.toHaveBeenCalled();
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Select for report')!.click();
    harness.detectChanges();
    expect(component.inspected()).toBeUndefined();
    expect(editor.draft().settings.selectedAnalysisItemId).toBe('analysis-b');
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].dataQualityReportSettings.selectedAnalysisItemId).toBe('analysis-b');
  });
  it('saves before opening the inspected analysis, preserves the selection, and supplies the report return origin', async () => {
    const snapshot = dataQualitySnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' });
    const { component, editor, router, harness, updateSetup, store } = await setup(snapshot);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.inspect('analysis-a'); harness.detectChanges();
    editor.name.setValue('Updated quality report');
    updateSetup.mockRejectedValueOnce(new Error('Storage unavailable'));
    await component.goToAnalysis();
    expect(navigate).not.toHaveBeenCalled();
    expect(editor.error()).toBe('Storage unavailable');
    editor.retry();
    await component.goToAnalysis();
    expect(store.facilityReports()[0].name).toBe('Updated quality report');
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      ['/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'workbench', 'analysis-a', 'setup'],
      { queryParams: { returnReportAccountGuid: 'account-a', returnReportGuid: 'report-a', returnReportScope: 'facility', returnReportFacilityGuid: 'facility-a' } });
    expect(editor.draft().settings.selectedAnalysisItemId).toBe('analysis-a');
  });
  it('keeps inspection read-only when editing is unavailable and clears it on mode or report changes', async () => {
    const snapshot = dataQualitySnapshot([dataQualityReport(), dataQualityReport({ id: 20, guid: 'report-b' })]);
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' });
    const { component, editor, harness, store, open } = await setup(snapshot);
    component.inspect('analysis-a'); harness.detectChanges();
    store.setPending({ id: 901, label: 'Importing data' }); harness.detectChanges();
    const select = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find(button => button.textContent?.trim() === 'Select for report')!;
    expect(select.disabled).toBe(true);
    store.clearPending(901); harness.detectChanges();
    editor.form.controls.settings.controls.selectedMode.setValue('manual'); harness.detectChanges();
    expect(component.inspected()).toBeUndefined();
    editor.form.controls.settings.controls.selectedMode.setValue('analysis'); harness.detectChanges();
    component.inspect('analysis-a'); harness.detectChanges();
    expect(component.inspected()).toBeDefined();
    await editor.flush(); await open('report-b');
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).toBeNull();
  });
  it('disables source and content editing during another operation and restores controls without writes', async () => {
    const { editor, component, store, harness, updateSetup } = await setup();
    const before = editor.draft();
    store.setPending({ id: 900, label: 'Importing data' }); harness.detectChanges();
    expect(editor.form.disabled).toBe(true); expect(component.presetControl.disabled).toBe(true);
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('Report settings are read-only');
    expect(sourceTag(root, 'Meter b')!.disabled).toBe(true);
    sourceTag(root, 'Meter b')!.click(); harness.detectChanges();
    expect(editor.draft()).toEqual(before); expect(updateSetup).not.toHaveBeenCalled();
    store.clearPending(900); harness.detectChanges();
    expect(editor.form.enabled).toBe(true); expect(sourceTag(root, 'Meter b')!.disabled).toBe(false);
  });
  it('blocks an empty analysis with recovery guidance and preserves the saved draft', async () => {
    const snapshot = dataQualitySnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' });
    snapshot.facilityAnalyses[0].groups.forEach(group => group.analysisType = 'skip');
    const { editor, harness, updateSetup } = await setup(snapshot);
    expect(editor.setupValid()).toBe(false);
    expect(harness.routeNativeElement!.textContent).toContain('This analysis has no available meters or production predictors');
    expect(updateSetup).not.toHaveBeenCalled();
    expect(editor.draft().settings.selectedAnalysisItemId).toBe('analysis-a');
  });
  it('recovers a failed selection/content save, retaining newer edits and flushing them before Report navigation', async () => {
    const { editor, updateSetup, harness, router, store } = await setup();
    const fields = editor.form.controls.settings.controls;
    updateSetup.mockRejectedValueOnce(new Error('Storage unavailable'));
    fields.selectedMeterIds.setValue(['meter-b']); fields.includePredictorHistogram.setValue(false);
    expect(await editor.flush()).toBe(false);
    expect(editor.error()).toBe('Storage unavailable');
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-a/reports/workbench/report-a/report')).toBe(false);
    fields.includeMeterConsumptionHistogram.setValue(false);
    editor.retry(); expect(await editor.flush()).toBe(true);
    expect(await router.navigateByUrl('/v1/workspace/facility/facility-a/reports/workbench/report-a/report')).toBe(true);
    harness.detectChanges();
    expect(store.facilityReports()[0].dataQualityReportSettings).toMatchObject({ selectedMeterIds: ['meter-b'],
      includePredictorHistogram: false, includeMeterConsumptionHistogram: false });
  });
  it.each([true, false])('preserves previously saved meter-only=%s settings as Custom without rewriting them', async metersEnabled => {
    const snapshot = dataQualitySnapshot([
      dataQualityReport(), dataQualityReport({ id: 20, guid: 'report-b' })
    ]);
    const saved = snapshot.facilityReports[0].dataQualityReportSettings;
    for (const key of METER_CONTENT_FLAGS) saved[key] = metersEnabled;
    for (const key of PREDICTOR_CONTENT_FLAGS) saved[key] = !metersEnabled;
    Object.assign(saved, { includeMeter: metersEnabled, includePredictors: !metersEnabled, includeAnnualTotalsTable: metersEnabled });
    const expected = dataQualitySettingsDraft(saved);
    const { harness, editor, open, store, updateSetup } = await setup(snapshot);
    const presets = () => [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.content-presets button')];
    expect(presets().map(button => button.textContent?.trim())).toEqual(['All content', 'Tables only', 'Charts only', 'Custom']);
    expect(presets().find(button => button.textContent?.trim() === 'Custom')!.getAttribute('aria-pressed')).toBe('true');
    expect(editor.draft().settings).toEqual(expected);
    expect(updateSetup).not.toHaveBeenCalled();
    editor.name.setValue('Renamed custom report');
    expect(await editor.flush()).toBe(true);
    expect(dataQualitySettingsDraft(store.facilityReports()[0].dataQualityReportSettings)).toEqual(expected);
    await open('report-b'); await open();
    expect(editor.draft().settings).toEqual(expected);
    expect(presets().find(button => button.textContent?.trim() === 'Custom')!.getAttribute('aria-pressed')).toBe('true');
  });
  it('applies Included Content presets through the matrix without changing the source selection', async () => {
    const { harness, editor, store } = await setup();
    const root = harness.routeNativeElement!;
    const preset = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('.content-presets button')]
      .find(button => button.textContent?.trim() === label)!;
    expect(root.querySelector('.content-matrix')?.getAttribute('aria-labelledby')).toBe('data-quality-content-heading');
    expect(root.querySelector('#data-quality-content-heading')?.textContent).toBe('Included Content');
    preset('Tables only').click(); harness.detectChanges();
    expect(editor.draft().settings).toMatchObject({ includeMeterStatisticsTable: true, includePredictorStatisticsTable: true,
      includeAnnualTotalsTable: true, includeMeterConsumptionTimeseriesGraph: false, includeMeterCostHistogram: false,
      includePredictorTimeseriesGraph: false, includePredictorHistogram: false, selectedMode: 'manual', selectedMeterIds: ['meter-a'], selectedPredictorIds: ['predictor-a'] });
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].dataQualityReportSettings.includeAnnualTotalsTable).toBe(true);
    preset('Charts only').click(); harness.detectChanges();
    expect(editor.draft().settings).toMatchObject({ includeMeterStatisticsTable: false, includePredictorStatisticsTable: false,
      includeAnnualTotalsTable: false, includeMeterConsumptionTimeseriesGraph: true, includeMeterCostTimeseriesGraph: true,
      includeMeterConsumptionHistogram: true, includeMeterCostHistogram: true, includePredictorTimeseriesGraph: true, includePredictorHistogram: true });
    preset('All content').click(); harness.detectChanges();
    expect(editor.draft().settings).toMatchObject({ includeMeter: true, includePredictors: true, includeAnnualTotalsTable: true });
    const costChart = root.querySelector<HTMLInputElement>('[aria-label="Meter Details: Cost chart"]')!;
    costChart.click(); harness.detectChanges();
    expect(preset('Custom').getAttribute('aria-pressed')).toBe('true');
    expect(editor.draft().settings.includeMeterCostTimeseriesGraph).toBe(false);
    expect(editor.draft().settings.includeAnnualTotalsTable).toBe(true);
  });
  it('hydrates every saved option silently, shows selection counts, and preserves an omitted legacy annual flag on rename', async () => {
    const snapshot = dataQualitySnapshot();
    delete snapshot.facilityReports[0].dataQualityReportSettings.includeAnnualTotalsTable;
    const { harness, editor, updateSetup, updateName, store } = await setup(snapshot);
    expect(editor.draft().settings).toMatchObject({ selectedMode: 'manual', selectedMeterIds: ['meter-a'],
      selectedPredictorIds: ['predictor-a'], includeMeterCostHistogram: false, includeAnnualTotalsTable: false });
    expect(editor.selection().valid).toBe(true);
    expect([...harness.routeNativeElement!.querySelectorAll('.source-count')].map(count => count.textContent?.trim()))
      .toEqual(['1 selected', '1 selected']);
    expect(updateSetup).not.toHaveBeenCalled(); expect(updateName).not.toHaveBeenCalled();
    editor.name.setValue('Legacy quality');
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('facility-a', 'report-a', { name: 'Legacy quality' });
    expect(store.facilityReports()[0].dataQualityReportSettings.includeAnnualTotalsTable).toBeUndefined();
  });
  it('clears inactive selections atomically when switching modes and resolves analysis membership without calculations', async () => {
    const { editor, updateSetup, store } = await setup();
    const controls = editor.form.controls.settings.controls;
    controls.selectedMode.setValue('analysis');
    expect(editor.draft().settings).toMatchObject({ selectedAnalysisItemId: null, selectedMeterIds: [], selectedPredictorIds: [] });
    expect(editor.setupValid()).toBe(false);
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].dataQualityReportSettings.missingSelection).toBe(true);
    controls.selectedAnalysisItemId.setValue('analysis-a');
    expect(editor.selection().meters).toHaveLength(2); expect(editor.selection().predictors).toHaveLength(2);
    expect(editor.setupValid()).toBe(true);
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].analysisItemId).toBe('analysis-a');
    controls.selectedMode.setValue('manual');
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].analysisItemId).toBeUndefined();
    expect(updateSetup.mock.calls.at(-1)?.[2]).toMatchObject({ dataQualityReportSettings: { selectedMode: 'manual', selectedAnalysisItemId: null } });
  });
  it('selects and deselects manual source tags and retains values across stage navigation and reopening', async () => {
    const { harness, editor, open, store } = await setup();
    const root = harness.routeNativeElement!;
    sourceTag(root, 'Meter b').click();
    sourceTag(root, 'Predictor a').click();
    harness.detectChanges();
    expect(root.querySelector('.source-tag-list input[type=checkbox]')).toBeNull();
    expect(sourceTag(root, 'Meter b').getAttribute('aria-pressed')).toBe('true');
    expect(sourceTag(root, 'Predictor a').getAttribute('aria-pressed')).toBe('false');
    expect(editor.selection().meters).toHaveLength(2); expect(editor.selection().predictors).toHaveLength(0);
    await open('report-a', 'report'); await open();
    expect(editor.draft().settings.selectedMeterIds).toEqual(['meter-a', 'meter-b']);
    expect(store.facilityReports()[0].dataQualityReportSettings.selectedPredictorIds).toEqual([]);
  });
  it('shows all source tags without search fields or redundant selection guidance', async () => {
    const { harness, editor, updateSetup } = await setup();
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('.source-tag')).toHaveLength(4);
    expect(root.querySelector('.source-sections input')).toBeNull();
    expect(root.textContent).not.toContain('Selected data:');
    expect(sourceTag(root, 'Meter a').getAttribute('aria-pressed')).toBe('true');
    expect(sourceTag(root, 'Predictor a').getAttribute('aria-pressed')).toBe('true');
    editor.form.controls.settings.patchValue({ selectedMeterIds: [], selectedPredictorIds: [] });
    harness.detectChanges();
    expect(root.querySelector('.source-count')).toBeNull();
    expect(root.textContent).not.toContain('0 selected');
    expect(root.textContent).not.toContain('Select at least one');
    expect(editor.setupValid()).toBe(false);
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it.each([
    ['meter', 'selectedMeterIds', 'Meter a', 'Meter b'],
    ['predictor', 'selectedPredictorIds', 'Predictor a', 'Predictor b']
  ] as const)('drops unavailable %s GUIDs on selection edits and preserves retained order', async (kind, field, firstName, secondName) => {
    const snapshot = dataQualitySnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings[field] = [`deleted-${kind}`, `${kind}-b`];
    const { harness, editor, store, updateSetup } = await setup(snapshot);
    const root = harness.routeNativeElement!;
    expect(updateSetup).not.toHaveBeenCalled();
    expect(sourceTag(root, secondName)!.getAttribute('aria-pressed')).toBe('true');
    sourceTag(root, firstName)!.click(); harness.detectChanges();
    expect(editor.draft().settings[field]).toEqual([`${kind}-b`, `${kind}-a`]);
    sourceTag(root, secondName)!.click(); harness.detectChanges();
    expect(editor.draft().settings[field]).toEqual([`${kind}-a`]);
    expect(sourceTag(root, firstName)!.getAttribute('aria-pressed')).toBe('true');
    expect(sourceTag(root, secondName)!.getAttribute('aria-pressed')).toBe('false');
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].dataQualityReportSettings[field]).toEqual([`${kind}-a`]);
  });
  it('refreshes sorted owned choices after source additions and deletions without changing selections or saving', async () => {
    const { harness, editor, component, store, updateSetup } = await setup();
    const meter = store.meters()[0], predictor = store.predictors()[0];
    const before = editor.draft();
    const meters = [
      { ...meter, id: 101, guid: 'meter-c', name: 'Alpha meter' },
      { ...meter, id: 102, guid: 'foreign-meter', name: 'Foreign meter', facilityId: 'other-facility' }
    ];
    const predictors = [
      { ...predictor, id: 103, guid: 'predictor-c', name: 'Alpha predictor' },
      { ...predictor, id: 104, guid: 'foreign-predictor', name: 'Foreign predictor', facilityId: 'other-facility' }
    ];
    store.publishCommittedPatch({ collections: [
      { collection: 'meters', deleteGuids: [meter.guid], upsert: meters },
      { collection: 'predictors', deleteGuids: [predictor.guid], upsert: predictors }
    ] });
    harness.detectChanges();
    expect(component.meterChoices().map(choice => choice.name)).toEqual(['Alpha meter', 'Meter b']);
    expect(component.predictorChoices().map(choice => choice.name)).toEqual(['Alpha predictor', 'Predictor b']);
    expect(component.meterChoices().every(choice => !choice.selected)).toBe(true);
    expect(component.predictorChoices().every(choice => !choice.selected)).toBe(true);
    expect(sourceTag(harness.routeNativeElement!, 'Meter a')).toBeUndefined();
    expect(editor.selection().meters).toEqual([]);
    expect(editor.selection().predictors).toEqual([]);
    expect(editor.setupValid()).toBe(false);
    component.toggleSource('meter', 'foreign-meter'); component.toggleSource('predictor', 'foreign-predictor');
    component.toggleSource('meter', 'missing');
    expect(editor.draft()).toEqual(before);
    expect(updateSetup).not.toHaveBeenCalled();
  });
  it('disables selection tags when editing is unavailable', async () => {
    const { component, harness, editor, updateSetup, store } = await setup();
    store.setPending({ id: 99, label: 'Another workspace operation' }); harness.detectChanges();
    const tag = sourceTag(harness.routeNativeElement!, 'Meter b');
    expect(tag.disabled).toBe(true); tag.click();
    component.toggleSource('meter', 'meter-b');
    expect(editor.draft().settings.selectedMeterIds).toEqual(['meter-a']);
    expect(updateSetup).not.toHaveBeenCalled();
    store.clearPending(99); harness.detectChanges();
    expect(sourceTag(harness.routeNativeElement!, 'Meter b').disabled).toBe(false);
  });
  it('identifies empty source inventories', async () => {
    const snapshot = dataQualitySnapshot(); snapshot.meters = []; snapshot.predictors = [];
    const { harness } = await setup(snapshot);
    expect(harness.routeNativeElement!.textContent).toContain('No meters are available in this facility.');
    expect(harness.routeNativeElement!.textContent).toContain('No predictors are available in this facility.');
    expect(harness.routeNativeElement!.querySelector('.source-tag')).toBeNull();
  });
  it('applies parent switches to their children and keeps annual totals independent', async () => {
    const { editor } = await setup(), controls = editor.form.controls.settings.controls;
    controls.includeAnnualTotalsTable.setValue(true);
    controls.includeMeter.setValue(false); controls.includePredictors.setValue(false);
    expect(METER_CONTENT_FLAGS.every(key => !controls[key].value)).toBe(true);
    expect(PREDICTOR_CONTENT_FLAGS.every(key => !controls[key].value)).toBe(true);
    expect(controls.includeAnnualTotalsTable.value).toBe(true);
    controls.includeMeter.setValue(true); controls.includePredictors.setValue(true);
    controls.includeMeterCostHistogram.setValue(false); controls.includePredictorHistogram.setValue(false);
    expect(controls.includeMeter.value).toBe(false); expect(controls.includePredictors.value).toBe(false);
    expect(controls.includeMeterStatisticsTable.value).toBe(true); expect(controls.includePredictorStatisticsTable.value).toBe(true);
    expect(await editor.flush()).toBe(true);
  });
  it('ignores a deleted predictor without an alert, recovery button, or opening-time save', async () => {
    const snapshot = dataQualitySnapshot();
    snapshot.predictors = snapshot.predictors.filter(predictor => predictor.guid !== 'predictor-a');
    const { editor, harness, updateSetup, open } = await setup(snapshot);
    expect(editor.selection().predictors).toEqual([]); expect(editor.setupValid()).toBe(true);
    expect(harness.routeNativeElement!.textContent).not.toContain('Some selected source items are unavailable');
    expect(harness.routeNativeElement!.textContent).not.toContain('Unavailable predictor:');
    expect(harness.routeNativeElement!.textContent).not.toContain('Remove unavailable selections');
    expect(updateSetup).not.toHaveBeenCalled();
    await open('report-a', 'report'); await open();
    expect(editor.setupValid()).toBe(true);
    expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.settings.patchValue({ selectedMeterIds: [], selectedPredictorIds: [] });
    expect(editor.setupValid()).toBe(false); expect(await editor.flush()).toBe(true);
  });
  it('retains newer edits and merges concurrent durable options during a delayed save', async () => {
    const { editor, store, updateSetup } = await setup();
    let resolve!: (value: ReturnType<typeof dataQualityReport>) => void;
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const controls = editor.form.controls.settings.controls;
    controls.includeMeterStatisticsTable.setValue(false);
    const saving = editor.flush();
    controls.includeMeterStatisticsTable.setValue(true);
    const saved = dataQualityReport();
    saved.dataQualityReportSettings.includeMeter = false;
    saved.dataQualityReportSettings.includeMeterStatisticsTable = false;
    saved.dataQualityReportSettings.includePredictorHistogram = false;
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [saved] }] });
    resolve(saved);
    expect(await saving).toBe(true);
    expect(controls.includeMeterStatisticsTable.value).toBe(true);
    expect(controls.includePredictorHistogram.value).toBe(false);
    expect(updateSetup).toHaveBeenCalledTimes(2);
  });
  it('keeps filters separate from the selection and save commands, and reports an unavailable saved analysis', async () => {
    const snapshot = dataQualitySnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings = { ...snapshot.facilityReports[0].dataQualityReportSettings,
      selectedMode: 'analysis', selectedAnalysisItemId: 'deleted-analysis' };
    const { harness, editor, updateSetup } = await setup(snapshot);
    expect(harness.routeNativeElement!.textContent).toContain('The saved analysis is unavailable');
    expect(editor.setupValid()).toBe(false);
    const selector = harness.routeDebugElement!.query(By.css('app-report-analysis-selection')).componentInstance;
    selector.form.controls.baselineYear.setValue(1900); harness.detectChanges();
    expect(editor.draft().settings.selectedAnalysisItemId).toBe('deleted-analysis');
    expect(updateSetup).not.toHaveBeenCalled();
  });
});

function sourceTag(root: HTMLElement, name: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll<HTMLButtonElement>('.source-tag')].find(button => button.querySelector('.source-tag-name')?.textContent?.trim() === name);
}
