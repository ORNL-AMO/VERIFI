import { TestBed } from '@angular/core/testing';
import { PredictorReadingsConfirmationModalComponent } from './predictor-readings-confirmation-modal.component';

describe('PredictorReadingsConfirmationModalComponent', () => {
  it('previews every missing month before filling', () => {
    const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingsConfirmationModalComponent] })
      .createComponent(PredictorReadingsConfirmationModalComponent);
    fixture.componentRef.setInput('confirmation', {
      kind: 'fill-missing',
      months: [
        { year: 2025, month: 12, key: '2025-12', label: 'Dec 2025' },
        { year: 2026, month: 1, key: '2026-01', label: 'Jan 2026' }
      ]
    });
    fixture.componentRef.setInput('isWeather', true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const chips = root.querySelectorAll('ul[aria-label="Missing months"] > li.v1-chip');
    expect(Array.from(chips, chip => chip.textContent?.trim())).toEqual(['Dec 2025', 'Jan 2026']);
    expect(root.querySelectorAll('.v1-chip button, .v1-chip input, .v1-chip[tabindex]')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('manual overrides');
  });
});
