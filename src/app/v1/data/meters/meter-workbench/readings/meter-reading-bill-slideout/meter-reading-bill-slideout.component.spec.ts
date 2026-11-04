import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
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

  it('keeps rendered charge labels and units with their GUID controls after a saved reorder', () => {
    const current = reading({ charges: [
      { chargeGuid: 'charge-real-demand', chargeAmount: 12, chargeUsage: 34 },
      { chargeGuid: 'charge-power-factor', chargeAmount: 56, chargeUsage: 78 }
    ] });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const component = fixture.componentInstance;
    const demandControl = component.form!.controls.chargesArray.at(0);
    demandControl.controls.chargeAmount.setValue(99);
    fixture.componentRef.setInput('existingReadings', [{ ...current, charges: [...current.charges!].reverse() }]);
    fixture.detectChanges();

    expect(component.reading).toBe(current);
    expect(component.form!.controls.chargesArray.at(1)).toBe(demandControl);
    expect(renderedCharges(fixture)).toEqual([
      { name: 'Power Factor', amount: '56', usage: undefined, unit: undefined },
      { name: 'Real Demand', amount: '99', usage: '34', unit: 'kW' }
    ]);
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.save(false);
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ reading: expect.objectContaining({ charges: [
      expect.objectContaining({ chargeGuid: 'charge-power-factor', chargeAmount: 56 }),
      expect.objectContaining({ chargeGuid: 'charge-real-demand', chargeAmount: 99 })
    ] }) }));
  });

  it('renders a saved added charge with its own label, unit, and zero values while retaining the bill draft', () => {
    const current = reading({ charges: [{ chargeGuid: 'charge-real-demand', chargeAmount: 12, chargeUsage: 34 }] });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const component = fixture.componentInstance;
    const form = component.form!;
    form.controls.totalCost.setValue(99);
    fixture.componentRef.setInput('meter', { ...component.meter, charges: [...component.meter.charges!, {
      guid: 'charge-energy', name: 'EnergyCharge', chargeType: 'consumption', displayUsageInTable: true, displayChargeInTable: true
    }] });
    fixture.componentRef.setInput('existingReadings', [{ ...current, charges: [
      { chargeGuid: 'charge-energy', chargeAmount: 0, chargeUsage: 0 }, ...current.charges!
    ] }]);
    fixture.detectChanges();

    expect(component.form).toBe(form);
    expect(form.controls.totalCost.value).toBe(99);
    expect(component.reading).toBe(current);
    expect(renderedCharges(fixture)).toEqual([
      { name: 'Energy Charge', amount: '0', usage: '0', unit: 'kWh' },
      { name: 'Real Demand', amount: '12', usage: '34', unit: 'kW' }
    ]);
    expect(component.conflicts).toEqual([]);
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

  it('retains edited usage in its original charge unit until the changed setup is explicitly reloaded', async () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const form = component.form!;
    form.controls.chargesArray.at(0).controls.chargeUsage.setValue(99);
    const saved = vi.fn(); component.saved.subscribe(saved);
    fixture.componentRef.setInput('meter', { ...component.meter, charges: component.meter.charges!.map(charge =>
      charge.guid === 'charge-real-demand' ? { ...charge, chargeType: 'consumption' } : charge) });
    fixture.detectChanges();

    expect(component.contextChanged).toBe(true);
    expect(component.form).toBe(form);
    expect(form.disabled).toBe(true);
    expect(renderedCharges(fixture)[0]).toMatchObject({ usage: '99', unit: 'kW' });
    component.save(false); expect(saved).not.toHaveBeenCalled();
    const cancelledReload = component.reloadSavedBill();
    component.resolveDiscard(false); await cancelledReload;
    expect(component.form).toBe(form);
    const confirmedReload = component.reloadSavedBill();
    component.resolveDiscard(true); await confirmedReload; fixture.detectChanges();
    expect(component.contextChanged).toBe(false);
    expect(renderedCharges(fixture)[0]).toMatchObject({ usage: '34', unit: 'kWh' });
    component.save(false); expect(saved).toHaveBeenCalledOnce();
  });

  it('accepts definition additions, renames, and reordering without blocking an edited bill', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const form = component.form!;
    form.controls.chargesArray.at(0).controls.chargeUsage.setValue(99);
    fixture.componentRef.setInput('meter', { ...component.meter, charges: [
      { guid: 'charge-new', name: 'New charge', chargeType: 'other', displayUsageInTable: false, displayChargeInTable: true },
      ...[...component.meter.charges!].reverse().map(charge => ({ ...charge, name: 'Renamed charge' }))
    ] });
    fixture.detectChanges();

    expect(component.contextChanged).toBe(false);
    expect(component.form).toBe(form);
    expect(form.enabled).toBe(true);
    expect(renderedCharges(fixture)[0]).toMatchObject({ name: 'Renamed charge', usage: '99', unit: 'kW' });
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.save(false); expect(saved).toHaveBeenCalledOnce();
  });

  it('preserves a dirty bill and refreshes duplicate-date validation when the reading list changes', () => {
    const current = reading({ guid: 'reading-a', meterId: 'meter-a' });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const form = fixture.componentInstance.form!;
    form.controls.totalCost.setValue(99);
    form.controls.readDate.setValue('2026-02-01');
    fixture.componentRef.setInput('existingReadings', [structuredClone(current), reading({ guid: 'reading-b', month: 2 })]);
    fixture.detectChanges();
    expect(fixture.componentInstance.form).toBe(form);
    expect(form.controls.totalCost.value).toBe(99);
    expect(form.controls.readDate.hasError('duplicateReadingDate')).toBe(true);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('merges saved changes into untouched bill fields and exposes conflicting edits', () => {
    const current = reading({ guid: 'reading-a', meterId: 'meter-a', totalCost: 20, totalEnergyUse: 10 });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    fixture.componentInstance.form!.controls.totalCost.setValue(99);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalEnergyUse: 15 }]); fixture.detectChanges();
    expect(fixture.componentInstance.form!.controls.totalEnergyUse.value).toBe(15);
    expect(fixture.componentInstance.form!.controls.totalCost.value).toBe(99);
    expect(fixture.componentInstance.conflicts).toEqual([]);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalEnergyUse: 15, totalCost: 30 }]); fixture.detectChanges();
    expect(fixture.componentInstance.conflicts.length).toBe(1);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalEnergyUse: 17, totalCost: 30 }]); fixture.detectChanges();
    expect(fixture.componentInstance.conflicts.length).toBe(1);
    expect(fixture.componentInstance.form!.controls.totalEnergyUse.value).toBe(17);
    const conflict = fixture.componentInstance.conflicts[0];
    fixture.componentInstance.resolveConflicts({ [conflict.id]: 'saved' });
    expect(fixture.componentInstance.form!.controls.totalCost.value).toBe(30);
    expect(fixture.componentInstance.form!.controls.totalEnergyUse.value).toBe(17);
    expect(fixture.componentInstance.conflicts).toEqual([]);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('clears a scalar conflict when the saved value returns to its original value and keeps independent saved updates', () => {
    const current = reading({ totalCost: 20, totalEnergyUse: 10 });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const component = fixture.componentInstance;
    component.form!.controls.totalCost.setValue(99);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalCost: 30, totalEnergyUse: 15 }]);
    fixture.detectChanges();
    expect(component.conflicts).toEqual([expect.objectContaining({ id: 'totalCost', localValue: 99, savedValue: 30 })]);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalCost: 20, totalEnergyUse: 17 }]);
    fixture.detectChanges();

    expect(component.conflicts).toEqual([]);
    expect(component.form!.getRawValue()).toMatchObject({ totalCost: 99, totalEnergyUse: 17 });
    expect(component.hasUnsavedChanges()).toBe(true);
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.save(false);
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({
      reading: expect.objectContaining({ totalCost: 99, totalEnergyUse: 17 }),
      baseline: expect.objectContaining({ totalCost: 20, totalEnergyUse: 17 })
    }));
  });

  it('clears a reverted saved charge conflict while advancing the baseline of independently updated charges', () => {
    const current = reading({ charges: [
      { chargeGuid: 'charge-real-demand', chargeAmount: 12, chargeUsage: 34 },
      { chargeGuid: 'charge-power-factor', chargeAmount: 56, chargeUsage: 78 }
    ] });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const component = fixture.componentInstance;
    const charges = component.form!.controls.chargesArray;
    charges.at(0).controls.chargeAmount.setValue(99);
    fixture.componentRef.setInput('existingReadings', [{ ...current, charges: [
      { ...current.charges![0], chargeAmount: 30 }, { ...current.charges![1], chargeAmount: 60 }
    ] }]);
    fixture.detectChanges();
    expect(component.conflicts).toEqual([expect.objectContaining({ id: 'charges.charge-real-demand.chargeAmount' })]);
    fixture.componentRef.setInput('existingReadings', [{ ...current, charges: [
      current.charges![0], { ...current.charges![1], chargeAmount: 65 }
    ] }]);
    fixture.detectChanges();

    expect(component.conflicts).toEqual([]);
    expect(charges.getRawValue()).toEqual([
      expect.objectContaining({ chargeGuid: 'charge-real-demand', chargeAmount: 99 }),
      expect.objectContaining({ chargeGuid: 'charge-power-factor', chargeAmount: 65 })
    ]);
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(renderedCharges(fixture).map(charge => charge.amount)).toEqual(['99', '65']);
  });

  it('updates the reviewed local value when a conflicted bill changes and clears a reversion to saved values', () => {
    const current = reading({ guid: 'reading-a', meterId: 'meter-a', totalCost: 20 });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const form = fixture.componentInstance.form!;
    const saved = vi.fn(); fixture.componentInstance.saved.subscribe(saved);
    form.controls.totalCost.setValue(99);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalCost: 30 }]); fixture.detectChanges();
    expect(fixture.componentInstance.conflicts).toEqual([expect.objectContaining({ id: 'totalCost', localValue: 99, savedValue: 30 })]);
    form.controls.totalCost.setValue(75);
    expect(fixture.componentInstance.conflicts).toEqual([expect.objectContaining({ id: 'totalCost', localValue: 75, savedValue: 30 })]);
    form.controls.totalCost.setValue(30);
    expect(fixture.componentInstance.conflicts).toEqual([]);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  it('keeps the old unit context and blocks saving a dirty bill after meter units change', () => {
    const fixture = setup();
    const saved = vi.fn(); fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.form!.controls.totalCost.setValue(99);
    fixture.componentRef.setInput('meter', meter({ energyUnit: 'GJ', startingUnit: 'GJ' })); fixture.detectChanges();
    fixture.componentInstance.save(false);
    expect(fixture.componentInstance.editorMeter.energyUnit).toBe('kWh');
    expect(fixture.componentInstance.contextChanged).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Reload saved bill');
    expect(saved).not.toHaveBeenCalled();
  });

  it('asks through the shared portal before closing edited values and blocks close during a save', async () => {
    const fixture = setup();
    const cancelled = vi.fn(); fixture.componentInstance.cancelled.subscribe(cancelled);
    const portal = TestBed.inject(ModalPortalService);
    const show = vi.spyOn(portal, 'show');
    fixture.componentInstance.form!.controls.totalCost.setValue(99);
    const cancelledClose = fixture.componentInstance.requestClose();
    expect(show).toHaveBeenCalledOnce(); expect(cancelled).not.toHaveBeenCalled();
    fixture.componentInstance.resolveDiscard(false); await cancelledClose;
    expect(cancelled).not.toHaveBeenCalled();
    const confirmedClose = fixture.componentInstance.requestClose();
    fixture.componentInstance.resolveDiscard(true); await confirmedClose; expect(cancelled).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('saving', true); fixture.detectChanges();
    await fixture.componentInstance.requestClose(); expect(cancelled).toHaveBeenCalledOnce();
  });

  it('retains a draft when its saved reading disappears and recovers if that record returns', () => {
    const current = reading({ guid: 'reading-a', meterId: 'meter-a' });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const form = fixture.componentInstance.form!;
    form.controls.totalCost.setValue(99);
    fixture.componentRef.setInput('existingReadings', []); fixture.detectChanges();
    expect(fixture.componentInstance.missingReading).toBe(true);
    expect(form.controls.totalCost.value).toBe(99);
    fixture.componentRef.setInput('existingReadings', [current]); fixture.detectChanges();
    expect(fixture.componentInstance.missingReading).toBe(false);
    expect(fixture.componentInstance.form).toBe(form);
    expect(form.controls.totalCost.value).toBe(99);
  });

  it('exposes reactive dirty and saving state through form edits, reversion, and saved hydration', () => {
    const current = reading({ guid: 'reading-a', meterId: 'meter-a', totalCost: 20 });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const component = fixture.componentInstance;
    expect(component.dirty()).toBe(false);
    component.form!.controls.totalCost.setValue(99, { emitEvent: false });
    component.form!.markAsDirty(); expect(component.dirty()).toBe(true);
    component.form!.controls.totalCost.setValue(20); expect(component.dirty()).toBe(false);
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalCost: 30 }]); fixture.detectChanges();
    expect(component.form!.controls.totalCost.value).toBe(30); expect(component.dirty()).toBe(false);
    fixture.componentRef.setInput('saving', true); fixture.detectChanges(); expect(component.blocked()).toBe(true);
    fixture.componentRef.setInput('saving', false); fixture.detectChanges(); expect(component.blocked()).toBe(false);
  });

  it('keeps the last real saved baseline and close protection when a refreshed bill disappears', async () => {
    const current = reading({ guid: 'reading-a', meterId: 'meter-a', totalCost: 20 });
    const fixture = setup({ mode: 'edit', readingValue: current, existingReadings: [current] });
    const component = fixture.componentInstance;
    const form = component.form!;
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalCost: 30 }]); fixture.detectChanges();
    form.controls.totalCost.setValue(20);
    expect(component.dirty()).toBe(true);
    fixture.componentRef.setInput('existingReadings', []); fixture.detectChanges();

    expect(component.missingReading).toBe(true);
    expect(component.form).toBe(form);
    expect(form.disabled).toBe(true);
    expect(form.controls.totalCost.value).toBe(20);
    expect(component.dirty()).toBe(true);
    const cancelled = vi.fn(); component.cancelled.subscribe(cancelled);
    const show = vi.spyOn(TestBed.inject(ModalPortalService), 'show');
    const closing = component.requestClose();
    expect(show).toHaveBeenCalledOnce();
    component.resolveDiscard(false); await closing;
    expect(cancelled).not.toHaveBeenCalled();
    fixture.componentRef.setInput('existingReadings', [{ ...current, totalCost: 30 }]); fixture.detectChanges();
    expect(component.missingReading).toBe(false);
    expect(component.conflicts).toEqual([]);
    expect(form.controls.totalCost.value).toBe(20);
    expect(component.dirty()).toBe(true);
    form.controls.totalCost.setValue(30); expect(component.dirty()).toBe(false);
  });
});

function renderedCharges(fixture: ComponentFixture<MeterReadingBillSlideoutComponent>) {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.meter-bill-form__charge')).map(row => {
    const usage = row.querySelector<HTMLInputElement>('input[formControlName="chargeUsage"]');
    return {
      name: row.querySelector('.meter-bill-form__charge-name')?.textContent?.trim(),
      amount: row.querySelector<HTMLInputElement>('input[formControlName="chargeAmount"]')?.value,
      usage: usage?.value,
      unit: usage?.parentElement?.querySelector('.input-group-text')?.textContent?.trim()
    };
  });
}

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
