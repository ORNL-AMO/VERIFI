import { TestBed } from '@angular/core/testing';
import { PredictorWorkbenchReadingsComponent } from './predictor-workbench-readings.component';

describe('PredictorWorkbenchReadingsComponent', () => {
  it('renders the connected readings placeholder without inactive controls', () => {
    TestBed.configureTestingModule({ imports: [PredictorWorkbenchReadingsComponent] });
    const fixture = TestBed.createComponent(PredictorWorkbenchReadingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Monthly reading maintenance');
    expect(fixture.nativeElement.querySelector('button, input, select')).toBeNull();
  });
});
