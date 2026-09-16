import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { vi } from 'vitest';
import { facility, meter, reading } from '../../facility-meters.testing';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterWorkbenchBillInspectionComponent } from './meter-workbench-bill-inspection.component';
import { BillInspectionChargeView, BillInspectionReport } from './meter-workbench-bill-inspection.models';

describe('MeterWorkbenchBillInspectionComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders empty states for missing readings and missing charge amounts', () => {
    const noReadingsFixture = setup({ meterData: [] });
    noReadingsFixture.detectChanges();

    expect((noReadingsFixture.nativeElement as HTMLElement).textContent).toContain('No readings found');

    TestBed.resetTestingModule();

    const noChargeAmountsFixture = setup({
      meterData: [
        reading({ guid: 'reading-a', totalEnergyUse: 100, totalCost: 120, charges: [] })
      ]
    });
    noChargeAmountsFixture.detectChanges();

    expect((noChargeAmountsFixture.nativeElement as HTMLElement).textContent).toContain('No charge amounts found');
  });

  it('renders the eligible report path with overview and charge section children', () => {
    const fixture = setup();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const overview = element.querySelector('app-bill-inspection-overview-chart') as HTMLElement;
    const chargeSections = element.querySelectorAll('app-bill-inspection-charge-section');

    expect(overview).not.toBeNull();
    expect(overview.getAttribute('aria-labelledby')).toBe('bill-inspection-overview-heading');
    expect(chargeSections).toHaveLength(1);
    expect(chargeSections[0].getAttribute('aria-labelledby')).toBe('bill-inspection-charge-charge-demand');
  });

  it('routes empty-state actions to readings and charge settings', () => {
    const noReadingsFixture = setup({ meterData: [] });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    noReadingsFixture.detectChanges();

    (noReadingsFixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.v1-btn')?.click();

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

    TestBed.resetTestingModule();

    const ineligibleFixture = setup({
      selectedMeter: meter({
        guid: 'meter-b',
        source: 'Electricity',
        charges: []
      }),
      meterData: []
    });
    const ineligibleRouter = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    ineligibleFixture.detectChanges();

    (ineligibleFixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.v1-btn')?.click();

    expect(ineligibleRouter.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-b',
      'settings'
    ], { fragment: 'meter-charges' });
  });

});

@Component({
  selector: 'app-bill-inspection-overview-chart',
  template: '',
  standalone: false
})
class BillInspectionOverviewChartStubComponent {
  @Input({ required: true }) report!: BillInspectionReport;
  @Input() meterName = '';
}

@Component({
  selector: 'app-bill-inspection-charge-section',
  template: '',
  standalone: false
})
class BillInspectionChargeSectionStubComponent {
  @Input({ required: true }) chargeView!: BillInspectionChargeView;
}

function setup(options: {
  selectedMeter?: ReturnType<typeof meter>;
  meterData?: ReturnType<typeof reading>[];
} = {}): ComponentFixture<MeterWorkbenchBillInspectionComponent> {
  const selectedMeter = options.selectedMeter ?? meter({
    guid: 'meter-a',
    name: 'Electric Main',
    source: 'Electricity',
    charges: [charge('charge-demand', 'Demand Charge', 'demand')]
  });

  TestBed.configureTestingModule({
    declarations: [
      MeterWorkbenchBillInspectionComponent,
      BillInspectionOverviewChartStubComponent,
      BillInspectionChargeSectionStubComponent
    ],
    imports: [CommonModule, IconComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal(facility({ guid: 'facility-a', energyUnit: 'MMBtu' })),
          selectedMeter: signal(selectedMeter),
          selectedMeterData: signal(options.meterData ?? [
            reading({
              guid: 'reading-a',
              meterId: selectedMeter.guid,
              totalEnergyUse: 100,
              totalCost: 120,
              charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 40 }]
            })
          ])
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

  return TestBed.createComponent(MeterWorkbenchBillInspectionComponent);
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
