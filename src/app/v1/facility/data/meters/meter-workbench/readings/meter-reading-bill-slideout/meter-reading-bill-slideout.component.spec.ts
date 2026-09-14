import { ComponentFixture, TestBed } from '@angular/core/testing';
import { meter, reading } from '../../../facility-meters.testing';
import { MeterReadingBillSlideoutComponent } from './meter-reading-bill-slideout.component';

describe('MeterReadingBillSlideoutComponent', () => {
  it('renders bill units as input-group addons and charge names as readable labels', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;

    const addons = Array.from(root.querySelectorAll('.meter-bill-form__input-group .input-group-text'))
      .map(addon => addon.textContent?.trim());
    const chargeNames = Array.from(root.querySelectorAll('.meter-bill-form__charge-name'))
      .map(name => name.textContent?.trim());

    expect(root.textContent).toContain('Energy Use');
    expect(root.textContent).not.toContain('Energy Use (kWh)');
    expect(root.textContent).not.toContain('Real Demand (kW)');
    expect(addons).toEqual(expect.arrayContaining(['kWh', 'kW', '$']));
    expect(chargeNames).toEqual(['Real Demand', 'Power Factor']);
    expect(root.querySelector('.meter-bill-form__charge h4')).toBeNull();
  });
});

function setup(): ComponentFixture<MeterReadingBillSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MeterReadingBillSlideoutComponent]
  }).createComponent(MeterReadingBillSlideoutComponent);

  fixture.componentRef.setInput('mode', 'add');
  fixture.componentRef.setInput('meter', meter({
    guid: 'meter-a',
    source: 'Electricity',
    energyUnit: 'kWh',
    demandUnit: 'kW',
    charges: [
      {
        guid: 'charge-real-demand',
        name: 'RealDemand',
        chargeType: 'demand',
        displayUsageInTable: true,
        displayChargeInTable: true
      },
      {
        guid: 'charge-power-factor',
        name: 'PowerFactor',
        chargeType: 'other',
        displayUsageInTable: true,
        displayChargeInTable: true
      }
    ]
  }));
  fixture.componentRef.setInput('reading', reading({
    guid: 'reading-a',
    meterId: 'meter-a',
    charges: [
      { chargeGuid: 'charge-real-demand', chargeAmount: 12, chargeUsage: 34 },
      { chargeGuid: 'charge-power-factor', chargeAmount: 56, chargeUsage: 78 }
    ]
  }));

  fixture.detectChanges();
  return fixture;
}
