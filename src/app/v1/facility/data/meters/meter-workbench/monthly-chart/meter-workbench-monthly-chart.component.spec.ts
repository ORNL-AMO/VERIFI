import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
} = {}): ComponentFixture<MeterWorkbenchMonthlyChartComponent> {
  const selectedMeter = options.selectedMeter ?? meter({
    guid: 'meter-a',
    name: 'Electric Main',
    meterReadingDataApplication: 'backward'
  });

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchMonthlyChartComponent],
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
