import { TestBed } from '@angular/core/testing';
import { PredictorReadingFormService } from './predictor-reading-form.service';

describe('PredictorReadingFormService', () => {
  const standard = { guid: 'predictor-a', predictorType: 'Standard', canBeNegative: false } as any;
  const existing = [reading('existing', 2026, 1, 5)];

  it('validates duplicate months and disallowed negative values', () => {
    const service = TestBed.inject(PredictorReadingFormService);
    const form = service.build(standard, reading('new', 2026, 2, 1), existing, 'add');

    form.controls.month.setValue('2026-01');
    form.controls.amount.setValue(-1);

    expect(form.controls.month.hasError('duplicateMonth')).toBe(true);
    expect(form.controls.amount.hasError('negativeNotAllowed')).toBe(true);
  });

  it('locks calculated Weather values until explicitly set manually', () => {
    const service = TestBed.inject(PredictorReadingFormService);
    const weather = { ...standard, predictorType: 'Weather' };
    const source = { ...reading('weather', 2026, 2, 12), weatherDataWarning: true };
    const form = service.build(weather, source, [], 'edit');

    expect(form.controls.month.disabled).toBe(true);
    expect(form.controls.amount.disabled).toBe(true);

    service.setManualOverride(form);
    const updated = service.updateReading(source, weather, form);
    expect(form.controls.month.enabled).toBe(true);
    expect(updated).toEqual(expect.objectContaining({ weatherOverride: true, weatherDataWarning: false, weatherDataChanged: false }));
  });
});

function reading(guid: string, year: number, month: number, amount: number): any {
  return { guid, predictorId: 'predictor-a', year, month, amount, notes: '', weatherOverride: false, weatherDataWarning: false };
}
