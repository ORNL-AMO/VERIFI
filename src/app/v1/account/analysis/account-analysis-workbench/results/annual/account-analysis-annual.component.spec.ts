import { TestBed } from '@angular/core/testing';
import { AccountAnalysisAnnualComponent } from './account-analysis-annual.component';

describe('AccountAnalysisAnnualComponent', () => {
  it('identifies Annual results as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisAnnualComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Annual');
    expect(fixture.nativeElement.textContent).toContain('annual account table');
  });
});
