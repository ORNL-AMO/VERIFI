import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor.component';

describe('WeatherReadingMonthEditorComponent', () => {
  it('tracks pristine events independently of value changes and calculation intents', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit'); fixture.componentRef.setInput('columns', [column('hdd', 'Heating')] as any);
    fixture.componentRef.setInput('row', monthRow({ hdd: 10 })); fixture.detectChanges();
    const component = fixture.componentInstance;
    const changed = vi.fn(), calculate = vi.fn();
    component.form.valueChanges.subscribe(changed); component.calculationRequested.subscribe(calculate);
    component.form.markAsDirty(); expect(component.dirty()).toBe(true);
    component.form.markAsPristine(); expect(component.dirty()).toBe(false);
    expect(component.values()['hdd']).toBe('10'); expect(changed).not.toHaveBeenCalled(); expect(calculate).not.toHaveBeenCalled();
  });

  it('requires a new month and saves calculated values for every output', () => {
    TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] });
    const fixture = TestBed.createComponent(WeatherReadingMonthEditorComponent);
    const component = fixture.componentInstance;
    component.columns = [column('hdd', 'HDD'), column('humidity', 'Humidity')] as any;
    component.existingMonthKeys = ['2026-01'];
    component.ngOnChanges({ columns: {} as any });
    const saved = vi.fn();
    component.saved.subscribe(saved);

    component.setMonth('2026-01');
    component.save();
    expect(component.validationError()).toContain('already exists');

    component.setMonth('2026-02');
    component.calculatedValues = [{ predictorGuid: 'hdd', amount: 10, weatherDataWarning: false }];
    component.ngOnChanges({ calculatedValues: {} as any });
    component.save();
    expect(component.validationError()).toContain('every weather predictor');

    component.calculatedValues = [
      { predictorGuid: 'hdd', amount: 10, weatherDataWarning: false },
      { predictorGuid: 'humidity', amount: 55, weatherDataWarning: true }
    ];
    component.ngOnChanges({ calculatedValues: {} as any });
    component.save();
    expect(saved).toHaveBeenCalledWith({
      year: 2026, month: 2,
      values: [
        { predictorGuid: 'hdd', amount: 10, calculated: true, weatherDataWarning: false },
        { predictorGuid: 'humidity', amount: 55, calculated: true, weatherDataWarning: true }
      ]
    });
  });

  it('locks calculated inputs, renders unit addons and gap feedback, and enables explicit overrides', () => {
    TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] });
    const fixture = TestBed.createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('columns', [column('hdd', 'HDD')] as any);
    fixture.componentRef.setInput('calculatedValues', [{
      predictorGuid: 'hdd', amount: 12.5, weatherDataWarning: true
    }]);
    fixture.detectChanges();
    fixture.componentInstance.setMonth('2026-02');
    fixture.componentRef.setInput('calculatedValues', [{
      predictorGuid: 'hdd', amount: 12.5, weatherDataWarning: true
    }]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input[type="number"]')!;
    const override = root.querySelector<HTMLButtonElement>('.weather-month-editor__override')!;
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('12.5');
    expect(root.querySelector('.input-group-text')?.textContent).toContain('days');
    expect(root.textContent).toContain('gaps or missing weather source data');

    override.click();
    fixture.detectChanges();
    expect(input.disabled).toBe(false);
    expect(override.textContent).toContain('Use calculated');

    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    input.value = '14';
    input.dispatchEvent(new Event('input'));
    fixture.componentInstance.save();
    expect(saved).toHaveBeenCalledWith({
      year: 2026,
      month: 2,
      values: [{ predictorGuid: 'hdd', amount: 14, calculated: false, weatherDataWarning: true }]
    });
  });

  it('locks the month while editing and initializes every output value', () => {
    TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] });
    const fixture = TestBed.createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('columns', [column('hdd', 'HDD')] as any);
    fixture.componentRef.setInput('row', {
      year: 2026, month: 3, cells: [{ predictorGuid: 'hdd', reading: { amount: 12 } }]
    } as any);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="month"]')?.disabled).toBe(true);
    expect(fixture.componentInstance.values()['hdd']).toBe('12');
  });

  it('warns about future months and allows manual overrides without requesting calculated data', () => {
    TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] });
    const fixture = TestBed.createComponent(WeatherReadingMonthEditorComponent);
    const component = fixture.componentInstance;
    component.columns = [column('hdd', 'HDD')] as any;
    component.ngOnChanges({ columns: {} as any });
    const requested = vi.fn();
    const saved = vi.fn();
    component.calculationRequested.subscribe(requested);
    component.saved.subscribe(saved);
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    const futureMonth = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}`;

    component.setMonth(futureMonth);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Sorry, we cannot predict the future. If you wish, you can try by using the override buttons.');
    expect(requested).toHaveBeenCalledWith(undefined);

    const override = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.weather-month-editor__override')!;
    expect(override.disabled).toBe(false);
    override.click();
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="number"]')!;
    input.value = '42';
    input.dispatchEvent(new Event('input'));
    component.save();

    expect(saved).toHaveBeenCalledWith({
      year: future.getFullYear(),
      month: future.getMonth() + 1,
      values: [{ predictorGuid: 'hdd', amount: 42, calculated: false, weatherDataWarning: false }]
    });
  });

  it('matches refreshed cells by GUID and merges independent saved amounts without replacing dirty controls', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('columns', [column('hdd', 'Heating'), column('humidity', 'Humidity')] as any);
    fixture.componentRef.setInput('row', monthRow({ hdd: 10, humidity: 50 }));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const heating = component.form.controls.values.controls['hdd'];
    component.setValue('hdd', '15');
    fixture.componentRef.setInput('columns', [column('humidity', 'Humidity renamed'), column('hdd', 'Heating')] as any);
    fixture.componentRef.setInput('row', monthRow({ humidity: 55, hdd: 10 }));
    fixture.detectChanges();
    expect(component.form.controls.values.controls['hdd']).toBe(heating);
    expect(component.values()).toEqual({ hdd: '15', humidity: '55' });
    expect(component.conflicts()).toHaveLength(0);
    expect(component.dirty()).toBe(true);
  });

  it('keeps reordered pristine inputs and independently added outputs outside local dirtiness', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('columns', [column('hdd', 'Heating'), column('humidity', 'Humidity')] as any);
    fixture.componentRef.setInput('row', monthRow({ hdd: 10, humidity: 50 })); fixture.detectChanges();
    const component = fixture.componentInstance;
    const heating = component.form.controls.values.controls['hdd'];
    fixture.componentRef.setInput('columns', [column('humidity', 'Humidity'), column('hdd', 'Heating'), column('rain', 'Rain')] as any);
    fixture.componentRef.setInput('row', monthRow({ rain: 1, humidity: 50, hdd: 10 })); fixture.detectChanges();
    expect(component.form.controls.values.controls['hdd']).toBe(heating);
    expect(component.dirty()).toBe(false);
    expect(component.values()).toEqual({ hdd: '10', humidity: '50', rain: '1' });
  });

  it('retains manual overrides through source calculations and new required outputs', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('columns', [column('hdd', 'Heating')] as any);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const calculated = vi.fn(); component.calculationRequested.subscribe(calculated);
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.setMonth('2026-02'); component.toggleOverride('hdd'); component.setValue('hdd', '42');
    fixture.componentRef.setInput('columns', [column('humidity', 'Humidity'), column('hdd', 'Heating')] as any);
    fixture.detectChanges();
    component.save();
    expect(saved).not.toHaveBeenCalled();
    expect(component.values()).toEqual({ hdd: '42', humidity: '' });
    fixture.componentRef.setInput('calculatedMonth', '2026-02');
    fixture.componentRef.setInput('calculatedValues', [
      { predictorGuid: 'hdd', amount: 12, weatherDataWarning: false },
      { predictorGuid: 'humidity', amount: 55, weatherDataWarning: false }
    ]);
    fixture.detectChanges();
    expect(component.values()).toEqual({ hdd: '42', humidity: '55' });
    expect(calculated).toHaveBeenCalledTimes(1);
    component.save();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ values: [
      expect.objectContaining({ predictorGuid: 'humidity', amount: 55, calculated: true }),
      expect.objectContaining({ predictorGuid: 'hdd', amount: 42, calculated: false })
    ] }));
  });

  it('requires explicit conflict choices and blocks removed saved targets without losing edits', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('columns', [column('hdd', 'Heating')] as any);
    fixture.componentRef.setInput('row', monthRow({ hdd: 10 })); fixture.detectChanges();
    const component = fixture.componentInstance;
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.setValue('hdd', '15');
    fixture.componentRef.setInput('row', monthRow({ hdd: 12 })); fixture.detectChanges();
    expect(component.conflicts()[0].label).toContain('Heating');
    component.save(); expect(saved).not.toHaveBeenCalled();
    component.resolveConflicts({ [component.conflicts()[0].id]: 'local' });
    expect(component.values()['hdd']).toBe('15');
    fixture.componentRef.setInput('unavailable', true);
    fixture.componentRef.setInput('row', undefined); fixture.detectChanges();
    component.save();
    expect(saved).not.toHaveBeenCalled();
    expect(component.values()['hdd']).toBe('15');
  });

  it('merges repeated saved changes to another output while the original amount conflict remains unresolved', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('columns', [column('hdd', 'Heating'), column('humidity', 'Humidity')] as any);
    fixture.componentRef.setInput('row', monthRow({ hdd: 10, humidity: 50 })); fixture.detectChanges();
    const component = fixture.componentInstance; component.setValue('hdd', '15');
    fixture.componentRef.setInput('row', monthRow({ hdd: 12, humidity: 55 })); fixture.detectChanges();
    expect(component.conflicts()).toHaveLength(1);
    fixture.componentRef.setInput('row', monthRow({ hdd: 12, humidity: 60 })); fixture.detectChanges();
    expect(component.conflicts()).toHaveLength(1);
    expect(component.values()).toEqual({ hdd: '15', humidity: '60' });
    component.resolveConflicts({ [component.conflicts()[0].id]: 'local' });
    expect(component.values()).toEqual({ hdd: '15', humidity: '60' });
  });

  it('reviews an edited output deletion by name and can accept its saved removal', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('columns', [column('hdd', 'Heating'), column('humidity', 'Humidity')] as any);
    fixture.componentRef.setInput('row', monthRow({ hdd: 10, humidity: 50 })); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.setValue('hdd', '15');
    fixture.componentRef.setInput('columns', [column('humidity', 'Humidity')] as any);
    fixture.componentRef.setInput('row', monthRow({ humidity: 50 })); fixture.detectChanges();
    expect(component.conflicts()[0].label).toContain('Heating');
    component.resolveConflicts({ [component.conflicts()[0].id]: 'local' }); fixture.detectChanges();
    expect(component.removedOutputs()).toHaveLength(1);
    component.useSavedOutputDeletions();
    expect(component.removedOutputs()).toHaveLength(0);
    expect(component.form.controls.values.controls['hdd']).toBeUndefined();
    expect(component.values()['humidity']).toBe('50');
  });
});

function column(guid: string, name: string) {
  return { predictor: { guid, name }, typeLabel: name, unit: 'days' };
}

function monthRow(amounts: Record<string, number>) {
  return { key: '2026-03', year: 2026, month: 3, cells: Object.entries(amounts)
    .map(([predictorGuid, amount]) => ({ predictorGuid, reading: { guid: `reading-${predictorGuid}`, amount } })) };
}
