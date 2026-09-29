import { TestBed } from '@angular/core/testing';
import { PredictorReadingEditorComponent } from './predictor-reading-editor.component';

describe('PredictorReadingEditorComponent', () => {
  it('requires explicit manual mode before editing a calculated Weather value', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component.form?.controls.amount.disabled).toBe(true);
    component.setManually();

    expect(component.form?.controls.amount.enabled).toBe(true);
    expect(component.form?.controls.manualOverride.value).toBe(true);
    expect(component.form?.dirty).toBe(true);
  });

  it('emits a cleaned manual override on save', () => {
    const fixture = setup();
    const saved: any[] = [];
    fixture.componentInstance.saved.subscribe(value => saved.push(value));
    fixture.componentInstance.setManually();
    fixture.componentInstance.form?.controls.amount.setValue(18);
    fixture.componentInstance.save(false);

    expect(saved[0]).toEqual(expect.objectContaining({
      addAnother: false,
      reading: expect.objectContaining({ amount: 18, weatherOverride: true, weatherDataWarning: false })
    }));
  });

  it('saves with Ctrl or Cmd+S when the form is valid', () => {
    const fixture = setup();
    const saved: any[] = [];
    const preventDefault = vi.fn();
    fixture.componentInstance.saved.subscribe(value => saved.push(value));
    fixture.componentInstance.setManually();
    fixture.componentInstance.form?.controls.amount.setValue(18);

    fixture.componentInstance.handleKeyboardSave({
      key: 's',
      ctrlKey: true,
      metaKey: false,
      preventDefault
    } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(saved).toHaveLength(1);
    expect(saved[0].addAnother).toBe(false);
  });
});

function setup() {
  const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingEditorComponent] })
    .createComponent(PredictorReadingEditorComponent);
  fixture.componentRef.setInput('predictor', {
    guid: 'predictor-a', name: 'CDD', predictorType: 'Weather', canBeNegative: false, unit: 'CDD'
  });
  fixture.componentRef.setInput('reading', {
    id: 1, guid: 'reading-a', predictorId: 'predictor-a', year: 2026, month: 1, amount: 12,
    notes: '', weatherOverride: false, weatherDataWarning: true
  });
  fixture.componentRef.setInput('mode', 'edit');
  fixture.componentRef.setInput('existingReadings', []);
  fixture.detectChanges();
  return fixture;
}
