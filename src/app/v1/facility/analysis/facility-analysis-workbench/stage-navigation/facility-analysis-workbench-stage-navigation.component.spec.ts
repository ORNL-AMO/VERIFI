import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisWorkbenchStageNavigationComponent } from './facility-analysis-workbench-stage-navigation.component';

describe('FacilityAnalysisWorkbenchStageNavigationComponent', () => {
  it('renders current, blocked, complete, and attention stage state', () => {
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisWorkbenchStageNavigationComponent],
      providers: [
        provideRouter([]),
        {
          provide: FacilityAnalysisWorkbenchNavigationService,
          useValue: {
            stages: signal([
              {
                id: 'analysis', kind: 'analysis', label: 'Analysis Setup', route: ['/setup'],
                current: true, completed: false, canOpen: true
              },
              {
                id: 'group:group-a', kind: 'group', label: 'Group A', route: ['/group-a'],
                current: false, completed: true, canOpen: false,
                attention: { total: 2, errorCount: 1, warningCount: 1, state: 'error' }
              }
            ])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisWorkbenchStageNavigationComponent);
    fixture.detectChanges();

    const stages = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLElement>;
    expect(stages[0].classList).toContain('is-current');
    expect(stages[0].querySelector('[aria-current="step"]')).not.toBeNull();
    expect(stages[1].classList).toContain('is-complete');
    expect(stages[1].classList).toContain('is-blocked');
    expect(stages[1].querySelector('[aria-disabled="true"]')).not.toBeNull();
    expect(stages[1].textContent).toContain('2 issues');
  });
});
