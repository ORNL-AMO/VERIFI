import { TestBed } from '@angular/core/testing';
import { buildPredictorCard } from '../../../models';
import { ConfirmDeletePredictorModalComponent } from './confirm-delete-predictor-modal.component';

describe('ConfirmDeletePredictorModalComponent', () => {
  it('describes reading and analysis cleanup before confirming deletion', () => {
    TestBed.configureTestingModule({ imports: [ConfirmDeletePredictorModalComponent] });
    const fixture = TestBed.createComponent(ConfirmDeletePredictorModalComponent);
    fixture.componentRef.setInput('card', buildPredictorCard(
      { guid: 'predictor-a', name: 'Production', predictorType: 'Standard', production: true } as any,
      [{ guid: 'reading-a', predictorId: 'predictor-a', year: 2026, month: 1, amount: 4 }] as any
    ));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 reading');
    expect(fixture.nativeElement.textContent).toContain('analysis references');
  });
});
