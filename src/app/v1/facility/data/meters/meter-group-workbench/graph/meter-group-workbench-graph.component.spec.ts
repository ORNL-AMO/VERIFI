import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterGroupResultRow, MeterGroupResultsView, MeterResultsChartMetric, MeterResultsChartRow } from '../../facility-meters.models';
import { group } from '../../facility-meters.testing';
import { MeterGroupWorkbenchGraphComponent } from './meter-group-workbench-graph.component';

describe('MeterGroupWorkbenchGraphComponent', () => {
  it('maps selected group results into shared chart rows and metrics', () => {
    const fixture = setup({
      period: 'yearly',
      results: signal(resultsView({
        yearlyRows: [
          { periodKey: '2025', periodLabel: '2025', sortValue: 2025, fiscalYear: 2025, energyUse: 120, energyConsumption: 0, energyCost: 450 }
        ]
      }))
    });
    const component = fixture.componentInstance;

    expect(component.metrics()).toEqual([
      { id: 'utility', label: 'Total Energy', unit: 'MMBtu' },
      { id: 'cost', label: 'Total Cost', currency: true }
    ]);
    expect(component.chartRows()).toEqual([
      {
        periodKey: '2025',
        periodLabel: 'FY 2025',
        sortValue: 2025,
        values: { utility: 120, cost: 450 }
      }
    ]);
    expect(fixture.debugElement.query(By.directive(MeterResultsChartStubComponent)).componentInstance.joinsFollowingSection)
      .toBe(true);
  });
});

@Component({
  selector: 'app-meter-results-chart',
  template: '',
  standalone: true
})
class MeterResultsChartStubComponent {
  @Input() chartRows: readonly MeterResultsChartRow[] = [];
  @Input() metrics: readonly MeterResultsChartMetric[] = [];
  @Input() defaultLeftMetricId?: string;
  @Input() defaultRightMetricId?: string;
  @Input() period?: string;
  @Input() state?: string;
  @Input() ariaLabel = '';
  @Input() loadingTitle = '';
  @Input() loadingDescription = '';
  @Input() errorTitle = '';
  @Input() errorDescription = '';
  @Input() emptyTitle = '';
  @Input() emptyDescription = '';
  @Input() downloadFileName = '';
  @Input() joinsFollowingSection = false;
}

function setup(options: {
  results?: ReturnType<typeof signal<MeterGroupResultsView>>;
  period?: 'monthly' | 'yearly';
} = {}): ComponentFixture<MeterGroupWorkbenchGraphComponent> {
  TestBed.configureTestingModule({
    declarations: [MeterGroupWorkbenchGraphComponent],
    imports: [CommonModule, MeterResultsChartStubComponent],
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
