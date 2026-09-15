import { CommonModule } from '@angular/common';
import { Directive, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { vi } from 'vitest';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '../../../../../shared/charts/echarts-chart.directive';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { facility, meter, reading } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterWorkbenchQualityReportComponent } from './meter-workbench-quality-report.component';

describe('MeterWorkbenchQualityReportComponent', () => {
  it('renders an empty state and routes users to readings when no meter readings exist', () => {
    const fixture = setup({ meterData: [] });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No readings found');
    element.querySelector<HTMLButtonElement>('.v1-btn')?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-a',
      'readings'
    ]);
  });

  it('renders warnings, statistics, charts, duplicate months, and copy support', () => {
    vi.useFakeTimers();
    const copyTable = vi.fn();
    try {
      const fixture = setup({
        copyTable,
        meterData: [
          reading({ guid: 'reading-a', month: 1, year: 2026, totalEnergyUse: 10, totalCost: 10 }),
          reading({ guid: 'reading-b', month: 1, year: 2026, day: 15, totalEnergyUse: 10, totalCost: 10 }),
          reading({ guid: 'reading-c', month: 2, year: 2026, totalEnergyUse: 10, totalCost: 10 }),
          reading({ guid: 'reading-d', month: 3, year: 2026, totalEnergyUse: 100, totalCost: 100 })
        ]
      });
      const component = fixture.componentInstance;

      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain('Data quality issues found');
      expect(element.textContent).toContain('1 consumption reading outside the expected range');
      expect(element.textContent).toContain('1 cost reading outside the expected range');
      expect(element.textContent).toContain('1 month with multiple readings');
      expect(element.textContent).toContain('Total Consumption and Cost Statistics');
      expect(element.textContent).toContain('Total Consumption (kWh)');
      expect(element.textContent).toContain('Total Cost ($)');
      expect(element.textContent).toContain('Months with Multiple Readings');
      expect(element.textContent).toContain('Jan 2026');
      expect(element.textContent).toContain('Readings Over Time');
      expect(element.textContent).not.toContain('Time Series');
      expect(element.querySelectorAll('.v1-meter-quality__chart')).toHaveLength(1);
      const chartOption = component.qualityChartOption() as Record<string, any>;
      expect(chartOption.grid).toHaveLength(2);
      expect(chartOption.xAxis).toEqual([
        expect.objectContaining({ gridIndex: 0, axisLabel: { show: false } }),
        expect.objectContaining({ gridIndex: 1 })
      ]);
      expect(chartOption.dataZoom[0].xAxisIndex).toEqual([0, 1]);
      expect(chartOption.yAxis).toEqual([
        expect.objectContaining({
          name: 'Total Consumption (kWh)',
          axisLabel: expect.objectContaining({ show: true, formatter: expect.any(Function) })
        }),
        expect.objectContaining({
          name: 'Total Cost ($)',
          axisLabel: expect.objectContaining({ show: true, formatter: expect.any(Function) })
        })
      ]);
      expect(chartOption.series).toEqual([
        expect.objectContaining({ name: 'Total Consumption', type: 'line', showSymbol: true, xAxisIndex: 0, yAxisIndex: 0 }),
        expect.objectContaining({ name: 'Total Consumption Outliers', type: 'scatter', xAxisIndex: 0, yAxisIndex: 0 }),
        expect.objectContaining({ name: 'Total Cost', type: 'line', showSymbol: true, xAxisIndex: 1, yAxisIndex: 1 }),
        expect.objectContaining({ name: 'Total Cost Outliers', type: 'scatter', xAxisIndex: 1, yAxisIndex: 1 })
      ]);
      expect(element.textContent).not.toContain('Distribution of Total Consumption');
      expect(element.textContent).not.toContain('Distribution of Total Cost');
      expect(element.textContent).not.toContain('Annual Totals');

      element.querySelector<HTMLButtonElement>('.v1-meter-quality__footer .v1-btn')?.click();
      vi.runOnlyPendingTimers();
      expect(copyTable).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides cost and consumption sections when meter display rules exclude them', () => {
    const fixture = setup({
      selectedMeter: meter({ guid: 'meter-a', source: 'Electricity', includeInEnergy: false }),
      meterData: [
        reading({ guid: 'reading-a', totalEnergyUse: 10, totalCost: 0 }),
        reading({ guid: 'reading-b', month: 2, totalEnergyUse: 20, totalCost: 0 })
      ]
    });

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).not.toContain('Total Consumption (kWh)');
    expect(element.textContent).not.toContain('Total Cost ($)');
    expect(element.querySelector('.v1-meter-quality__chart')).toBeNull();
  });

  it('renders a shaded expected range band when the MAD bounds have width', () => {
    const fixture = setup({
      meterData: [
        reading({ guid: 'reading-a', month: 1, year: 2026, totalEnergyUse: 10, totalCost: 10 }),
        reading({ guid: 'reading-b', month: 2, year: 2026, totalEnergyUse: 11, totalCost: 11 }),
        reading({ guid: 'reading-c', month: 3, year: 2026, totalEnergyUse: 12, totalCost: 12 })
      ]
    });

    const option = fixture.componentInstance.qualityChartOption() as Record<string, any>;
    const meterDataSeries = option.series.find((series: { name: string }) => series.name === 'Total Consumption');

    expect(meterDataSeries.markArea.data).toEqual([[{ name: 'Expected range', yAxis: 6 }, { yAxis: 16 }]]);
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

function setup(options: {
  selectedMeter?: ReturnType<typeof meter>;
  meterData?: ReturnType<typeof reading>[];
  copyTable?: ReturnType<typeof vi.fn>;
} = {}): ComponentFixture<MeterWorkbenchQualityReportComponent> {
  const selectedMeter = options.selectedMeter ?? meter({
    guid: 'meter-a',
    name: 'Electric Main',
    meterReadingDataApplication: 'backward'
  });

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchQualityReportComponent],
    imports: [CommonModule, IconComponent, EChartsStubDirective],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal(facility({ guid: 'facility-a', energyUnit: 'MMBtu' })),
          selectedMeter: signal(selectedMeter),
          selectedMeterData: signal(options.meterData ?? [
            reading({ guid: 'reading-a', totalEnergyUse: 10, totalCost: 20 }),
            reading({ guid: 'reading-b', month: 2, totalEnergyUse: 12, totalCost: 24 })
          ])
        }
      },
      { provide: CopyTableService, useValue: { copyTable: options.copyTable ?? vi.fn() } },
      { provide: Router, useValue: { navigate: vi.fn() } },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: string) => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            'meters',
            meterGuid,
            tab
          ]
        }
      }
    ]
  });

  return TestBed.createComponent(MeterWorkbenchQualityReportComponent);
}
