import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { account, facility, meter } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterWorkbenchMonthlyDataComponent } from './meter-workbench-monthly-data.component';

describe('MeterWorkbenchMonthlyDataComponent', () => {
  it('renders loading and calculation error states', () => {
    const loadingFixture = setup({ calendarizationState: 'loading' });
    loadingFixture.detectChanges();
    expect(loadingFixture.nativeElement.textContent).toContain('Preparing monthly data');

    TestBed.resetTestingModule();

    const errorFixture = setup({ calendarizationState: 'error' });
    errorFixture.detectChanges();
    expect(errorFixture.nativeElement.textContent).toContain('Monthly data could not be calculated');
  });

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

  it('directs do-not-calendarize meters back to readings', () => {
    const fixture = setup({
      selectedMeter: meter({ guid: 'meter-a', meterReadingDataApplication: 'fullMonth' })
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Monthly Data matches readings');

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

  it('renders v0-parity monthly columns, sorting, pagination, and copy', () => {
    vi.useFakeTimers();
    const copyTable = vi.fn();
    try {
      const fixture = setup({
        copyTable,
        calendarizedMeters: [
          calendarizedMeter([
            monthlyData({
              date: new Date(2026, 0, 1),
              monthNumValue: 0,
              energyConsumption: 10,
              energyUse: 20,
              energyCost: 30,
              totalWithMarketEmissions: 1.2,
              totalWithLocationEmissions: 2.3
            }),
            monthlyData({
              date: new Date(2026, 1, 1),
              monthNumValue: 1,
              energyConsumption: 14,
              energyUse: 25,
              energyCost: 35,
              totalWithMarketEmissions: 1.4,
              totalWithLocationEmissions: 2.5
            })
          ])
        ]
      });

      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain('Calendarize Meter Data');
      expect(element.textContent).toContain('Total Consumption');
      expect(element.textContent).toContain('Total Energy');
      expect(element.textContent).toContain('Total Market-Based Emissions');
      expect(element.textContent).toContain('Total Location-Based Emissions');
      expect(element.textContent).toContain('Total Cost');
      expect(element.textContent).toContain('February 2026');
      expect(element.textContent).toContain('$35.00');

      const costSort = Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-meter-monthly-data__sort'))
        .find(button => button.textContent?.includes('Total Cost'));
      costSort?.click();
      costSort?.click();
      fixture.detectChanges();

      expect(element.querySelector('tbody tr td')?.textContent).toContain('January 2026');

      element.querySelector<HTMLButtonElement>('.v1-meter-monthly-data__footer .v1-btn')?.click();
      vi.runOnlyPendingTimers();
      expect(copyTable).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders REC-specific emissions columns', () => {
    const fixture = setup({
      selectedMeter: meter({ guid: 'meter-a', agreementType: 4, meterReadingDataApplication: 'backward' }),
      calendarizedMeters: [
        calendarizedMeter([
          monthlyData({
            RECs: 10,
            excessRECs: 2,
            excessRECsEmissions: 1
          })
        ], { showElectricalEmissions: true })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('RECs');
    expect(text).toContain('Excess RECs');
    expect(text).toContain('Excess RECs Emissions');
    expect(text).not.toContain('Total Market-Based Emissions');
  });
});

function setup(options: {
  selectedMeter?: ReturnType<typeof meter>;
  calendarizedMeters?: readonly CalanderizedMeter[];
  calendarizationState?: 'idle' | 'loading' | 'ready' | 'error';
  copyTable?: ReturnType<typeof vi.fn>;
} = {}): ComponentFixture<MeterWorkbenchMonthlyDataComponent> {
  const selectedMeter = options.selectedMeter ?? meter({
    guid: 'meter-a',
    name: 'Electric Main',
    meterReadingDataApplication: 'backward'
  });

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchMonthlyDataComponent],
    imports: [CommonModule, IconComponent, NgbPaginationModule],
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

  return TestBed.createComponent(MeterWorkbenchMonthlyDataComponent);
}

function calendarizedMeter(
  monthlyRows: MonthlyData[],
  options: Partial<CalanderizedMeter> = {}
): CalanderizedMeter {
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
    showMobileEmissions: false,
    ...options
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
