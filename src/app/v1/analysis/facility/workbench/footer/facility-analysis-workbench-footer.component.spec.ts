import { AnalysisUsageService } from '../../../used-by/analysis-usage.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisWorkbenchFooterComponent } from './facility-analysis-workbench-footer.component';

describe('FacilityAnalysisWorkbenchFooterComponent', () => {
  it('describes blocked navigation and delegates Back and Continue actions', () => {
    const back = vi.fn();
    const continueNavigation = vi.fn();
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisWorkbenchFooterComponent],
      providers: [{ provide: AnalysisUsageService, useValue: { canAct: signal(true), editor: signal(undefined), reportUnavailable: signal(undefined), showAccountAction: signal(true), open: vi.fn() } },
        {
          provide: FacilityAnalysisWorkbenchNavigationService,
          useValue: {
            activeStageId: signal('setup'), requirement: signal('Saving changes before navigation is available.'),
            navigationBlocked: signal(true),
            disabled: signal(true),
            nextStage: signal({ id: 'group:group-a' }),
            back,
            continue: continueNavigation,
            finish: vi.fn()
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisWorkbenchFooterComponent);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const requirement = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(requirement.textContent).toContain('Saving changes');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[0].getAttribute('aria-describedby')).toBe('v1-analysis-navigation-requirement');
    expect(buttons[1].disabled).toBe(true);

    buttons[0].click();
    buttons[1].click();
    expect(back).not.toHaveBeenCalled();
    expect(continueNavigation).not.toHaveBeenCalled();
  });

  it('renders a stable empty status region and delegates enabled navigation', () => {
    const back = vi.fn();
    const continueNavigation = vi.fn();
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisWorkbenchFooterComponent],
      providers: [{ provide: AnalysisUsageService, useValue: { canAct: signal(true), editor: signal(undefined), reportUnavailable: signal(undefined), showAccountAction: signal(true), open: vi.fn() } },
        {
          provide: FacilityAnalysisWorkbenchNavigationService,
          useValue: {
            activeStageId: signal('setup'), requirement: signal(undefined),
            navigationBlocked: signal(false),
            disabled: signal(false),
            nextStage: signal({ id: 'group:group-a' }),
            back,
            continue: continueNavigation,
            finish: vi.fn()
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisWorkbenchFooterComponent);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    buttons[0].click();
    buttons[1].click();
    expect(back).toHaveBeenCalledOnce();
    expect(continueNavigation).toHaveBeenCalledOnce();
  });

  it('replaces Finish with account-analysis and report actions on Used By', () => {
    const finish = vi.fn();
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisWorkbenchFooterComponent],
      providers: [{ provide: AnalysisUsageService, useValue: { canAct: signal(true), editor: signal(undefined), reportUnavailable: signal(undefined), showAccountAction: signal(true), open: vi.fn() } },
        {
          provide: FacilityAnalysisWorkbenchNavigationService,
          useValue: {
            activeStageId: signal('used-by'), requirement: signal(undefined),
            navigationBlocked: signal(false),
            disabled: signal(false),
            nextStage: signal(undefined),
            back: vi.fn(),
            continue: vi.fn(),
            finish
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisWorkbenchFooterComponent);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[1].textContent).toContain('Add Account Analysis');
    buttons[1].click();
    expect(TestBed.inject(AnalysisUsageService).open).toHaveBeenCalledWith('account-analysis');
    buttons[2].click();
    expect(TestBed.inject(AnalysisUsageService).open).toHaveBeenCalledWith('report');
    expect(finish).not.toHaveBeenCalled();
  });
});
