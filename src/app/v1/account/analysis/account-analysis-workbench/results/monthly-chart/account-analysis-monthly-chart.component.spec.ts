import { TestBed } from '@angular/core/testing';
import { AccountAnalysisMonthlyChartComponent } from './account-analysis-monthly-chart.component';

describe('AccountAnalysisMonthlyChartComponent', () => {
  it('identifies Monthly Chart as a deferred parity boundary', () => {
    const fixture = TestBed.createComponent(AccountAnalysisMonthlyChartComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Monthly Chart');
    expect(fixture.nativeElement.textContent).toContain('accessible summaries');
  });
});
