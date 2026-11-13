import { Directive, forwardRef, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterQualityPresentationComponent } from './meter-quality-presentation.component';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
function setup() {
  const copyTable = vi.fn(), snapshot = analysisReportFixture();
  TestBed.configureTestingModule({ declarations: [MeterQualityPresentationComponent], imports: [IconComponent, ChartStub],
    providers: [{ provide: CopyTableService, useValue: { copyTable } }] });
  const fixture = TestBed.createComponent(MeterQualityPresentationComponent);
  fixture.componentRef.setInput('report', buildMeterDataQualityReport(snapshot.meterData, snapshot.meters[0]));
  fixture.componentRef.setInput('idPrefix', 'meter-quality'); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, copyTable };
}
describe('Shared meter quality presentation', () => {
  it('copies the mounted statistics table and delegates PNG downloads with the surface filename', () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, copyTable } = setup();
      component.copyStatisticsTable(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('table').classList.contains('copying-table')).toBe(true);
      vi.runOnlyPendingTimers();
      expect(copyTable.mock.calls[0][0].nativeElement).toBe(fixture.nativeElement.querySelector('table'));
      component.downloadQualityChart(); expect(component.qualityChart!.downloadPng).toHaveBeenCalledWith('meter-data-quality-readings');
      fixture.componentRef.setInput('chartFileName', 'report-meter'); fixture.detectChanges();
      component.downloadQualityChart(); expect(component.qualityChart!.downloadPng).toHaveBeenLastCalledWith('report-meter');
    } finally { vi.useRealTimers(); }
  });
  it('cancels a pending clipboard operation when its stage is destroyed', () => {
    vi.useFakeTimers();
    try {
      const { fixture, component, copyTable } = setup();
      component.copyStatisticsTable(); fixture.destroy(); vi.runAllTimers();
      expect(copyTable).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
  it('hides the report range label while preserving the shaded bounds and workbench default', () => {
    const { fixture, component } = setup(), snapshot = analysisReportFixture();
    fixture.componentRef.setInput('report', buildMeterDataQualityReport(snapshot.meterData.map((reading, index) => ({
      ...reading, totalEnergyUse: index + 1
    })), snapshot.meters[0]));
    fixture.detectChanges();
    const original = component.qualityChartOption() as Record<string, any>;
    expect(original.series[0].markArea.label.show).toBe(true);
    fixture.componentRef.setInput('showExpectedRangeLabel', false); fixture.detectChanges();
    const option = component.qualityChartOption() as Record<string, any>;
    expect(option.series[0].markArea.label.show).toBe(false);
    expect(option.series[0].markArea.data).toEqual(original.series[0].markArea.data);
  });
});
