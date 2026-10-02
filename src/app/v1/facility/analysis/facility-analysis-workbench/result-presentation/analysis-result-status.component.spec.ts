import { TestBed } from '@angular/core/testing';
import { FacilityAnalysisResultState } from '../facility-analysis-results.service';
import { AnalysisResultStatusComponent } from './analysis-result-status.component';

describe('analysis result status', () => {
  it('shows the blocking state before a ready result', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisResultStatusComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisResultStatusComponent);
    fixture.componentRef.setInput('state', readyState());
    fixture.componentRef.setInput('blocking', true);
    fixture.componentRef.setInput('scope', 'facility');
    fixture.componentRef.setInput('period', 'monthly');
    fixture.componentRef.setInput('rowCount', 2);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility results are blocked');
  });

  it('shows a calculation error returned by the worker boundary', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisResultStatusComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisResultStatusComponent);
    fixture.componentRef.setInput('state', {
      state: 'error', analysisGuid: 'analysis-a', fingerprint: 'input-a', message: 'Calculation failed.'
    } satisfies FacilityAnalysisResultState);
    fixture.componentRef.setInput('scope', 'group');
    fixture.componentRef.setInput('period', 'annual');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Results could not be calculated');
    expect(fixture.nativeElement.textContent).toContain('Calculation failed.');
  });
});

function readyState(): FacilityAnalysisResultState {
  return {
    state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'input-a',
    annual: [], monthly: [], groups: []
  };
}
