import { CommonModule } from '@angular/common';
import { Directive, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { vi } from 'vitest';
import { meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import {
  BillInspectionCorrelationChartComponent,
  billInspectionAxisBounds,
  billInspectionCorrelationOption
} from './bill-inspection-correlation-chart.component';
import { buildBillInspectionReport } from '../meter-workbench-bill-inspection.models';

describe('BillInspectionCorrelationChartComponent options', () => {
  it('focuses correlation axes around plotted points instead of forcing zero', () => {
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [charge('charge-demand', 'Demand Charge', 'demand')] }),
      [
        reading({ guid: 'reading-a', month: 1, totalEnergyUse: 900, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 10000, chargeUsage: 0 }] }),
        reading({ guid: 'reading-b', month: 2, totalEnergyUse: 950, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 10500, chargeUsage: 0 }] }),
        reading({ guid: 'reading-c', month: 3, totalEnergyUse: 1000, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 11000, chargeUsage: 0 }] })
      ]
    );
    const chargeView = report.charges[0];
    const plot = chargeView.plots.find(candidate => candidate.metric === 'consumption')!;

    const option = billInspectionCorrelationOption(chargeView.charge, plot) as Record<string, any>;
    const series = option.series as Array<Record<string, any>>;

    expect(option.xAxis.min).toBeGreaterThan(0);
    expect(option.yAxis.min).toBeGreaterThan(0);
    expect(option.xAxis.min).toBeLessThan(900);
    expect(option.xAxis.max).toBeGreaterThan(1000);
    expect(option.xAxis.splitNumber).toBe(4);
    expect(option.xAxis.axisLabel).toEqual(expect.objectContaining({ hideOverlap: true }));
    expect(option.xAxis.axisLabel.rotate).toBeUndefined();
    expect(option.xAxis.axisLabel.formatter(900000)).toBe('900K');
    expect(option.xAxis.axisLabel.formatter(1200000)).toBe('1.2M');
    expect(series.find(item => item.name === 'Best fit')?.z).toBeGreaterThan(series.find(item => item.name === 'Demand Charge')?.z);
  });

  it('clamps padded lower bounds to zero only when padding crosses zero', () => {
    expect(billInspectionAxisBounds([0.02, 1])?.min).toBe(0);
    expect(billInspectionAxisBounds([100, 110])?.min).toBeGreaterThan(0);
  });

  it('formats correlation cost labels and tooltips as whole dollars', () => {
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [charge('charge-demand', 'Demand Charge', 'demand')] }),
      [
        reading({ guid: 'reading-a', month: 1, totalCost: 120.45, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20.25, chargeUsage: 0 }] }),
        reading({ guid: 'reading-b', month: 2, totalCost: 130.45, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 25.25, chargeUsage: 0 }] }),
        reading({ guid: 'reading-c', month: 3, totalCost: 140.45, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 30.25, chargeUsage: 0 }] })
      ]
    );
    const chargeView = report.charges[0];
    const plot = chargeView.plots.find(candidate => candidate.metric === 'totalCost')!;
    const option = billInspectionCorrelationOption(chargeView.charge, plot) as Record<string, any>;
    const series = option.series as Array<Record<string, any>>;
    const tooltip = option.tooltip as Record<string, any>;

    expect(option.xAxis.axisLabel.formatter(120.45)).toBe('$120');
    expect(option.xAxis.axisLabel.formatter(120000)).toBe('$120K');
    expect(option.yAxis.axisLabel.formatter(20.25)).toBe('$20');
    expect(tooltip.formatter({
      name: 'Jan 1, 2026',
      value: [120.45, 20.25],
      data: series[0].data[0]
    })).toContain('Demand Charge: $20');
  });

  it('renders best fit and R squared on separate lines only when regression exists', () => {
    const withRegressionReport = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [charge('charge-demand', 'Demand Charge', 'demand')] }),
      [
        reading({ guid: 'reading-a', month: 1, totalEnergyUse: 10, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 0 }] }),
        reading({ guid: 'reading-b', month: 2, totalEnergyUse: 20, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 40, chargeUsage: 0 }] }),
        reading({ guid: 'reading-c', month: 3, totalEnergyUse: 30, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 60, chargeUsage: 0 }] })
      ]
    );
    const noRegressionReport = buildBillInspectionReport(
      meter({ guid: 'meter-b', charges: [charge('charge-demand', 'Demand Charge', 'demand')] }),
      [
        reading({ guid: 'reading-a', month: 1, totalEnergyUse: 10, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 0 }] }),
        reading({ guid: 'reading-b', month: 2, totalEnergyUse: 20, charges: [{ chargeGuid: 'charge-demand', chargeAmount: 40, chargeUsage: 0 }] })
      ]
    );

    const regressionFixture = setup();
    regressionFixture.componentInstance.chargeView = withRegressionReport.charges[0];
    regressionFixture.componentInstance.plot = withRegressionReport.charges[0].plots[0];
    regressionFixture.detectChanges();

    const regressionParagraphs = Array.from(regressionFixture.nativeElement.querySelectorAll('.v1-meter-bill-inspection__correlation-heading p'))
      .map((paragraph: Element) => paragraph.textContent?.trim());
    expect(regressionParagraphs).toHaveLength(2);
    expect(regressionParagraphs[0]).toContain('Best fit:');
    expect(regressionParagraphs[1]).toContain('R2 1');

    TestBed.resetTestingModule();

    const noRegressionFixture = setup();
    noRegressionFixture.componentInstance.chargeView = noRegressionReport.charges[0];
    noRegressionFixture.componentInstance.plot = noRegressionReport.charges[0].plots[0];
    noRegressionFixture.detectChanges();

    expect(noRegressionFixture.nativeElement.textContent).toContain('Best fit needs at least three paired readings');
    expect(noRegressionFixture.nativeElement.textContent).not.toContain('R2');
  });

  it('keeps the accessible table inside a visually hidden wrapper', () => {
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [charge('charge-demand', 'Demand Charge', 'demand')] }),
      [
        reading({
          guid: 'reading-a',
          totalEnergyUse: 10,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 5 }]
        })
      ]
    );
    const fixture = setup();
    fixture.componentInstance.chargeView = report.charges[0];
    fixture.componentInstance.plot = report.charges[0].plots[0];
    fixture.detectChanges();
    const accessibleData = fixture.nativeElement.querySelector('.v1-meter-bill-inspection__correlation-accessible-data') as HTMLDivElement;
    const table = accessibleData.querySelector('table') as HTMLTableElement;

    expect(accessibleData.classList).toContain('visually-hidden');
    expect(table.classList).not.toContain('visually-hidden');
    expect(table.caption?.textContent).toContain('data for Demand Charge');
    expect(table.textContent).toContain('Charge Usage');
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
  @Output() dataZoomChanged = new EventEmitter<V1EChartsDataZoomRange>();
  readonly downloadPng = vi.fn();
}

function setup(): ComponentFixture<BillInspectionCorrelationChartComponent> {
  TestBed.configureTestingModule({
    declarations: [BillInspectionCorrelationChartComponent],
    imports: [CommonModule, EChartsStubDirective]
  });

  return TestBed.createComponent(BillInspectionCorrelationChartComponent);
}

function charge(guid: string, name: string, chargeType: 'demand' | 'other') {
  return {
    guid,
    name,
    chargeType,
    displayUsageInTable: true,
    displayChargeInTable: true
  };
}
