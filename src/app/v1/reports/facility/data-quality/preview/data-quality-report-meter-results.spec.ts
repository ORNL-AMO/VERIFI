import { Directive, forwardRef, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterQualityModule } from '@app/v1/shared/data-quality/meter-quality.module';
import { DataQualityReportModule } from '../data-quality-report.module';
import { MeterQualityPresentationComponent } from '@app/v1/shared/data-quality/meter-quality-presentation/meter-quality-presentation.component';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityReadingsSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
async function setup(snapshot = dataQualityReadingsSnapshot()) {
  TestBed.overrideModule(MeterQualityModule, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
  TestBed.overrideModule(DataQualityReportModule, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
  const copyTable = vi.fn();
  const view = await setupReportWorkbench(snapshot.facilityReports, [{ provide: CopyTableService, useValue: { copyTable } }], snapshot);
  const workbench = await view.open('report-a', 'report');
  const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
  await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
  view.harness.detectChanges();
  const presentation = (kind: 'statistics' | 'consumption' | 'cost' = 'statistics') => view.harness.routeDebugElement!
    .queryAll(By.directive(MeterQualityPresentationComponent)).map(element => element.componentInstance as MeterQualityPresentationComponent)
    .find(component => kind === 'statistics' ? component.showStatistics()
      : component.chartHeading() === (kind === 'consumption' ? 'Total Consumption' : 'Total Cost'));
  return { ...view, workbench, results, copyTable, presentation, root: view.harness.routeNativeElement! };
}
describe('Data Quality meter report presentation', () => {
  it.each([
    [true, false, false], [false, true, false], [false, false, true], [false, false, false]
  ])('independently renders statistics=%s, consumption chart=%s, and cost chart=%s', async (statistics, consumption, cost) => {
    const snapshot = dataQualityReadingsSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
      includeMeterStatisticsTable: statistics, includeMeterConsumptionTimeseriesGraph: consumption, includeMeterCostTimeseriesGraph: cost,
      includeMeterConsumptionHistogram: false, includeMeterCostHistogram: false, includeAnnualTotalsTable: false,
      selectedPredictorIds: []
    });
    const { root, presentation } = await setup(snapshot);
    expect(!!root.querySelector('.v1-meter-quality__table')).toBe(statistics);
    if (statistics || consumption || cost) {
      expect(presentation('consumption')?.hasConsumptionChartData() ?? false).toBe(consumption);
      expect(presentation('cost')?.hasCostChartData() ?? false).toBe(cost);
    } else {
      expect(root.textContent).toContain('No report content is enabled');
    }
  });
  it.each([0, undefined])('omits cost statistics and charts for readings with no usable cost (%s)', async totalCost => {
    const snapshot = dataQualityReadingsSnapshot();
    snapshot.meterData = snapshot.meterData.map(reading => ({ ...reading, totalCost }));
    const { presentation, root } = await setup(snapshot);
    expect(presentation().statisticRows().map(row => row.id)).toEqual(['consumption']);
    expect(presentation('cost')).toBeUndefined();
    const notices = root.querySelectorAll<HTMLElement>('.cost-chart-notice');
    expect(notices).toHaveLength(1);
    expect(notices[0].getAttribute('role')).toBe('note');
    expect(root.querySelector('#' + notices[0].getAttribute('aria-labelledby'))?.textContent).toBe('Cost charts unavailable');
    expect(notices[0].textContent).toContain('No cost chart is available because the average cost is zero or unavailable.');
  });
  it.each([[false, false], [true, false], [false, true], [true, true]])(
    'shows one unavailable-cost notice only when requested: time series=%s, dot plot=%s', async (timeSeries, dotPlot) => {
      const snapshot = dataQualityReadingsSnapshot();
      snapshot.meterData = snapshot.meterData.map(reading => ({ ...reading, totalCost: 0 }));
      Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
        includeMeterCostTimeseriesGraph: timeSeries, includeMeterCostHistogram: dotPlot
      });
      const { root } = await setup(snapshot);
      expect(root.querySelectorAll('.cost-chart-notice')).toHaveLength(timeSeries || dotPlot ? 1 : 0);
    });
  it('renders reading evidence independently of global status, statistics, pending sections, copy, and chart downloads', async () => {
    const { root, copyTable, presentation, harness } = await setup();
    expect(root.textContent).toContain('Meter a'); expect(root.textContent).toContain('32.5');
    expect(root.textContent).toContain('1 consumption reading(s) outside the expected range.');
    expect(root.textContent).toContain('Months with multiple readings: Jan 2024');
    expect(root.textContent).toContain('Consumption distribution');
    expect(root.querySelector('.cost-chart-notice')).toBeNull();
    expect(root.textContent).not.toContain('Sections being implemented');
    expect(root.textContent).not.toContain('Reading quality evidence');
    expect(root.textContent).not.toContain('Readings Over Time');
    const component = presentation('consumption')!;
    expect(component.showExpectedRangeLabel()).toBe(false);
    expect(root.querySelectorAll('.meter-report .report-component-divider')).toHaveLength(4);
    component.downloadQualityChart();
    expect(component.qualityChart!.downloadPng).toHaveBeenCalledWith('Meter a-consumption-readings');
    const cost = presentation('cost')!; cost.downloadQualityChart();
    expect(cost.qualityChart!.downloadPng).toHaveBeenCalledWith('Meter a-cost-readings');
    root.querySelector<HTMLButtonElement>('.v1-meter-quality__footer button')!.click();
    await vi.waitFor(() => expect(copyTable).toHaveBeenCalledTimes(1));
  });
  it('respects independent statistics and chart switches and preserves the report cost policy for zero-average costs', async () => {
    const snapshot = dataQualityReadingsSnapshot();
    snapshot.meterData = snapshot.meterData.map((reading, index) => ({ ...reading, totalCost: index % 2 ? -10 : 10 }));
    snapshot.facilityReports[0].dataQualityReportSettings.includeMeterStatisticsTable = false;
    const { root, presentation } = await setup(snapshot);
    expect(root.querySelector('.v1-meter-quality__table')).toBeNull();
    expect(presentation('consumption')!.hasConsumptionChartData()).toBe(true);
    expect(presentation('cost')).toBeUndefined();
    expect(root.textContent).toContain('average cost is zero');
    expect(root.querySelectorAll('.cost-chart-notice')).toHaveLength(1);
  });
  it('preserves report precision and statistics cost rows even when cost charts are suppressed', async () => {
    const snapshot = dataQualityReadingsSnapshot();
    snapshot.meterData = snapshot.meterData.map((reading, index) => ({ ...reading, totalEnergyUse: 1.234567, totalCost: index % 2 ? -10 : 10 }));
    const { root, presentation } = await setup(snapshot);
    expect(root.textContent).toContain('1.2346');
    expect(presentation().statisticRows().map(row => row.id)).toEqual(['consumption', 'cost']);
    expect(presentation('cost')).toBeUndefined();
  });
  it('renders consumption charts but hides consumption statistics for excluded electricity, matching the v0 report', async () => {
    const snapshot = dataQualityReadingsSnapshot(); snapshot.meters[0].includeInEnergy = false;
    const { presentation } = await setup(snapshot);
    expect(presentation().statisticRows().map(row => row.id)).toEqual(['cost']);
    expect(presentation('consumption')!.hasConsumptionChartData()).toBe(true);
  });
  it('groups each meter in its own document portion and shows the report name once', async () => {
    const snapshot = dataQualityReadingsSnapshot();
    snapshot.facilityReports[0].dataQualityReportSettings.selectedMeterIds = ['meter-a', 'meter-b'];
    const { root } = await setup(snapshot);
    const documents = [...root.querySelectorAll('article.meter-report')];
    expect(documents).toHaveLength(2);
    expect(documents.map(document => document.querySelector('h3')!.textContent)).toEqual(['Meter a', 'Meter b']);
    expect(documents.map(document => document.querySelectorAll('app-meter-quality-presentation').length)).toEqual([3, 3]);
    expect(root.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
    expect(root.querySelector('#data-quality-report-heading')!.textContent).toBe(snapshot.facilityReports[0].name);
    const headings = [...root.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(headings).size).toBe(headings.length);
  });
  it('removes stale results after readings change and blocks when every selected source is deleted', async () => {
    const { store, results, harness, root } = await setup();
    const first = store.meterData()[0];
    const changed = { ...first, totalEnergyUse: 50 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changed] }] });
    expect(results.state().value).toBeUndefined();
    harness.detectChanges(); expect(root.querySelector('.v1-meter-quality__table')).toBeNull();
    await vi.waitFor(() => { harness.detectChanges(); expect(root.textContent).toContain('42.5'); });
    store.publishCommittedPatch({ collections: [
      { collection: 'meters', deleteGuids: ['meter-a'] }, { collection: 'predictors', deleteGuids: ['predictor-a'] }
    ] });
    harness.detectChanges(); expect(root.querySelector('.v1-meter-quality__table')).toBeNull();
    expect(root.textContent).toContain('Review Setup');
  });
});
