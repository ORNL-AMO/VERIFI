import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisWorkbenchStageNavigationComponent } from './account-analysis-workbench-stage-navigation.component';

describe('AccountAnalysisWorkbenchStageNavigationComponent', () => {
  it('renders complete, blocked, current, and contextual Results navigation', () => {
    const openResultTab = vi.fn();
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchStageNavigationComponent],
      providers: [
        provideRouter([]),
        {
          provide: AccountAnalysisWorkbenchNavigationService,
          useValue: {
            stages: signal([
              { id: 'setup', label: 'Setup', icon: 'settings', route: ['/setup'], current: false, completed: true, hasBlockingErrors: false, canOpen: true },
              { id: 'select-items', label: 'Select Facility Items', icon: 'checklist', route: ['/select'], current: false, completed: true, hasBlockingErrors: false, canOpen: true },
              { id: 'results', label: 'Results', icon: 'chartAnalysis', route: ['/results'], current: true, completed: false, hasBlockingErrors: false, canOpen: true },
              { id: 'used-by', label: 'Used By', icon: 'link', route: ['/used-by'], current: false, completed: false, hasBlockingErrors: false, canOpen: true }
            ]),
            resultTabs: signal([
              { id: 'annual', label: 'Annual', icon: 'calendar' },
              { id: 'monthly-table', label: 'Monthly Table', icon: 'table' }
            ]),
            activeResultTabId: signal('monthly-table'),
            openResultTab
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchStageNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-current="step"]')?.textContent).toContain('Results');
    expect(fixture.nativeElement.querySelectorAll('li.is-complete')).toHaveLength(2);
    const contextualTabs = fixture.nativeElement.querySelector('app-data-workbench-tabs') as HTMLElement;
    expect(contextualTabs.querySelector('[aria-current="page"]')?.textContent).toContain('Monthly Table');
    (contextualTabs.querySelector('button') as HTMLButtonElement).click();
    expect(openResultTab).toHaveBeenCalledWith('annual');
  });

  it('renders locked stages as disabled rather than links', () => {
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchStageNavigationComponent],
      providers: [
        provideRouter([]),
        {
          provide: AccountAnalysisWorkbenchNavigationService,
          useValue: {
            stages: signal([
              { id: 'setup', label: 'Setup', icon: 'settings', route: ['/setup'], current: true, completed: false, hasBlockingErrors: true, canOpen: true },
              { id: 'results', label: 'Results', icon: 'chartAnalysis', route: ['/results'], current: false, completed: false, hasBlockingErrors: false, canOpen: false }
            ]),
            resultTabs: signal([]),
            activeResultTabId: signal('annual'),
            openResultTab: vi.fn()
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchStageNavigationComponent);
    fixture.detectChanges();

    const stages = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLElement>;
    expect(stages[1].classList).toContain('is-blocked');
    expect(stages[1].querySelector('[aria-disabled="true"]')).not.toBeNull();
    expect(stages[1].querySelector('a')).toBeNull();
  });
});
