import { Directive, Input, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterQualityModule } from '@app/v1/shared/data-quality/meter-quality.module';
import { PredictorQualityModule } from '@app/v1/shared/data-quality/predictor-quality.module';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityHistogramSnapshot as histogramSnapshot, dataQualityReport } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportModule } from '../data-quality-report.module';
import { DataQualityReportService } from '../data-quality-report.service';
import { DataQualityReportHistogramComponent } from '../histogram/data-quality-report-histogram.component';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
async function setup(snapshot = histogramSnapshot()) {
  for (const module of [DataQualityReportModule, MeterQualityModule, PredictorQualityModule]) {
    TestBed.overrideModule(module, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
  }
  const view = await setupReportWorkbench(snapshot.facilityReports, [{ provide: CopyTableService, useValue: { copyTable: vi.fn() } }], snapshot);
  const workbench = await view.open('report-a', 'report');
  const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
  await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
  const histograms = () => view.harness.routeDebugElement!.queryAll(By.directive(DataQualityReportHistogramComponent))
    .map(element => element.componentInstance as DataQualityReportHistogramComponent);
  return { ...view, results, histograms, root: view.harness.routeNativeElement! };
}

describe('Data Quality histogram report sections', () => {
  it.each(['manual', 'analysis'] as const)('renders histogram-only consumption, cost, and predictors in %s mode', async selectedMode => {
    const snapshot = histogramSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode,
      selectedAnalysisItemId: selectedMode === 'analysis' ? 'analysis-a' : undefined });
    const { histograms, root, results } = await setup(snapshot);
    expect(histograms()).toHaveLength(selectedMode === 'manual' ? 3 : 6);
    expect(histograms().slice(0, 2).map(component => component.bins().map(bin => bin.count))).toEqual([[3], [3]]);
    expect(histograms().at(-1)!.bins().map(bin => bin.count)).toEqual([3, 1]);
    expect(histograms().map(component => component.unit())).toContain('$');
    expect(root.querySelector('.v1-meter-quality__table, .predictor-quality__table')).toBeNull();
    expect(root.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
  });
  it.each([
    [true, false, false], [false, true, false], [false, false, true], [false, false, false]
  ])('independently includes consumption=%s, cost=%s, and predictor=%s distributions', async (consumption, cost, predictor) => {
    const snapshot = histogramSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
      includeMeterConsumptionHistogram: consumption, includeMeterCostHistogram: cost, includePredictorHistogram: predictor
    });
    const { histograms, root } = await setup(snapshot);
    expect(histograms().map(component => component.heading())).toEqual([
      ...(consumption ? ['Distribution of Total Consumption'] : []), ...(cost ? ['Distribution of Total Cost'] : []),
      ...(predictor ? ['Distribution of Predictors'] : [])
    ]);
    if (!consumption && !cost && !predictor) expect(root.textContent).toContain('No report content is enabled');
  });
  it.each([0, undefined, 'zero-average'] as const)('preserves cost visibility for %s readings and excludes consumption for excluded electricity', async cost => {
    const snapshot = histogramSnapshot(); snapshot.meters[0].includeInEnergy = false;
    snapshot.meterData = snapshot.meterData.map((reading, index) => ({ ...reading,
      totalCost: cost === 'zero-average' ? index % 2 ? 10 : -10 : cost }));
    const { histograms } = await setup(snapshot);
    expect(histograms().map(component => component.heading())).toEqual(['Distribution of Predictors']);
  });
  it('uses all raw predictor values even with invalid months and preserves weather histogram units', async () => {
    const snapshot = histogramSnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings.selectedMeterIds = [];
    Object.assign(snapshot.predictors[0], { predictorType: 'Weather', weatherDataType: 'HDD', unit: 'legacy custom unit' });
    snapshot.predictorData = snapshot.predictorData.map(reading => ({ ...reading, month: 0 }));
    const { histograms } = await setup(snapshot);
    expect(histograms()).toHaveLength(1); expect(histograms()[0].values()).toHaveLength(5);
    expect(histograms()[0].bins().map(bin => bin.count)).toEqual([3, 1]); expect(histograms()[0].unit()).toBe('days');
  });
  it('retains independent bin choices across stages, isolates report sessions, and never autosaves preferences', async () => {
    const snapshot = histogramSnapshot(), second = dataQualityReport({ id: 20, guid: 'report-b' });
    second.dataQualityReportSettings = { ...snapshot.facilityReports[0].dataQualityReportSettings };
    snapshot.facilityReports.push(second);
    const { histograms, open, harness, updateSetup, results } = await setup(snapshot);
    histograms()[0].binCount.setValue(3); histograms()[1].binCount.setValue(7); histograms()[2].binCount.setValue(9);
    harness.detectChanges(); expect(histograms().map(component => component.numberOfBins())).toEqual([3, 7, 9]);
    const savedResult = results.state().value;
    await open('report-a', 'setup'); await open('report-a', 'report');
    await vi.waitFor(() => { harness.detectChanges(); expect(histograms()).toHaveLength(3); });
    expect(histograms().map(component => component.binCount.value)).toEqual([3, 7, 9]);
    expect(results.state().value).toBe(savedResult); expect(updateSetup).not.toHaveBeenCalled();
    await open('report-b', 'report');
    await vi.waitFor(() => { harness.detectChanges(); expect(histograms()).toHaveLength(3); });
    expect(histograms().map(component => component.numberOfBins())).toEqual([50, 50, 50]);
  });
  it('replaces stale histogram inputs after readings change', async () => {
    const snapshot = histogramSnapshot();
    const { histograms, store, harness, results } = await setup(snapshot);
    histograms()[0].binCount.setValue(5); harness.detectChanges();
    const changed = { ...store.meterData()[0], totalEnergyUse: 20 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changed] }] });
    expect(results.state().value).toBeUndefined(); harness.detectChanges(); expect(histograms()).toHaveLength(0);
    await vi.waitFor(() => { harness.detectChanges(); expect(histograms()).toHaveLength(3); });
    expect(histograms()[0].values()).toContain(20); expect(histograms()[0].numberOfBins()).toBe(5);
  });
});
