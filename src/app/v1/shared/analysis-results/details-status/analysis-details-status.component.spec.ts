import { TestBed } from '@angular/core/testing';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { AnalysisDetailsStatusComponent } from './analysis-details-status.component';

describe('analysis details status', () => {
  it('keeps findings inside the status summary and hides stale findings while checks are pending or unavailable', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AnalysisDetailsStatusComponent] }).createComponent(AnalysisDetailsStatusComponent);
    const finding = presentFinding(makeFinding('analysis.configuration.invalid', 'error', 'configuration', {
      kind: 'facility-analysis', accountGuid: 'account-a', facilityGuid: 'facility-a', guid: 'analysis-a', name: 'Analysis'
    }));
    fixture.componentRef.setInput('status', 'error'); fixture.componentRef.setInput('findings', [finding]); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="Analysis status"]')?.textContent).toContain(finding.description);
    expect(root.textContent).toContain('Has errors'); expect(root.querySelectorAll('li')).toHaveLength(1);
    fixture.componentRef.setInput('evaluation', 'evaluating'); fixture.detectChanges();
    expect(root.textContent).toContain('Checks pending'); expect(root.querySelector('li')).toBeNull();
    fixture.componentRef.setInput('evaluation', 'error'); fixture.detectChanges();
    expect(root.textContent).toContain('Checks unavailable'); expect(root.querySelector('li')).toBeNull();
    fixture.componentRef.setInput('evaluation', 'ready'); fixture.componentRef.setInput('status', 'warning'); fixture.detectChanges();
    expect(root.textContent).toContain('Has warnings'); expect(root.querySelector('li')).not.toBeNull();
  });
});
