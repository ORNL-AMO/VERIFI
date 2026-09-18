import { CommonModule } from '@angular/common';
import { Directive, Input, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { BillInspectionOverviewChartComponent, billInspectionTimeSeriesOption } from './bill-inspection-overview-chart.component';
import { buildBillInspectionReport } from '../meter-workbench-bill-inspection.models';

describe('BillInspectionOverviewChartComponent options', () => {
  it('builds an overview time series for total cost and configured charge amounts', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const powerFactorCharge = charge('charge-pf', 'Power Factor', 'other');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge, powerFactorCharge] }),
      [
        reading({
          guid: 'reading-b',
          month: 2,
          totalCost: 140,
          charges: [
            { chargeGuid: 'charge-demand', chargeAmount: 35, chargeUsage: 12 },
            { chargeGuid: 'charge-pf', chargeAmount: 8, chargeUsage: 0 }
          ]
        }),
        reading({
          guid: 'reading-a',
          month: 1,
          totalCost: 120,
          charges: [
            { chargeGuid: 'charge-demand', chargeAmount: 30, chargeUsage: 10 },
            { chargeGuid: 'charge-pf', chargeAmount: 6, chargeUsage: 0 }
          ]
        })
      ]
    );

    const option = billInspectionTimeSeriesOption(report) as Record<string, any>;
    const series = option.series as Array<Record<string, any>>;

    expect(report.rows.map(row => row.reading.guid)).toEqual(['reading-a', 'reading-b']);
    expect(series.map(item => item.name)).toEqual(['Total Cost', 'Demand Charge', 'Power Factor']);
    expect(series[1].data).toEqual([
      [new Date(2026, 0, 1).getTime(), 30],
      [new Date(2026, 1, 1).getTime(), 35]
    ]);
    expect(option.legend).toEqual(expect.objectContaining({ type: 'scroll' }));
  });

  it('assigns unique colors to every overview time series', () => {
    const charges = [
      charge('charge-demand', 'Demand Charge', 'demand'),
      charge('charge-ratchet', 'Ratchet Demand', 'demand'),
      charge('charge-pf', 'Power Factor', 'other'),
      charge('charge-consumption', 'Consumption', 'other')
    ];
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges }),
      [
        reading({
          guid: 'reading-a',
          totalCost: 120,
          charges: charges.map((meterCharge, index) => ({
            chargeGuid: meterCharge.guid,
            chargeAmount: 10 + index,
            chargeUsage: 40 + index
          }))
        })
      ]
    );

    const option = billInspectionTimeSeriesOption(report) as Record<string, any>;
    const series = option.series as Array<Record<string, any>>;
    const colors = series.map(item => item.lineStyle.color);

    expect(colors).toHaveLength(5);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('formats overview cost axis labels and tooltips as whole dollars', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          totalCost: 120.45,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20.25, chargeUsage: 40 }]
        })
      ]
    );

    const option = billInspectionTimeSeriesOption(report) as Record<string, any>;
    const yAxis = option.yAxis as Record<string, any>;
    const tooltip = option.tooltip as Record<string, any>;

    expect(yAxis.axisLabel.formatter(120.45)).toBe('$120');
    expect(tooltip.formatter([
      {
        value: [report.rows[0].sortValue, 120.45],
        seriesName: 'Total Cost',
        marker: ''
      }
    ])).toContain('Total Cost: $120');
  });

  it('omits missing charge values from overview tooltips instead of showing zero dollars', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          totalCost: 120,
          charges: []
        })
      ]
    );

    const option = billInspectionTimeSeriesOption(report) as Record<string, any>;
    const tooltip = option.tooltip as Record<string, any>;
    const tooltipHtml = tooltip.formatter([
      {
        value: [report.rows[0].sortValue, 120],
        seriesName: 'Total Cost',
        marker: ''
      },
      {
        value: [report.rows[0].sortValue, null],
        seriesName: 'Demand Charge',
        marker: ''
      }
    ]);

    expect(tooltipHtml).toContain('Total Cost: $120');
    expect(tooltipHtml).not.toContain('Demand Charge');
    expect(tooltipHtml).not.toContain('$0');
  });

  it('keeps the accessible table inside a visually hidden wrapper', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          totalCost: 120,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 40 }]
        })
      ]
    );
    const fixture = setup(report);
    const accessibleData = fixture.nativeElement.querySelector('.v1-meter-bill-inspection__overview-accessible-data') as HTMLDivElement;
    const table = accessibleData.querySelector('table') as HTMLTableElement;

    expect(accessibleData.classList).toContain('visually-hidden');
    expect(table.classList).not.toContain('visually-hidden');
    expect(table.caption?.textContent).toContain('Utility bill charges over time data');
    expect(table.textContent).toContain('Demand Charge');
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
}

function setup(report: ReturnType<typeof buildBillInspectionReport>): ComponentFixture<BillInspectionOverviewChartComponent> {
  TestBed.configureTestingModule({
    declarations: [BillInspectionOverviewChartComponent],
    imports: [CommonModule, IconComponent, EChartsStubDirective]
  });
  const fixture = TestBed.createComponent(BillInspectionOverviewChartComponent);
  fixture.componentRef.setInput('report', report);
  fixture.componentRef.setInput('meterName', 'Electric Main');
  fixture.detectChanges();
  return fixture;
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
