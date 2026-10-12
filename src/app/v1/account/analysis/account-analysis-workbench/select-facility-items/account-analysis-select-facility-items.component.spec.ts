import { TestBed } from '@angular/core/testing';
import { AccountAnalysisSelectFacilityItemsComponent } from './account-analysis-select-facility-items.component';

describe('AccountAnalysisSelectFacilityItemsComponent', () => {
  it('identifies facility selection as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisSelectFacilityItemsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Select Facility Items');
    expect(fixture.nativeElement.textContent).toContain('skip controls');
  });
});
