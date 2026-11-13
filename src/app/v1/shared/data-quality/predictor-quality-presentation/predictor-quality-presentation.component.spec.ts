import { Directive, forwardRef, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { buildPredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { PredictorQualityPresentationComponent } from './predictor-quality-presentation.component';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
function setup() {
  const copyTable = vi.fn(), snapshot = regressionAnalysisReportFixture();
  const readings = snapshot.predictorData.filter(reading => reading.predictorId === snapshot.predictors[0].guid)
    .map((reading, index) => ({ ...reading, amount: index + 1 }));
  TestBed.configureTestingModule({ declarations: [PredictorQualityPresentationComponent], imports: [IconComponent, ChartStub],
    providers: [{ provide: CopyTableService, useValue: { copyTable } }] });
  const fixture = TestBed.createComponent(PredictorQualityPresentationComponent);
  fixture.componentRef.setInput('report', buildPredictorDataQualityReport(readings, snapshot.predictors[0]));
  fixture.componentRef.setInput('idPrefix', 'predictor-quality'); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, copyTable };
}

describe('Shared predictor quality presentation', () => {
  it('copies the mounted table once and delegates chart PNG actions using the surface filename', () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, copyTable } = setup();
      component.copyStatisticsTable(); component.copyStatisticsTable(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('table').classList.contains('copying-table')).toBe(true);
      vi.runOnlyPendingTimers();
      expect(copyTable).toHaveBeenCalledOnce();
      expect(copyTable.mock.calls[0][0].nativeElement).toBe(fixture.nativeElement.querySelector('table'));
      fixture.componentRef.setInput('chartFileName', 'report-predictor'); fixture.detectChanges();
      component.downloadQualityChart(); expect(component.qualityChart!.downloadPng).toHaveBeenCalledWith('report-predictor');
    } finally { vi.useRealTimers(); }
  });
  it('cancels copying when the report stage is destroyed', () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, copyTable } = setup();
      component.copyStatisticsTable(); fixture.destroy(); vi.runAllTimers();
      expect(copyTable).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
  it('hides the range label for reports while retaining bounds, chart data, and accessible outlier evidence', () => {
    const { fixture, component } = setup();
    const original = component.qualityChartOption() as Record<string, any>;
    expect(original.series[0].markArea.label.show).toBe(true);
    fixture.componentRef.setInput('showExpectedRangeLabel', false); fixture.detectChanges();
    const option = component.qualityChartOption() as Record<string, any>;
    expect(option.series[0].markArea.label.show).toBe(false);
    expect(option.series[0].markArea.data).toEqual(original.series[0].markArea.data);
    expect(component.accessibleChartRows()).toHaveLength(36);
  });
  it('labels UTC reading periods without shifting them into the previous month in local time zones', () => {
    const { component } = setup();
    const option = component.qualityChartOption() as Record<string, any>;
    expect(option.xAxis.axisLabel.formatter(Date.UTC(2024, 0, 1))).toBe('Jan 2024');
    expect(option.tooltip.formatter([{ seriesName: 'Predictor values', value: [Date.UTC(2024, 0, 1), 10] }])).toContain('Jan 2024');
  });
  it.each(['Outliers', 'Weather warnings', 'Revised weather data'])(
    'omits the duplicate %s tooltip row while retaining the predictor value', seriesName => {
      const { component } = setup();
      const option = component.qualityChartOption() as Record<string, any>;
      const value = [Date.UTC(2024, 0, 1), 100];
      const tooltip = document.createElement('div');
      tooltip.innerHTML = option.tooltip.formatter([{ seriesName: 'Predictor values', value }, { seriesName, value }]);
      expect(tooltip.textContent).toBe('Jan 2024Predictor values: 100');
    });
  it('shows a marker-only reading once when the predictor line is hidden', () => {
    const { component } = setup();
    const option = component.qualityChartOption() as Record<string, any>;
    const tooltip = document.createElement('div');
    tooltip.innerHTML = option.tooltip.formatter(['Outliers', 'Weather warnings', 'Revised weather data']
      .map(seriesName => ({ seriesName, value: [Date.UTC(2024, 0, 1), 100] })));
    expect(tooltip.textContent).toBe('Jan 2024Predictor values: 100');
  });
  it('preserves distinct and duplicate source readings while removing only repeated marker values', () => {
    const { component } = setup();
    const option = component.qualityChartOption() as Record<string, any>;
    const timestamp = Date.UTC(2024, 0, 1), tooltip = document.createElement('div');
    tooltip.innerHTML = option.tooltip.formatter([
      { seriesName: 'Predictor values', value: [timestamp, 10] },
      { seriesName: 'Predictor values', value: [timestamp, 10] },
      { seriesName: 'Weather warnings', value: [timestamp, 10] },
      { seriesName: 'Outliers', value: [timestamp, 100] },
      { seriesName: 'Revised weather data', value: [timestamp, 100] }
    ]);
    expect(tooltip.textContent).toBe('Jan 2024Predictor values: 10Predictor values: 10Predictor values: 100');
  });
  it('keeps missing-month guidance without displaying its artificial marker value as a reading', () => {
    const { component } = setup();
    const option = component.qualityChartOption() as Record<string, any>;
    const tooltip = document.createElement('div');
    tooltip.innerHTML = option.tooltip.formatter({ seriesName: 'Missing months', value: [Date.UTC(2024, 1, 1), 6] });
    expect(tooltip.textContent).toBe('Feb 2024Missing months: No reading');
  });
});
