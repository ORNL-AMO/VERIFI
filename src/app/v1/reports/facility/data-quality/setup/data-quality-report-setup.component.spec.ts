import { By } from '@angular/platform-browser';
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
  it.each([
    ['Meters only', true], ['Predictors only', false]
  ] as const)('saves and restores the %s content preset without changing source selections', async (label, metersEnabled) => {
    const { harness, editor, open, store } = await setup(dataQualitySnapshot([
      dataQualityReport(), dataQualityReport({ id: 20, guid: 'report-b' })
    ]));
    const preset = () => [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.content-presets button')]
      .find(button => button.textContent?.trim() === label)!;
    preset().click(); harness.detectChanges();
    const settings = editor.draft().settings;
    expect(METER_CONTENT_FLAGS.every(key => settings[key] === metersEnabled)).toBe(true);
    expect(PREDICTOR_CONTENT_FLAGS.every(key => settings[key] === !metersEnabled)).toBe(true);
    expect(settings).toMatchObject({ includeMeter: metersEnabled, includePredictors: !metersEnabled,
      includeAnnualTotalsTable: metersEnabled, selectedMode: 'manual', selectedMeterIds: ['meter-a'], selectedPredictorIds: ['predictor-a'] });
    expect(preset().getAttribute('aria-pressed')).toBe('true');
    expect(await editor.flush()).toBe(true);
    expect(dataQualitySettingsDraft(store.facilityReports()[0].dataQualityReportSettings)).toEqual(settings);
    await open('report-b'); await open();
    expect(preset().getAttribute('aria-pressed')).toBe('true');
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
  it('disables selection tags when editing is unavailable', async () => {
    const { component, harness, editor, updateSetup, store } = await setup();
    store.setPending({ id: 99, label: 'Another workspace operation' }); harness.detectChanges();
    const tag = sourceTag(harness.routeNativeElement!, 'Meter b');
    expect(tag.disabled).toBe(true); tag.click();
    component.toggleSource(component.meterChoices().find(choice => choice.guid === 'meter-b')!);
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
  it('preserves missing saved selections until explicitly removed and allows incomplete drafts to save', async () => {
    const snapshot = dataQualitySnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings.selectedMeterIds!.push('deleted');
    const { editor, harness, updateSetup } = await setup(snapshot);
    expect(editor.selection().missingMeterIds).toEqual(['deleted']); expect(editor.setupValid()).toBe(false);
    expect(harness.routeNativeElement!.textContent).toContain('Unavailable meter: deleted');
    expect(updateSetup).not.toHaveBeenCalled();
    editor.removeUnavailableSelections();
    expect(editor.setupValid()).toBe(true); expect(await editor.flush()).toBe(true);
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
