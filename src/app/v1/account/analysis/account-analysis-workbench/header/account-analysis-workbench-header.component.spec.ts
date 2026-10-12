import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisWorkbenchHeaderComponent } from './account-analysis-workbench-header.component';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';

describe('AccountAnalysisWorkbenchHeaderComponent', () => {
  it('renders selected analysis identity, setup facts, status, and the shared facts toggle', () => {
    const expanded = signal(true);
    const analysis = {
      guid: 'analysis-a', name: 'Portfolio Energy', analysisCategory: 'energy', baselineYear: 2020,
      energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal'
    };
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchHeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AccountAnalysisWorkbenchContext,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            analysis: signal(analysis), analyses: signal([analysis]),
            status: { state: signal('ready') }, hasBlockingErrors: signal(false), findings: signal([]),
            isActiveForReporting: signal(true), includedCount: signal(2), skippedCount: signal(1),
            selections: signal([{}, {}, {}]), linkedReports: signal([{ guid: 'report-a' }])
          }
        },
        {
          provide: AccountAnalysisWorkbenchNavigationService,
          useValue: { currentStageFindings: signal([]) }
        },
        {
          provide: AccountAnalysisAutosaveService,
          useValue: {
            draft: signal(analysis), state: signal('saved'), error: signal(undefined),
            flush: vi.fn().mockResolvedValue(true), retry: vi.fn(), discard: vi.fn()
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountPortfolioRoute: () => ['/portfolio'],
            accountAnalysisRoute: () => ['/analyses'],
            accountAnalysisWorkbenchRoute: () => ['/analysis']
          }
        },
        {
          provide: WorkbenchLayoutService,
          useValue: {
            factsExpanded: expanded.asReadonly(),
            toggleFacts: () => expanded.update(value => !value)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchHeaderComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Portfolio Energy');
    expect(text).toContain('Active for reporting');
    expect(text).toContain('2020');
    expect(text).toContain('2 included · 1 skipped · 3 total');
    expect(text).toContain('Saved report');

    (fixture.nativeElement.querySelector('[aria-controls="v1-account-analysis-workbench-facts"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#v1-account-analysis-workbench-facts').hidden).toBe(true);
  });
});
