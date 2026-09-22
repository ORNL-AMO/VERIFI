import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorsDashboardComponent } from './predictors-dashboard.component';

describe('PredictorsDashboardComponent', () => {
  it('renders a read-only predictor grid and the account/facility context', () => {
    TestBed.configureTestingModule({
      imports: [PredictorsDashboardComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
            events: { subscribe: vi.fn() },
            createUrlTree: vi.fn(() => ({})),
            serializeUrl: vi.fn(() => '/account/portfolio')
          }
        },
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountDataRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio'],
            facilityPredictorRoute: (_facility: string, predictor: string, tab: string) => ['/predictors', predictor, tab]
          }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            predictorCards: signal([{
              predictor: { guid: 'predictor-a', name: 'Output' },
              icon: 'package',
              typeLabel: 'Standard', classificationLabel: 'Production', unitLabel: 'tons', readingCount: 0,
              firstReadingLabel: 'No data', latestReadingLabel: 'No data'
            }])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorsDashboardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account A');
    expect(fixture.nativeElement.textContent).toContain('Facility A');
    expect(fixture.nativeElement.textContent).toContain('Output');
    expect(fixture.nativeElement.querySelectorAll('app-predictor-browse-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('Add predictor');
  });

  it('shows no-facility and empty-predictor states', () => {
    const facility = signal<any>(undefined);
    const predictorCards = signal<any[]>([]);
    TestBed.configureTestingModule({
      imports: [PredictorsDashboardComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn(), events: { subscribe: vi.fn() } } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: WorkspaceNavigationService, useValue: { accountDataRoute: () => [] } },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: { account: signal(undefined), facility, predictorCards }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorsDashboardComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No facility selected');

    facility.set({ guid: 'facility-a', name: 'Facility A' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No predictors');
  });
});
