import { TestBed } from '@angular/core/testing';
import { PredictorReadingsConfirmationModalComponent } from './predictor-readings-confirmation-modal.component';

describe('PredictorReadingsConfirmationModalComponent', () => {
  it('previews every missing month before filling', () => {
    const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingsConfirmationModalComponent] })
      .createComponent(PredictorReadingsConfirmationModalComponent);
    fixture.componentRef.setInput('confirmation', {
      kind: 'fill-missing',
      months: [
        { year: 2026, month: 1, key: '2026-01', label: 'Jan 2026' },
        { year: 2026, month: 2, key: '2026-02', label: 'Feb 2026' }
      ]
    });
    fixture.componentRef.setInput('isWeather', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jan 2026');
    expect(fixture.nativeElement.textContent).toContain('Feb 2026');
    expect(fixture.nativeElement.textContent).toContain('manual overrides');
  });
});
