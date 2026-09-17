import { ComponentFixture, TestBed } from '@angular/core/testing';
import { meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MeterReadingBillSlideoutComponent } from './meter-reading-bill-slideout.component';

describe('MeterReadingBillSlideoutComponent', () => {
  it('renders bill units as input-group addons and charge names as readable labels', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;

    const addons = Array.from(root.querySelectorAll('.meter-bill-form__input-group .input-group-text'))
      .map(addon => addon.textContent?.trim());
    const chargeNames = Array.from(root.querySelectorAll('.meter-bill-form__charge-name'))
      .map(name => name.textContent?.trim());
    const usageLabels = Array.from(root.querySelectorAll('.meter-bill-form__charge .v1-field > span'))
      .filter(label => label.textContent?.trim() === 'Usage');

    expect(root.textContent).toContain('Energy Use');
    expect(root.textContent).not.toContain('Energy Use (kWh)');
    expect(root.textContent).not.toContain('Real Demand (kW)');
    expect(addons).toEqual(expect.arrayContaining(['kWh', 'kW', '$']));
    expect(chargeNames).toEqual(['Real Demand', 'Power Factor']);
    expect(usageLabels.length).toBe(1);
    expect(root.querySelector('.meter-bill-form__charge h4')).toBeNull();
  });

  it('marks duplicate reading dates invalid while allowing the current edit date', () => {
    const fixture = setup({
      mode: 'edit',
      readingValue: reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 1 }),
      existingReadings: [
        reading({ guid: 'reading-a', meterId: 'meter-a', month: 1, day: 1 }),
        reading({ guid: 'reading-b', meterId: 'meter-a', month: 2, day: 1 })
      ]
    });

    const form = fixture.componentInstance.form;
    expect(form?.controls['readDate'].valid).toBe(true);

    form?.controls['readDate'].setValue('2026-02-01');
    form?.controls['readDate'].markAsTouched();
    fixture.detectChanges();

    expect(form?.controls['readDate'].hasError('duplicateReadingDate')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('A reading already exists for this date.');
  });
});

function setup(options: {
  readonly mode?: 'add' | 'edit';
  readonly readingValue?: ReturnType<typeof reading>;
  readonly existingReadings?: ReturnType<typeof reading>[];
} = {}): ComponentFixture<MeterReadingBillSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MeterReadingBillSlideoutComponent]
  }).createComponent(MeterReadingBillSlideoutComponent);

  fixture.componentRef.setInput('mode', options.mode ?? 'add');
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
  fixture.componentRef.setInput('reading', options.readingValue ?? reading({
    guid: 'reading-a',
    meterId: 'meter-a',
    charges: [
      { chargeGuid: 'charge-real-demand', chargeAmount: 12, chargeUsage: 34 },
      { chargeGuid: 'charge-power-factor', chargeAmount: 56, chargeUsage: 78 }
    ]
  }));
  fixture.componentRef.setInput('existingReadings', options.existingReadings ?? []);

  fixture.detectChanges();
  return fixture;
}
