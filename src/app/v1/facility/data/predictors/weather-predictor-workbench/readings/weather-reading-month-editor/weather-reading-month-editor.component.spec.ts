import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor.component';

describe('WeatherReadingMonthEditorComponent', () => {
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
      year: 2026, month: 3, cells: [{ reading: { amount: 12 } }]
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
});

function column(guid: string, name: string) {
  return { predictor: { guid, name }, typeLabel: name, unit: 'days' };
}
