import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisUsedByComponent } from './account-analysis-used-by.component';

function report(guid: string, reportType: IdbAccountReport['reportType'], analysisGuid = 'analysis-a'): IdbAccountReport {
  return {
    guid, reportType, name: guid, accountId: 'account-a',
    betterPlantsReportSetup: { analysisItemId: analysisGuid },
    performanceReportSetup: { analysisItemId: analysisGuid },
    analysisReportSetup: { analysisItemId: analysisGuid },
    accountSavingsReportSetup: { analysisItemId: analysisGuid }
  } as IdbAccountReport;
}

function configure(reports: IdbAccountReport[]) {
  const accountReports = signal(reports);
  const paramMap = new BehaviorSubject(convertToParamMap({ analysisGuid: 'analysis-a' }));
  TestBed.configureTestingModule({
    imports: [AccountAnalysisUsedByComponent],
    providers: [
      AccountAnalysisWorkbenchContext,
      { provide: ActivatedRoute, useValue: { paramMap, snapshot: { paramMap: paramMap.value } } },
      { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } },
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), accountAnalyses: signal([]), facilities: signal([]),
        facilityAnalyses: signal([]), accountReports
      } }
    ]
  });
  const fixture = TestBed.createComponent(AccountAnalysisUsedByComponent);
  fixture.detectChanges();
  return { fixture, accountReports, paramMap };
}

describe('AccountAnalysisUsedByComponent', () => {
  it('lists every supported reference type and excludes other analyses and non-reference report types', () => {
    const { fixture } = configure([
      report('Plants report', 'betterPlants'), report('Performance report', 'performance'),
      report('Analysis report', 'analysis'), report('Savings report', 'accountSavings'),
      report('Unrelated', 'analysis', 'analysis-b'), report('Overview', 'dataOverview'),
      report('Climate', 'betterClimate'), report('Emission factors', 'accountEmissionFactors')
    ]);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('li')).toHaveLength(4);
    expect(Array.from(host.querySelectorAll('li small')).map(item => item.textContent)).toEqual([
      'Better Plants', 'Performance', 'Analysis', 'Account Savings'
    ]);
    expect(host.textContent).toContain('4 reports');
    expect(host.textContent).not.toContain('Unrelated');
    expect(host.textContent).not.toContain('Overview');
    expect(host.textContent).not.toContain('Climate');
    expect(host.querySelectorAll('a, button')).toHaveLength(0);
    expect(host.textContent).toContain('Opening reports is not yet available in v1');
  });

  it('updates counts and the empty state after report or selected-analysis changes', async () => {
    const { fixture, accountReports, paramMap } = configure([report('Linked', 'analysis')]);
    expect(fixture.nativeElement.textContent).toContain('1 report');
    accountReports.set([report('Linked', 'analysis'), report('Second', 'performance')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 reports');
    paramMap.next(convertToParamMap({ analysisGuid: 'analysis-b' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('No dependencies');
    expect(fixture.nativeElement.querySelector('li')).toBeNull();
    accountReports.set([report('', 'accountSavings', 'analysis-b')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Untitled account report');
    expect(fixture.nativeElement.textContent).toContain('1 report');
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });
});
