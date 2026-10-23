import { TestBed } from '@angular/core/testing';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { buildAccountAnalysisCards } from '../account-analysis.models';
import { AccountAnalysisDetailsSlideoutComponent } from './account-analysis-details-slideout.component';

describe('account analysis details slideout', () => {
  it('shares dashboard details while exposing an optional, disableable footer action for selection', () => {
    const snapshot = accountReportSnapshot();
    const card = buildAccountAnalysisCards({ account: snapshot.account, analyses: snapshot.accountAnalyses, facilities: snapshot.facilities,
      facilityAnalyses: snapshot.facilityAnalyses, reports: snapshot.accountReports, statusItems: [], statusState: 'ready' })[0];
    TestBed.configureTestingModule({ imports: [AccountAnalysisDetailsSlideoutComponent] });
    const fixture = TestBed.createComponent(AccountAnalysisDetailsSlideoutComponent);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('outcomeDisplay', analysisOutcomeDisplay({ state: 'loading', message: 'Calculating…' }, card.category));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Facility selections');
    expect(root.textContent).toContain('Energy analysis');
    expect(root.querySelector('footer')).toBeNull();
    fixture.componentRef.setInput('actionLabel', 'Select for report');
    fixture.componentRef.setInput('actionDisabled', true); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('footer button')?.disabled).toBe(true);
    fixture.componentRef.setInput('actionDisabled', false); fixture.detectChanges();
    let selected = false;
    fixture.componentInstance.actionSelected.subscribe(() => selected = true);
    root.querySelector<HTMLButtonElement>('footer button')!.click();
    expect(selected).toBe(true);
  });
});
