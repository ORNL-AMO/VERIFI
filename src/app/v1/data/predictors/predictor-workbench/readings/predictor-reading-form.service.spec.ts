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

  it('refreshes duplicate and negative validation without changing draft values or emitting edits', () => {
    const service = TestBed.inject(PredictorReadingFormService);
    const form = service.build(standard, reading('new', 2026, 2, 12), [], 'add');
    form.patchValue({ notes: 'local', amount: -2 });
    const changes = vi.fn(); form.valueChanges.subscribe(changes);
    service.refreshValidation(form, { ...standard, canBeNegative: true }, 'new', [reading('other', 2026, 2, 1)]);
    expect(form.getRawValue()).toEqual({ month: '2026-02', amount: -2, notes: 'local' });
    expect(form.controls.month.hasError('duplicateMonth')).toBe(true);
    expect(form.controls.amount.hasError('negativeNotAllowed')).toBe(false);
    expect(changes).not.toHaveBeenCalled();
  });
});

function reading(guid: string, year: number, month: number, amount: number): any {
  return { guid, predictorId: 'predictor-a', year, month, amount, notes: '', weatherOverride: false, weatherDataWarning: false };
}
