import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkbenchComponent } from './predictor-workbench.component';

describe('PredictorWorkbenchComponent', () => {
  it('renders identity facts, active tab, and preserves that tab when switching predictors', () => {
    const events = new Subject<unknown>();
    const navigate = vi.fn();
    const selectedPredictor = signal<any>({ guid: 'predictor-a', name: 'Output A', predictorType: 'Weather', weatherStationName: 'Oak Ridge' });
    const selectedCard = signal<any>({
      predictor: selectedPredictor(), typeLabel: 'Weather', classificationLabel: 'Production', unitLabel: 'HDD',
      icon: 'thermometerSnowflake',
      statusIcon: 'success', statusTone: 'success', statusLabel: 'Valid',
      readingCount: 4, firstReadingLabel: 'Jan 2025', latestReadingLabel: 'Apr 2025'
    });
    const factsExpanded = signal(true);
    const route = { firstChild: { snapshot: { data: { predictorTab: 'readings' } } } };
    TestBed.configureTestingModule({
      imports: [PredictorWorkbenchComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '',
            events,
            navigate,
            createUrlTree: vi.fn(() => ({})),
            serializeUrl: vi.fn(() => '/account/portfolio')
          }
        },
        { provide: ActivatedRoute, useValue: route },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountDataRoute: () => ['/account', 'portfolio'],
            facilityDataRoute: () => ['/facility', 'predictors'],
            facilityPredictorRoute: (_facility: string, predictor: string, tab: string) => ['/predictors', predictor, tab]
          }
        },
        { provide: WorkbenchLayoutService, useValue: { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) } },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            selectedPredictor,
            selectedPredictorCard: selectedCard,
            predictorNotFound: signal(false),
            predictorCards: signal([
              selectedCard(),
              { predictor: { guid: 'predictor-b', name: 'Output B' }, icon: 'package' }
            ])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorWorkbenchComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('readings');
    expect(fixture.nativeElement.textContent).toContain('Oak Ridge');
    expect(fixture.nativeElement.textContent).toContain('Apr 2025');

    fixture.componentInstance.switchPredictor('predictor-b');
    expect(navigate).toHaveBeenLastCalledWith(['/predictors', 'predictor-b', 'readings']);

    route.firstChild.snapshot.data.predictorTab = 'quality';
    events.next(new NavigationEnd(1, '', '/predictors/predictor-a/quality'));
    expect(fixture.componentInstance.activeTab()).toBe('quality');
  });

  it('shows a not-found state with a dashboard action', () => {
    const navigate = vi.fn();
    TestBed.configureTestingModule({
      imports: [PredictorWorkbenchComponent],
      providers: [
        { provide: Router, useValue: { url: '', events: new Subject(), navigate } },
        { provide: ActivatedRoute, useValue: { firstChild: { snapshot: { data: {} } } } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountDataRoute: () => [],
            facilityDataRoute: () => ['/facility', 'predictors'],
            facilityPredictorRoute: () => []
          }
        },
        { provide: WorkbenchLayoutService, useValue: { factsExpanded: signal(true), toggleFacts: vi.fn() } },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal(undefined),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            selectedPredictor: signal(undefined),
            selectedPredictorCard: signal(undefined),
            predictorNotFound: signal(true),
            predictorCards: signal([])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorWorkbenchComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Predictor not found');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/facility', 'predictors']);
  });
});
