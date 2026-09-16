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
