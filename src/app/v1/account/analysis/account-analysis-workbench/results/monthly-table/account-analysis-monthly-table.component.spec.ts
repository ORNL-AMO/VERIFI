import { TestBed } from '@angular/core/testing';
import { AccountAnalysisMonthlyTableComponent } from './account-analysis-monthly-table.component';

describe('AccountAnalysisMonthlyTableComponent', () => {
  it('identifies Monthly Table as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisMonthlyTableComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Monthly Table');
    expect(fixture.nativeElement.textContent).toContain('display controls');
  });
});
