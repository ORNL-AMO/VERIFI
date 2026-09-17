import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { MeterResultsChartMetric, MeterResultsChartRow } from '../../facility-meters.models';
import { account, facility, meter } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterWorkbenchMonthlyChartComponent } from './meter-workbench-monthly-chart.component';

describe('MeterWorkbenchMonthlyChartComponent', () => {
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

  it('builds monthly chart rows and default axes for do-not-calendarize meters', () => {
    const fixture = setup({
      selectedMeter: meter({ guid: 'meter-a', meterReadingDataApplication: 'fullMonth' }),
      calendarizedMeters: [
        calendarizedMeter([
          monthlyData({ date: new Date(2026, 0, 1), monthNumValue: 0, energyConsumption: 10, energyUse: 20, energyCost: 30 })
        ])
      ]
    });
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.defaultLeftMetricId()).toBe('energyConsumption');
    expect(component.defaultRightMetricId()).toBe('energyCost');
    expect(component.chartRows()).toEqual([
      expect.objectContaining({
        periodKey: '2026-0',
        periodLabel: 'Jan 2026',
        values: expect.objectContaining({ energyConsumption: 10, energyUse: 20, energyCost: 30 })
      })
    ]);

    const comparison = fixture.debugElement.query(By.directive(MeterFiscalYearComparisonChartStubComponent))
      .componentInstance as MeterFiscalYearComparisonChartStubComponent;
    expect(comparison.monthlyRows).toHaveLength(1);
    expect(comparison.utilityMetric?.id).toBe('energyConsumption');
    expect(comparison.costMetric?.id).toBe('energyCost');
  });

  it('keeps the fiscal-year comparison but omits its cost panel when lifetime cost is zero', () => {
    const fixture = setup({
      selectedMeter: meter({ guid: 'meter-a', meterReadingDataApplication: 'fullMonth' }),
      calendarizedMeters: [
        calendarizedMeter([
          monthlyData({ energyConsumption: 10, energyUse: 20, energyCost: 0 }),
          monthlyData({ monthNumValue: 1, energyConsumption: 12, energyUse: 24, energyCost: 0 })
        ])
      ]
    });

    fixture.detectChanges();

    const comparison = fixture.debugElement.query(By.directive(MeterFiscalYearComparisonChartStubComponent))
      .componentInstance as MeterFiscalYearComparisonChartStubComponent;
    expect(comparison.utilityMetric?.id).toBe('energyConsumption');
    expect(comparison.costMetric).toBeUndefined();
  });

  it('passes the facility fiscal-year month order to the comparison chart', () => {
    const fixture = setup({
      selectedFacility: facility({
        guid: 'facility-a',
        energyUnit: 'MMBtu',
        fiscalYear: 'nonCalendarYear',
        fiscalYearMonth: 6
      }),
      calendarizedMeters: [calendarizedMeter([monthlyData()])]
    });

    fixture.detectChanges();

    const comparison = fixture.debugElement.query(By.directive(MeterFiscalYearComparisonChartStubComponent))
      .componentInstance as MeterFiscalYearComparisonChartStubComponent;
    expect(comparison.fiscalYearStartMonth).toBe(6);
    expect(comparison.usesFiscalYearLabels).toBe(true);
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

@Component({
  selector: 'app-meter-fiscal-year-comparison-chart',
  template: '',
  standalone: true
})
class MeterFiscalYearComparisonChartStubComponent {
  @Input() monthlyRows: readonly MonthlyData[] = [];
  @Input() utilityMetric?: MeterResultsChartMetric;
  @Input() costMetric?: MeterResultsChartMetric;
  @Input() fiscalYearStartMonth = 0;
  @Input() usesFiscalYearLabels = false;
}

function setup(options: {
  selectedMeter?: ReturnType<typeof meter>;
  selectedFacility?: ReturnType<typeof facility>;
  calendarizedMeters?: readonly CalanderizedMeter[];
  calendarizationState?: 'idle' | 'loading' | 'ready' | 'error';
} = {}): ComponentFixture<MeterWorkbenchMonthlyChartComponent> {
  const selectedMeter = options.selectedMeter ?? meter({
    guid: 'meter-a',
    name: 'Electric Main',
    meterReadingDataApplication: 'backward'
  });

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchMonthlyChartComponent],
    imports: [CommonModule, IconComponent, MeterResultsChartStubComponent, MeterFiscalYearComparisonChartStubComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal(account({ displayEmissions: true })),
          facility: signal(options.selectedFacility ?? facility({ guid: 'facility-a', energyUnit: 'MMBtu' })),
          selectedMeter: signal(selectedMeter),
          calendarizedMeters: signal(options.calendarizedMeters ?? []),
          calendarizationState: signal(options.calendarizationState ?? 'ready')
        }
      },
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

  return TestBed.createComponent(MeterWorkbenchMonthlyChartComponent);
}

function calendarizedMeter(monthlyRows: MonthlyData[]): CalanderizedMeter {
  return {
    meter: meter({ guid: 'meter-a', meterReadingDataApplication: 'fullMonth' }),
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
