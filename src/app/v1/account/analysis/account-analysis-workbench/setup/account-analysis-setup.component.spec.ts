import { TestBed } from '@angular/core/testing';
import { AccountAnalysisSetupComponent } from './account-analysis-setup.component';

describe('AccountAnalysisSetupComponent', () => {
  it('identifies Setup as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisSetupComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Setup');
    expect(fixture.nativeElement.textContent).toContain('baseline controls');
  });
});
