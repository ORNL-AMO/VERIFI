import { Directive, forwardRef, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { PredictorQualityModule } from '@app/v1/shared/data-quality/predictor-quality.module';
import { PredictorQualityPresentationComponent } from '@app/v1/shared/data-quality/predictor-quality-presentation/predictor-quality-presentation.component';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityPredictorReadingsSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
function snapshotFixture() {
  const snapshot = dataQualityPredictorReadingsSnapshot();
  Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMeterIds: [], includePredictorHistogram: false });
  return snapshot;
}
async function setup(snapshot = snapshotFixture()) {
  TestBed.overrideModule(PredictorQualityModule, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
  const copyTable = vi.fn();
  const view = await setupReportWorkbench(snapshot.facilityReports, [{ provide: CopyTableService, useValue: { copyTable } }], snapshot);
  const workbench = await view.open('report-a', 'report');
  const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
  await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
  const presentations = () => view.harness.routeDebugElement!.queryAll(By.directive(PredictorQualityPresentationComponent))
    .map(element => element.componentInstance as PredictorQualityPresentationComponent);
  return { ...view, results, copyTable, presentations, root: view.harness.routeNativeElement! };
}

describe('Data Quality predictor report presentation', () => {
  it.each([[true, true], [true, false], [false, true], [false, false]])(
    'supports predictor-only content with statistics=%s and time series=%s', async (statistics, chart) => {
      const snapshot = snapshotFixture();
      Object.assign(snapshot.facilityReports[0].dataQualityReportSettings,
        { includePredictorStatisticsTable: statistics, includePredictorTimeseriesGraph: chart });
      const { root } = await setup(snapshot);
      expect(!!root.querySelector('.predictor-quality__table')).toBe(statistics);
      expect(!!root.querySelector('.predictor-quality__chart')).toBe(chart);
      expect(root.querySelectorAll('.report-component-divider')).toHaveLength(Number(statistics) + Number(chart));
      expect(root.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
      expect(root.querySelector('.meter-report')).toBeNull();
      if (!statistics && !chart) expect(root.textContent).toContain('No report content is enabled');
    });
  it('retains statistics, all raw chart points, month evidence, copy, downloads, and report precision', async () => {
    const { root, results, copyTable, presentations } = await setup();
    expect(root.textContent).toContain('28.6'); expect(root.textContent).toContain('(tons)');
    expect(root.textContent).toContain('1 predictor reading(s) outside the expected range.');
    expect(root.textContent).toContain('Months with multiple readings: Jan 2024');
    expect(root.textContent).toContain('Missing months: Feb 2024');
    expect(root.textContent).not.toContain('Sections being implemented');
    expect(results.state().value!.predictors[0].chartRows).toHaveLength(5);
    const chart = presentations().find(component => component.showChart())!;
    expect((chart.qualityChartOption() as Record<string, any>).series[0].markArea.label.show).toBe(false);
    chart.downloadQualityChart(); expect(chart.qualityChart!.downloadPng).toHaveBeenCalledWith('Predictor a-readings');
    root.querySelector<HTMLButtonElement>('.predictor-quality__footer button')!.click();
    await vi.waitFor(() => expect(copyTable).toHaveBeenCalledOnce());
  });
  it.each([
    ['HDD', 'Heating Degree Days', 'days'], ['CDD', 'Cooling Degree Days', 'days'],
    ['relativeHumidity', 'Relative Humidity', '%'], ['dryBulbTemp', 'Dry Bulb Temperature', '°F'],
    ['wetBulbTemp', 'Wet Bulb Temperature', '°F'], ['dewPointTemp', 'Dew Point Temperature', '°F'],
    ['precipitation', 'Precipitation', 'in']
  ] satisfies [WeatherDataType, string, string][])('renders %s metadata and source evidence independently of workspace warning settings', async (type, label, unit) => {
    const snapshot = snapshotFixture();
    Object.assign(snapshot.predictors[0], { predictorType: 'Weather', weatherDataType: type, unit: '',
      ignoreWeatherDataWarning: true, ignoreDateStatusChecks: true, heatingBaseTemperature: 65, coolingBaseTemperature: 60 });
    snapshot.account.expectedRangeSettings = { ...snapshot.account.expectedRangeSettings, enabled: false };
    const { root, results } = await setup(snapshot);
    expect(root.querySelector('.predictor-description')!.textContent).toContain(label);
    if (type === 'HDD' || type === 'CDD') expect(root.textContent).toContain(`Base Temperature: ${type === 'HDD' ? 65 : 60} °F`);
    expect(results.state().value!.predictors[0].unit).toBe(unit);
    const evidence = root.querySelector('.reading-quality')!.textContent;
    expect(evidence).toContain('Incomplete weather source data: Jan 2024');
    expect(evidence).toContain('Revised weather source data: May 2024');
    expect(evidence).toContain('outside the expected range'); expect(evidence).toContain('Missing months');
    expect(root.querySelector('.predictor-quality__accessible-data')!.textContent).toContain('Incomplete source data');
    expect(root.textContent).not.toContain('Discard');
  });
  it.each(['empty', 'invalid', 'zero-MAD'] as const)('handles %s readings without false outlier indicators', async scenario => {
    const snapshot = snapshotFixture();
    snapshot.predictorData = scenario === 'empty' ? [] : snapshot.predictorData.map(reading => ({ ...reading,
      amount: scenario === 'invalid' ? Number.NaN : reading.amount === 100 ? 100 : 10 }));
    const { root, results } = await setup(snapshot);
    expect(results.state().value!.predictors[0].outlierCount).toBe(0);
    expect(root.textContent).not.toContain('predictor reading(s) outside');
    if (scenario === 'empty') expect(root.textContent).toContain('No readings found for this predictor.');
    if (scenario === 'invalid') expect(root.textContent).toContain('No usable values.');
    if (scenario !== 'zero-MAD') expect(root.querySelector('.predictor-quality__chart')).toBeNull();
    else expect(results.state().value!.predictors[0].chartRows.every(row => !row.outlier)).toBe(true);
  });
  it('refreshes changed readings and removes stale content before recalculation or switching reports', async () => {
    const { root, results, store, harness, open } = await setup();
    const changed = { ...store.predictorData()[0], amount: 1.234567 };
    store.publishCommittedPatch({ collections: [{ collection: 'predictorData', upsert: [changed] }] });
    expect(results.state().value).toBeUndefined(); harness.detectChanges();
    expect(root.querySelector('.predictor-quality__table')).toBeNull();
    await vi.waitFor(() => { harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    expect(root.querySelector('.predictor-quality__table')!.textContent).toContain('1.2346');
    await open('report-a', 'setup'); expect(results.state().value).toBeUndefined();
    await open('report-a', 'report');
    await vi.waitFor(() => { harness.detectChanges(); expect(root.textContent).toContain('1.2346'); });
    store.publishCommittedPatch({ collections: [{ collection: 'predictors', deleteGuids: ['predictor-a'] }] });
    harness.detectChanges(); expect(root.querySelector('.predictor-quality__table')).toBeNull();
    expect(root.textContent).toContain('Review Setup');
  });
});
