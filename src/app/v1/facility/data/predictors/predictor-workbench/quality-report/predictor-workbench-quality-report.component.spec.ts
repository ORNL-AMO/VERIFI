import { TestBed } from '@angular/core/testing';
import { PredictorWorkbenchQualityReportComponent } from './predictor-workbench-quality-report.component';

describe('PredictorWorkbenchQualityReportComponent', () => {
  it('renders the connected quality placeholder without inactive controls', () => {
    TestBed.configureTestingModule({ imports: [PredictorWorkbenchQualityReportComponent] });
    const fixture = TestBed.createComponent(PredictorWorkbenchQualityReportComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Statistics, charts, and quality findings');
    expect(fixture.nativeElement.querySelector('button, input, select')).toBeNull();
  });
});
