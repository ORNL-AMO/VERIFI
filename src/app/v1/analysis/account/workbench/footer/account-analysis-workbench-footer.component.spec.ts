import { AnalysisUsageService } from '../../../used-by/analysis-usage.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisWorkbenchFooterComponent } from './account-analysis-workbench-footer.component';

describe('AccountAnalysisWorkbenchFooterComponent', () => {
  it('shows the blocking requirement and disables Continue', () => {
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchFooterComponent],
      providers: [{ provide: AnalysisUsageService, useValue: { canAct: signal(true), editor: signal(undefined), reportUnavailable: signal(undefined), showAccountAction: signal(true), open: vi.fn() } }, {
        provide: AccountAnalysisWorkbenchNavigationService,
        useValue: {
          activeStageId: signal('setup'), requirement: signal('Select a valid facility analysis or skip every facility before viewing Results.'),
          disabled: signal(true), backDisabled: signal(true), nextStage: signal({ id: 'results' }), back: vi.fn(), continue: vi.fn(), finish: vi.fn()
        }
      }]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchFooterComponent);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[1].disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('skip every facility');
  });

  it('delegates Back, Continue, and the Used By add action according to the current stage', () => {
    const back = vi.fn();
    const continueNavigation = vi.fn();
    const finish = vi.fn();
    const nextStage = signal<unknown>({ id: 'results' });
    const activeStageId = signal('results');
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchFooterComponent],
      providers: [{ provide: AnalysisUsageService, useValue: { canAct: signal(true), editor: signal(undefined), reportUnavailable: signal(undefined), showAccountAction: signal(true), open: vi.fn() } }, {
        provide: AccountAnalysisWorkbenchNavigationService,
        useValue: {
          activeStageId, requirement: signal(undefined), disabled: signal(false), backDisabled: signal(false), nextStage,
          back, continue: continueNavigation, finish
        }
      }]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchFooterComponent);
    fixture.detectChanges();
    let buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();
    expect(back).toHaveBeenCalledOnce();
    expect(continueNavigation).toHaveBeenCalledOnce();

    nextStage.set(undefined);
    activeStageId.set('used-by');
    fixture.detectChanges();
    buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[1].textContent).toContain('Add Report');
    buttons[1].click();
    expect(TestBed.inject(AnalysisUsageService).open).toHaveBeenCalledWith('report');
    expect(finish).not.toHaveBeenCalled();
  });
});
