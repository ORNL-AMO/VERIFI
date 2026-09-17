import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/facility/data/meters/facility-meters.models';
import { account, facility, meter } from '@app/v1/facility/data/meters/facility-meters.testing';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { MeterWorkbenchYearlyDataComponent } from './meter-workbench-yearly-data.component';

describe('MeterWorkbenchYearlyDataComponent', () => {
  it('prompts for settings when the meter has no calendarization method', () => {
    const fixture = setup({
      selectedMeter: meter({ guid: 'meter-a', meterReadingDataApplication: undefined })
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Select a calendarization method');

    element.querySelector<HTMLButtonElement>('.v1-btn')?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-a',
      'settings'
    ], { fragment: 'meter-reading-settings' });
  });

  it('renders yearly chart inputs and fiscal-year table totals', () => {
    vi.useFakeTimers();
    const copyTable = vi.fn();
    try {
      const fixture = setup({
        copyTable,
        calendarizedMeters: [
          calendarizedMeter([
            monthlyData({
              date: new Date(2025, 11, 1),
              monthNumValue: 11,
              year: 2025,
              fiscalYear: 2026,
              energyConsumption: 10,
              energyUse: 20,
              energyCost: 30,
              totalWithMarketEmissions: 1
            }),
            monthlyData({
              date: new Date(2026, 0, 1),
              monthNumValue: 0,
              year: 2026,
              fiscalYear: 2026,
              energyConsumption: 12,
              energyUse: 24,
              energyCost: 36,
              totalWithMarketEmissions: 2
            })
          ])
        ]
      });
      const component = fixture.componentInstance;

      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(component.chartRows()).toEqual([
        expect.objectContaining({
          periodKey: '2026',
          periodLabel: 'FY 2026',
          values: expect.objectContaining({ energyConsumption: 22, energyUse: 44, energyCost: 66 })
        })
      ]);
      expect(element.textContent).toContain('Fiscal Year');
      expect(element.textContent).toContain('FY 2026');
      expect(element.textContent).toContain('44');
      expect(element.textContent).toContain('$66.00');
      expect(fixture.debugElement.query(By.directive(MeterResultsChartStubComponent)).componentInstance.joinsFollowingSection)
        .toBe(true);

      element.querySelector<HTMLButtonElement>('.v1-meter-yearly-data__footer .v1-btn')?.click();
      vi.runOnlyPendingTimers();
      expect(copyTable).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['all cost values are zero', [0, 0]],
    ['cost values net to zero', [30, -30]]
  ] as const)('hides the yearly Total Cost column when %s', (_scenario, costs) => {
    const fixture = setup({
      calendarizedMeters: [
        calendarizedMeter(costs.map((energyCost, index) => monthlyData({
          date: new Date(2026, index, 1),
          monthNumValue: index,
          energyCost
        })))
      ]
    });

    fixture.detectChanges();

    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    expect(component.hasLifetimeCost()).toBe(false);
    expect(component.columns().map(column => column.id)).not.toContain('energyCost');
    expect(component.defaultRightMetricId()).toBeUndefined();
    expect(element.textContent).not.toContain('Total Cost');
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
  selectedMeter?: ReturnType<typeof meter>;
  calendarizedMeters?: readonly CalanderizedMeter[];
  calendarizationState?: 'idle' | 'loading' | 'ready' | 'error';
  copyTable?: ReturnType<typeof vi.fn>;
} = {}): ComponentFixture<MeterWorkbenchYearlyDataComponent> {
  const selectedMeter = options.selectedMeter ?? meter({
    guid: 'meter-a',
    name: 'Electric Main',
    meterReadingDataApplication: 'backward'
  });

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchYearlyDataComponent],
    imports: [CommonModule, IconComponent, MeterResultsChartStubComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal(account({ displayEmissions: true })),
          facility: signal(facility({ guid: 'facility-a', energyUnit: 'MMBtu' })),
          selectedMeter: signal(selectedMeter),
          calendarizedMeters: signal(options.calendarizedMeters ?? []),
          calendarizationState: signal(options.calendarizationState ?? 'ready')
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

  return TestBed.createComponent(MeterWorkbenchYearlyDataComponent);
}

function calendarizedMeter(monthlyRows: MonthlyData[]): CalanderizedMeter {
  return {
    meter: meter({ guid: 'meter-a', meterReadingDataApplication: 'backward' }),
    consumptionUnit: 'kWh',
    energyUnit: 'MMBtu',
    energyIsSource: false,
    monthlyData: monthlyRows,
    showConsumption: true,
    showEnergyUse: true,
    showElectricalEmissions: true,
    showOtherScope2Emissions: false,
    showStationaryEmissions: false,
    showFugitiveEmissions: false,
    showProcessEmissions: false,
    showMobileEmissions: false
  };
}

function monthlyData(options: Partial<MonthlyData> = {}): MonthlyData {
  return {
    month: 'January',
    monthNumValue: 0,
    year: 2026,
    fiscalYear: 2026,
    energyConsumption: 10,
    energyUse: 20,
    energyCost: 30,
    date: new Date(2026, 0, 1),
    readingType: 'metered',
    RECs: 0,
    locationElectricityEmissions: 0,
    marketElectricityEmissions: 0,
    otherScope2Emissions: 0,
    scope2LocationEmissions: 0,
    scope2MarketEmissions: 0,
    excessRECs: 0,
    excessRECsEmissions: 0,
    mobileCarbonEmissions: 0,
    mobileBiogenicEmissions: 0,
    mobileOtherEmissions: 0,
    mobileTotalEmissions: 0,
    fugitiveEmissions: 0,
    processEmissions: 0,
    stationaryBiogenicEmmissions: 0,
    stationaryCarbonEmissions: 0,
    stationaryOtherEmissions: 0,
    stationaryEmissions: 0,
    totalScope1Emissions: 0,
    totalWithMarketEmissions: 0,
    totalWithLocationEmissions: 0,
    totalBiogenicEmissions: 0,
    ...options
  };
}
