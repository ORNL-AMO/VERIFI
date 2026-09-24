import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor.component';

describe('WeatherReadingMonthEditorComponent', () => {
  it('requires a new month and one finite value for every output', () => {
    TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] });
    const fixture = TestBed.createComponent(WeatherReadingMonthEditorComponent);
    const component = fixture.componentInstance;
    component.columns = [column('hdd', 'HDD'), column('humidity', 'Humidity')] as any;
    component.existingMonthKeys = ['2026-01'];
    component.ngOnChanges({ columns: {} as any });
    const saved = vi.fn();
    component.saved.subscribe(saved);

    component.setMonth('2026-01');
    component.setValue('hdd', '10');
    component.setValue('humidity', '50');
    component.save();
    expect(component.validationError()).toContain('already exists');

    component.setMonth('2026-02');
    component.setValue('humidity', '');
    component.save();
    expect(component.validationError()).toContain('every weather predictor');

    component.setValue('humidity', '55');
    component.save();
    expect(saved).toHaveBeenCalledWith({
      year: 2026, month: 2,
      values: [{ predictorGuid: 'hdd', amount: 10 }, { predictorGuid: 'humidity', amount: 55 }]
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
});

function column(guid: string, name: string) {
  return { predictor: { guid, name }, typeLabel: name, unit: 'days' };
}
