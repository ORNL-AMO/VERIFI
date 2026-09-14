import { CommonModule } from '@angular/common';
import { Directive, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterGroupResultRow, MeterGroupResultsView } from '../../facility-meters.models';
import { group } from '../../facility-meters.testing';
import { MeterGroupWorkbenchGraphComponent } from './meter-group-workbench-graph.component';

describe('MeterGroupWorkbenchGraphComponent', () => {
  it('exposes selected display modes with aria-pressed', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;

    expect(button(root, 'Show utility as bars')?.getAttribute('aria-pressed')).toBe('true');
    expect(button(root, 'Hide utility')?.getAttribute('aria-pressed')).toBe('false');
    expect(button(root, 'Show cost as line')?.getAttribute('aria-pressed')).toBe('true');

    button(root, 'Hide utility')?.click();
    fixture.detectChanges();

    expect(button(root, 'Hide utility')?.getAttribute('aria-pressed')).toBe('true');
    expect(button(root, 'Show utility as bars')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('removes hidden series, aligns dual axes, and maps yearly labels', () => {
    const fixture = setup({
      period: 'yearly',
      results: signal(resultsView({
        yearlyRows: [
          { periodKey: '2025', periodLabel: '2025', sortValue: 2025, fiscalYear: 2025, energyUse: 120, energyConsumption: 0, energyCost: 450 }
        ]
      }))
    });
    const component = fixture.componentInstance;

    let option = component.chartOption() as Record<string, any>;
    expect(option.xAxis.data).toEqual(['FY 2025']);
    expect(option.series.map((series: { name: string }) => series.name)).toEqual(['Total Energy', 'Total Cost']);
    expect(option.yAxis).toHaveLength(2);
    expect(option.yAxis.every((axis: { alignTicks?: boolean }) => axis.alignTicks)).toBe(true);

    component.setUtilityDisplay('off');
    option = component.chartOption() as Record<string, any>;

    expect(option.series.map((series: { name: string }) => series.name)).toEqual(['Total Cost']);
    expect(option.yAxis).toHaveLength(1);
    expect(option.yAxis[0].name).toBe('Total Cost');
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
}

function setup(options: {
  results?: ReturnType<typeof signal<MeterGroupResultsView>>;
  period?: 'monthly' | 'yearly';
} = {}): ComponentFixture<MeterGroupWorkbenchGraphComponent> {
  TestBed.configureTestingModule({
    declarations: [MeterGroupWorkbenchGraphComponent],
    imports: [CommonModule, EChartsStubDirective, IconComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          selectedMeterGroupResults: options.results ?? signal(resultsView()),
          calendarizationState: signal('ready')
        }
      },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { meterGroupPeriod: options.period ?? 'monthly' } } } }
    ]
  });
  const fixture = TestBed.createComponent(MeterGroupWorkbenchGraphComponent);
  fixture.detectChanges();
  return fixture;
}

function resultsView(options: Partial<MeterGroupResultsView> = {}): MeterGroupResultsView {
  const selectedGroup = group({ guid: 'group-energy', name: 'Energy Group', groupType: 'Energy' });
  return {
    group: selectedGroup,
    assignedMeters: [],
    calendarizedMeters: [],
    monthlyRows: [row(2026, 0, 100, 250), row(2026, 1, 120, 275)],
    yearlyRows: [],
    showEnergyUse: true,
    showConsumption: false,
    showCost: true,
    utilityLabel: 'Total Energy',
    utilityUnit: 'MMBtu',
    summary: {
      assignedMeterCount: 0,
      firstDataLabel: 'Jan 2026',
      latestDataLabel: 'Feb 2026',
      utilityTotalLabel: '220',
      utilityTotalValue: 220,
      costTotalLabel: '$525.00',
      costTotalValue: 525
    },
    usageFacts: { facts: [] },
    ...options
  };
}

function row(year: number, monthIndex: number, energyUse: number, energyCost: number): MeterGroupResultRow {
  const date = new Date(year, monthIndex, 1);
  return {
    periodKey: `${year}-${monthIndex}`,
    periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    sortValue: date.getTime(),
    fiscalYear: year,
    energyUse,
    energyConsumption: 0,
    energyCost
  };
}

function button(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find(item => item.textContent?.includes(label) || item.getAttribute('aria-label')?.includes(label));
}
