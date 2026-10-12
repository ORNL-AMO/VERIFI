import { TestBed } from '@angular/core/testing';
import { AccountAnalysisFacilityDetailsComponent } from './account-analysis-facility-details.component';

describe('AccountAnalysisFacilityDetailsComponent', () => {
  it('identifies Facility Details as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisFacilityDetailsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Facility Details');
    expect(fixture.nativeElement.textContent).toContain('Facility-level account result summaries');
  });
});
