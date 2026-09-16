import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { meter, reading } from '../../../facility-meters.testing';
import { BillInspectionChargeView, BillInspectionCorrelationPlot, buildBillInspectionReport } from '../meter-workbench-bill-inspection.models';
import { BillInspectionChargeSectionComponent } from './bill-inspection-charge-section.component';

describe('BillInspectionChargeSectionComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the charge title, type, total, and correlation chart children', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          totalEnergyUse: 100,
          totalCost: 120,
          charges: [{ chargeGuid: 'charge-demand', chargeAmount: 20, chargeUsage: 40 }]
        })
      ]
    );
    const fixture = setup(report.charges[0]);

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Demand');
    expect(element.textContent).toContain('Demand Charge');
    expect(element.textContent).toContain('$20');
    expect(element.querySelectorAll('app-bill-inspection-correlation-chart').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('No paired readings');
  });

  it('renders a no-paired-readings state when a charge has no plottable values', () => {
    const demandCharge = charge('charge-demand', 'Demand Charge', 'demand');
    const report = buildBillInspectionReport(
      meter({ guid: 'meter-a', charges: [demandCharge] }),
      [
        reading({
          guid: 'reading-a',
          totalEnergyUse: 100,
          totalCost: 120,
          charges: []
        })
      ]
    );
    const fixture = setup(report.charges[0]);

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No paired readings are available for this charge.');
    expect(element.querySelector('app-bill-inspection-correlation-chart')).toBeNull();
  });
});

@Component({
  selector: 'app-bill-inspection-correlation-chart',
  template: '',
  standalone: false
})
class BillInspectionCorrelationChartStubComponent {
  @Input({ required: true }) chargeView!: BillInspectionChargeView;
  @Input({ required: true }) plot!: BillInspectionCorrelationPlot;
}

function setup(chargeView: BillInspectionChargeView): ComponentFixture<BillInspectionChargeSectionComponent> {
  TestBed.configureTestingModule({
    declarations: [
      BillInspectionChargeSectionComponent,
      BillInspectionCorrelationChartStubComponent
    ],
    imports: [CommonModule, IconComponent]
  });

  const fixture = TestBed.createComponent(BillInspectionChargeSectionComponent);
  fixture.componentInstance.chargeView = chargeView;
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
