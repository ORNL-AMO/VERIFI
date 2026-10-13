import { TestBed } from '@angular/core/testing';
import { AnalysisResultStatusComponent } from './analysis-result-status.component';

describe('AnalysisResultStatusComponent', () => {
  it('explains account selection blockers', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisResultStatusComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisResultStatusComponent);
    fixture.componentRef.setInput('state', { state: 'waiting' });
    fixture.componentRef.setInput('blocking', true);
    fixture.componentRef.setInput('scope', 'account');
    fixture.componentRef.setInput('period', 'annual');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Account results are blocked');
    expect(fixture.nativeElement.textContent).toContain('selected facility analyses');
  });

  it('shows a returned calculation error', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisResultStatusComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisResultStatusComponent);
    fixture.componentRef.setInput('state', { state: 'error', message: 'Calculation failed.' });
    fixture.componentRef.setInput('scope', 'group');
    fixture.componentRef.setInput('period', 'annual');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Results could not be calculated');
    expect(fixture.nativeElement.textContent).toContain('Calculation failed.');
  });
});
