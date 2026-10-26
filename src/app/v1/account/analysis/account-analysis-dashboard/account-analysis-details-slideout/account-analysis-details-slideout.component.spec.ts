import { TestBed } from '@angular/core/testing';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { buildAccountAnalysisCards } from '../account-analysis.models';
import { AccountAnalysisDetailsSlideoutComponent } from './account-analysis-details-slideout.component';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';

describe('account analysis details slideout', () => {
  it('shows the selected analysis status, group method, complete data month and modified date, preserving skipped and missing selections', () => {
    const original = analysisReportFixture();
    const snapshot = { ...original,
      facilityAnalyses: [{ ...original.facilityAnalyses[0], modifiedDate: new Date(2025, 0, 2) }],
      facilities: [...original.facilities, { ...original.facilities[0], guid: 'skipped', name: 'Skipped plant' }, { ...original.facilities[0], guid: 'missing', name: 'Missing plant' }, { ...original.facilities[0], guid: 'unselected', name: 'Unselected plant' }],
      accountAnalyses: [{ ...original.accountAnalyses[0], facilityAnalysisItems: [...original.accountAnalyses[0].facilityAnalysisItems,
        { facilityId: 'skipped', analysisItemId: 'skip' }, { facilityId: 'missing', analysisItemId: 'removed-analysis' }] }]
    };
    const warning = presentFinding(makeFinding('analysis-group.model.invalid', 'warning', 'quality', {
      kind: 'analysis-group', accountGuid: 'account', facilityGuid: 'facility', guid: 'facility-analysis:group', name: 'Main group'
    }));
    const card = buildAccountAnalysisCards({ account: snapshot.account, analyses: snapshot.accountAnalyses, facilities: snapshot.facilities,
      facilityAnalyses: snapshot.facilityAnalyses, reports: snapshot.accountReports, statusItems: [warning], statusState: 'ready' })[0];
    const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisDetailsSlideoutComponent] }).createComponent(AccountAnalysisDetailsSlideoutComponent);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('outcomeDisplay', analysisOutcomeDisplay({ state: 'loading', message: 'Calculating…' }, card.category));
    fixture.componentRef.setInput('facilityFindings', [warning]);
    fixture.componentRef.setInput('facilityInputs', { ...snapshot, meterGroups: [{ guid: 'group', name: 'Main group' } as IdbUtilityMeterGroup] }); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const rows = [...root.querySelectorAll('tbody tr')];
    expect(root.querySelector('.selection-count')?.textContent?.trim()).toBe('2 / 4');
    expect([...root.querySelectorAll('thead th')].map(item => item.textContent)).toEqual(['Status', 'Analysis Item', 'Group Analysis', 'Data Through', 'Last Modified']);
    expect(rows[0].textContent).toContain('Warnings'); expect(rows[0].textContent).toContain('Main group: Absolute');
    expect(rows[0].querySelector('[data-label="Status"]')?.textContent?.trim()).toBe('Warnings');
    expect(rows[0].textContent).toContain('Dec 2024'); expect(rows[0].textContent).toContain('1/2/25');
    expect(rows[1].textContent).toContain('Skipped plant'); expect(rows[1].textContent).toContain('Explicitly skipped');
    expect(rows[2].textContent).toContain('Selected analysis could not be found');
    expect(rows[3].querySelector('th strong')?.textContent).toBe('No Analysis Selected');
    expect(rows[3].querySelector('.selection-detail')).toBeNull();
    const mismatched = buildAccountAnalysisCards({ account: snapshot.account, analyses: snapshot.accountAnalyses, facilities: snapshot.facilities,
      facilityAnalyses: snapshot.facilityAnalyses.map(analysis => ({ ...analysis, baselineYear: analysis.baselineYear + 1 })),
      reports: snapshot.accountReports, statusItems: [warning], statusState: 'ready' })[0];
    fixture.componentRef.setInput('card', mismatched); fixture.detectChanges();
    expect(root.querySelector('tbody tr [data-label="Status"]')?.textContent?.trim()).toBe('Errors');
    expect(root.querySelector('tbody tr .selection-detail')?.textContent).toBe('Selection no longer matches this account analysis');
    expect(root.querySelector('.selection-count')?.textContent?.trim()).toBe('1 / 4');
    fixture.componentRef.setInput('card', card); fixture.componentRef.setInput('evaluation', 'error'); fixture.detectChanges();
    expect(root.querySelector('tbody tr')?.textContent).toContain('Checks unavailable');
    expect(root.querySelector('[aria-label="Analysis status"]')?.textContent).toContain('Checks unavailable');
  });
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
    fixture.componentRef.setInput('secondaryActionLabel', 'Go To Analysis');
    fixture.componentRef.setInput('secondaryActionDisabled', true); fixture.detectChanges();
    const go = root.querySelector<HTMLButtonElement>('footer .v1-btn--secondary')!;
    expect(go.disabled).toBe(true);
    let navigated = false;
    fixture.componentInstance.secondaryActionSelected.subscribe(() => navigated = true);
    selected = false;
    fixture.componentRef.setInput('secondaryActionDisabled', false); fixture.detectChanges(); go.click();
    expect(navigated).toBe(true); expect(selected).toBe(false);
  });
});
