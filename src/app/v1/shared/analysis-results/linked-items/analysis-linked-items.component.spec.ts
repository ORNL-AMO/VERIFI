import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { reportFixture } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { analysisLinkedReport } from './analysis-linked-items.models';
import { AnalysisLinkedItemsComponent } from './analysis-linked-items.component';

describe('analysis linked items', () => {
  it('identifies linked reports by their type and owner, with custom icons, page fallback and a useful empty state', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AnalysisLinkedItemsComponent] }).createComponent(AnalysisLinkedItemsComponent);
    const plants = { ...accountReportSnapshot().accountReports[0], reportType: 'betterPlants' as const, name: 'Annual plant report' };
    const savings = reportFixture({ facilityReportType: 'costSavings', name: 'Cost savings report' });
    fixture.componentRef.setInput('items', [analysisLinkedReport(plants), analysisLinkedReport(savings)]); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = [...root.querySelectorAll('li')];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Annual plant report'); expect(rows[0].textContent).toContain('Better Plants · Account report');
    expect(rows[1].textContent).toContain('Cost Savings · Facility report');
    expect(fixture.debugElement.queryAll(By.css('li app-ui-icon')).map(item => item.componentInstance.name)).toEqual(['betterPlantsReport', 'report']);
    fixture.componentRef.setInput('items', []); fixture.componentRef.setInput('emptyMessage', 'No linked account reports.'); fixture.detectChanges();
    expect(root.querySelector('li')).toBeNull(); expect(root.textContent).toContain('No linked account reports.');
  });
});
