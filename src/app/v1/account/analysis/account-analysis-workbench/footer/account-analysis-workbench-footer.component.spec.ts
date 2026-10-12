import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisWorkbenchFooterComponent } from './account-analysis-workbench-footer.component';

describe('AccountAnalysisWorkbenchFooterComponent', () => {
  it('shows the blocking requirement and disables Continue', () => {
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchFooterComponent],
      providers: [{
        provide: AccountAnalysisWorkbenchNavigationService,
        useValue: {
          requirement: signal('Select a valid facility analysis or skip every facility before viewing Results.'),
          disabled: signal(true), nextStage: signal({ id: 'results' }), back: vi.fn(), continue: vi.fn(), finish: vi.fn()
        }
      }]
    });
    const fixture = TestBed.createComponent(AccountAnalysisWorkbenchFooterComponent);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[1].disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('skip every facility');
  });

  it('delegates Back, Continue, and Finish according to the current stage', () => {
    const back = vi.fn();
    const continueNavigation = vi.fn();
    const finish = vi.fn();
    const nextStage = signal<unknown>({ id: 'results' });
    TestBed.configureTestingModule({
      imports: [AccountAnalysisWorkbenchFooterComponent],
      providers: [{
        provide: AccountAnalysisWorkbenchNavigationService,
        useValue: {
          requirement: signal(undefined), disabled: signal(false), nextStage,
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
    fixture.detectChanges();
    buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[1].textContent).toContain('Finish');
    buttons[1].click();
    expect(finish).toHaveBeenCalledOnce();
  });
});
