import { Directive, Input, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterQualityModule } from '@app/v1/shared/data-quality/meter-quality.module';
import { PredictorQualityModule } from '@app/v1/shared/data-quality/predictor-quality.module';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityDistributionSnapshot as distributionSnapshot, dataQualityReport } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportModule } from '../data-quality-report.module';
import { DataQualityReportService } from '../data-quality-report.service';
import { DataQualityReportDotPlotComponent } from '../dot-plot/data-quality-report-dot-plot.component';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
async function setup(snapshot = distributionSnapshot()) {
  for (const module of [DataQualityReportModule, MeterQualityModule, PredictorQualityModule]) {
    TestBed.overrideModule(module, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
  }
  const view = await setupReportWorkbench(snapshot.facilityReports, [{ provide: CopyTableService, useValue: { copyTable: vi.fn() } }], snapshot);
  const workbench = await view.open('report-a', 'report');
  const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
  await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
  const plots = () => view.harness.routeDebugElement!.queryAll(By.directive(DataQualityReportDotPlotComponent))
    .map(element => element.componentInstance as DataQualityReportDotPlotComponent);
  return { ...view, results, plots, root: view.harness.routeNativeElement! };
}

describe('Data Quality dot-plot report sections', () => {
  it.each(['manual', 'analysis'] as const)('renders dot-plot-only consumption, cost, and predictors in %s mode', async selectedMode => {
    const snapshot = distributionSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode,
      selectedAnalysisItemId: selectedMode === 'analysis' ? 'analysis-a' : undefined });
    const { plots, root, results } = await setup(snapshot);
    expect(plots()).toHaveLength(selectedMode === 'manual' ? 3 : 6);
    expect(root.querySelectorAll('app-data-quality-report-dot-plot')).toHaveLength(plots().length);
    expect(plots()[0].data().readings.map(reading => reading.value)).toEqual([10, 10, 10, 100]);
    expect(plots().every(component => component.view().points.length > 0)).toBe(true);
    expect(plots().map(component => component.data().unit)).toContain('$');
    expect(root.querySelector('.v1-meter-quality__table, .predictor-quality__table')).toBeNull();
    expect(root.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
  });
  it.each([
    [true, false, false], [false, true, false], [false, false, true], [false, false, false]
  ])('independently includes consumption=%s, cost=%s, and predictor=%s distributions', async (consumption, cost, predictor) => {
    const snapshot = distributionSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
      includeMeterConsumptionHistogram: consumption, includeMeterCostHistogram: cost, includePredictorHistogram: predictor
    });
    const { plots, root } = await setup(snapshot);
    expect(plots().map(component => component.heading())).toEqual([
      ...(consumption ? ['Consumption distribution'] : []), ...(cost ? ['Cost distribution'] : []),
      ...(predictor ? ['Predictor value distribution'] : [])
    ]);
    expect(root.querySelectorAll('app-data-quality-report-dot-plot')).toHaveLength(plots().length);
    if (!consumption && !cost && !predictor) expect(root.textContent).toContain('No report content is enabled');
  });
  it.each([0, undefined, 'zero-average'] as const)('preserves cost visibility for %s readings and excludes consumption for excluded electricity', async cost => {
    const snapshot = distributionSnapshot(); snapshot.meters[0].includeInEnergy = false;
    snapshot.meterData = snapshot.meterData.map((reading, index) => ({ ...reading,
      totalCost: cost === 'zero-average' ? index % 2 ? 10 : -10 : cost }));
    const { plots } = await setup(snapshot);
    expect(plots().map(component => component.heading())).toEqual(['Predictor value distribution']);
  });
  it('uses all raw predictor values even with invalid months and preserves weather units', async () => {
    const snapshot = distributionSnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings.selectedMeterIds = [];
    Object.assign(snapshot.predictors[0], { predictorType: 'Weather', weatherDataType: 'HDD', unit: 'legacy custom unit' });
    snapshot.predictorData = snapshot.predictorData.map(reading => ({ ...reading, month: 0 }));
    const { plots } = await setup(snapshot);
    expect(plots()).toHaveLength(1); expect(plots()[0].data().readings.map(reading => reading.value)).toHaveLength(5);
    expect(plots()[0].data().readings.every(reading => reading.label === 'Unknown month')).toBe(true);
    expect(plots()[0].data().unit).toBe('legacy custom unit');
  });
  it('retains saved distribution choices across stages and isolates report sessions without writes', async () => {
    const snapshot = distributionSnapshot(), second = dataQualityReport({ id: 20, guid: 'report-b' });
    second.dataQualityReportSettings = { ...snapshot.facilityReports[0].dataQualityReportSettings,
      includeMeterCostHistogram: false };
    snapshot.facilityReports.push(second);
    const { plots, open, harness, updateSetup, results } = await setup(snapshot);
    const savedResult = results.state().value;
    await open('report-a', 'setup'); await open('report-a', 'report');
    await vi.waitFor(() => { harness.detectChanges(); expect(plots()).toHaveLength(3); });
    expect(results.state().value).toBe(savedResult); expect(updateSetup).not.toHaveBeenCalled();
    await open('report-b', 'report');
    await vi.waitFor(() => { harness.detectChanges(); expect(plots()).toHaveLength(2); });
  });
  it('replaces stale dot-plot inputs after readings change', async () => {
    const snapshot = distributionSnapshot();
    const { plots, store, harness, results } = await setup(snapshot);
    const changed = { ...store.meterData()[0], totalEnergyUse: 20 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changed] }] });
    expect(results.state().value).toBeUndefined(); harness.detectChanges(); expect(plots()).toHaveLength(0);
    await vi.waitFor(() => { harness.detectChanges(); expect(plots()).toHaveLength(3); });
    expect(plots()[0].data().readings.map(reading => reading.value)).toContain(20);
  });
});
