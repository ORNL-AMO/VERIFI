import { TestBed } from '@angular/core/testing';
import { PredictorReadingEditorComponent } from './predictor-reading-editor.component';

describe('PredictorReadingEditorComponent', () => {
  it('preserves local values and refreshes validation when unrelated readings change', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const form = component.form!;
    form.patchValue({ amount: 18, notes: 'Local notes' });
    fixture.componentRef.setInput('existingReadings', [reading(), reading({ guid: 'another', month: 2 })]);
    fixture.detectChanges();
    expect(component.form).toBe(form);
    expect(form.getRawValue()).toEqual({ month: '2026-01', amount: 18, notes: 'Local notes' });
    expect(component.hasUnsavedChanges()).toBe(true);
    form.controls.month.setValue('2026-02');
    expect(form.controls.month.hasError('duplicateMonth')).toBe(true);
  });

  it('hydrates pristine authoritative changes and merges non-overlapping edits silently', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const changes = vi.fn(); component.form!.valueChanges.subscribe(changes);
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 15 })]); fixture.detectChanges();
    expect(component.form!.controls.amount.value).toBe(15);
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(changes).not.toHaveBeenCalled();
    component.form!.controls.notes.setValue('Local note');
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 20 })]); fixture.detectChanges();
    expect(component.form!.getRawValue()).toEqual({ month: '2026-01', amount: 20, notes: 'Local note' });
    expect(component.conflicts()).toEqual([]);
  });

  it('requires a conflict choice before saving overlapping changes', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.form!.controls.amount.setValue(18);
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 20 })]); fixture.detectChanges();
    expect(component.conflicts().map(conflict => conflict.id)).toEqual(['amount']);
    component.save(false);
    expect(saved).not.toHaveBeenCalled();
    component.resolveConflicts({ amount: 'local' });
    component.save(false);
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ reading: expect.objectContaining({ amount: 18 }) }));
  });

  it('advances nonconflicting fields across repeated publications while an amount conflict remains', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.form!.controls.amount.setValue(18);
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 20, notes: 'Saved first note' })]);
    fixture.detectChanges();
    expect(component.conflicts().map(conflict => conflict.id)).toEqual(['amount']);
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 20, notes: 'Saved second note' })]);
    fixture.detectChanges();
    expect(component.form!.getRawValue()).toEqual({ month: '2026-01', amount: 18, notes: 'Saved second note' });
    expect(component.conflicts().map(conflict => conflict.id)).toEqual(['amount']);
    component.form!.controls.amount.setValue(21);
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 22, notes: 'Saved third note' })]);
    fixture.detectChanges();
    expect(component.form!.controls.notes.value).toBe('Saved third note');
    expect(component.conflicts().map(conflict => conflict.id)).toEqual(['amount']);
    component.resolveConflicts({ amount: 'local' });
    fixture.componentRef.setInput('existingReadings', [reading({ amount: 22, notes: 'Saved fourth note' })]);
    fixture.detectChanges();
    expect(component.conflicts()).toEqual([]);
    component.save(false);
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ reading: expect.objectContaining({
      amount: 21, notes: 'Saved fourth note'
    }) }));
  });

  it('retains a draft and blocks saving when its saved reading disappears', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const saved = vi.fn(); component.saved.subscribe(saved);
    component.form!.controls.amount.setValue(18);
    fixture.componentRef.setInput('existingReadings', []); fixture.detectChanges();
    expect(component.form!.controls.amount.value).toBe(18);
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(component.unavailable()).toBe(true);
    component.save(false);
    expect(saved).not.toHaveBeenCalled();
  });

  it('does not emit edits while permissions or saving availability change', () => {
    const fixture = setup(); const component = fixture.componentInstance;
    const changes = vi.fn(); component.form!.valueChanges.subscribe(changes);
    fixture.componentRef.setInput('canEdit', false); fixture.detectChanges();
    expect(component.form!.disabled).toBe(true);
    fixture.componentRef.setInput('canEdit', true); fixture.detectChanges();
    expect(component.form!.enabled).toBe(true);
    expect(changes).not.toHaveBeenCalled();
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('saves with Ctrl or Cmd+S when the standard form is valid', () => {
    const fixture = setup();
    const saved = vi.fn(), preventDefault = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.form!.controls.amount.setValue(18);
    fixture.componentInstance.handleKeyboardSave({ key: 's', ctrlKey: true, metaKey: false, preventDefault } as unknown as KeyboardEvent);
    expect(preventDefault).toHaveBeenCalled();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ addAnother: false,
      reading: expect.objectContaining({ amount: 18, predictorId: 'predictor-a' }) }));
  });

  it('resets only when the reading identity changes', () => {
    const fixture = setup(); const component = fixture.componentInstance;
    component.form!.controls.notes.setValue('Local');
    fixture.componentRef.setInput('reading', reading({ guid: 'reading-b', month: 2 }));
    fixture.componentRef.setInput('existingReadings', [reading({ guid: 'reading-b', month: 2 })]);
    fixture.detectChanges();
    expect(component.form!.getRawValue()).toEqual({ month: '2026-02', amount: 12, notes: '' });
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('protects unload only while the reactive draft is dirty or saving and removes protection after cleanup', () => {
    const fixture = setup(); const component = fixture.componentInstance;
    const unload = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
    TestBed.tick(); expect(unload()).toBe(false);
    component.form!.controls.notes.setValue('Local note', { emitEvent: false });
    component.form!.markAsDirty();
    expect(component.dirty()).toBe(true);
    TestBed.tick(); expect(unload()).toBe(true);
    component.form!.controls.notes.setValue('');
    expect(component.dirty()).toBe(false);
    TestBed.tick(); expect(unload()).toBe(false);
    fixture.componentRef.setInput('saving', true); fixture.detectChanges(); TestBed.tick();
    expect(component.blocked()).toBe(true); expect(unload()).toBe(true);
    fixture.componentRef.setInput('saving', false); fixture.detectChanges(); TestBed.tick();
    expect(unload()).toBe(false);
    fixture.destroy(); TestBed.tick(); expect(unload()).toBe(false);
  });
});

function setup() {
  const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingEditorComponent] })
    .createComponent(PredictorReadingEditorComponent);
  fixture.componentRef.setInput('predictor', {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', canBeNegative: false, unit: 'tons'
  });
  fixture.componentRef.setInput('reading', reading());
  fixture.componentRef.setInput('mode', 'edit');
  fixture.componentRef.setInput('existingReadings', [reading()]);
  fixture.detectChanges();
  return fixture;
}

function reading(overrides: Record<string, unknown> = {}) {
  return { id: 1, guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    year: 2026, month: 1, amount: 12, notes: '', ...overrides };
}
