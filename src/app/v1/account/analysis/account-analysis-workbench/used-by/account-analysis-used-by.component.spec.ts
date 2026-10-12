import { TestBed } from '@angular/core/testing';
import { AccountAnalysisUsedByComponent } from './account-analysis-used-by.component';

describe('AccountAnalysisUsedByComponent', () => {
  it('identifies Used By as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisUsedByComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Used By');
    expect(fixture.nativeElement.textContent).toContain('Reports and other saved workflows');
  });
});
