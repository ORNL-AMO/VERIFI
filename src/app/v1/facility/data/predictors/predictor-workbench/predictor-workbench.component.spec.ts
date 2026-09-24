import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkbenchComponent } from './predictor-workbench.component';

describe('PredictorWorkbenchComponent', () => {
  it('renders identity facts, active tab, and preserves that tab when switching predictors', () => {
    const events = new Subject<unknown>();
    const navigate = vi.fn();
    const selectedPredictor = signal<any>({ guid: 'predictor-a', name: 'Output A', predictorType: 'Standard' });
    const selectedCard = signal<any>({
      predictor: selectedPredictor(), typeLabel: 'Standard', classificationLabel: 'Production', unitLabel: 'tons',
      icon: 'package',
      statusIcon: 'success', statusTone: 'success', statusLabel: 'Valid',
      statusActionSummaries: ['Review one incomplete weather month.'],
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
          provide: WorkspaceStatusService,
          useValue: {
            predictorFindings: vi.fn(() => [{
              id: 'gap', severity: 'error',
              destination: { kind: 'predictor-tab', facilityGuid: 'facility-a', predictorGuid: 'predictor-a', tab: 'readings' }
            }])
          }
        },
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
            ]),
            standardPredictorCards: signal([
              selectedCard(),
              { predictor: { guid: 'predictor-b', name: 'Output B' }, icon: 'package' }
            ]),
            weatherStationGroups: signal([])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorWorkbenchComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('readings');
    expect(fixture.nativeElement.textContent).toContain('Apr 2025');
    expect(fixture.nativeElement.querySelector('.v1-data-workbench-status-notes')?.textContent)
      .toContain('Review one incomplete weather month.');
    expect(fixture.componentInstance.tabAttention().readings).toEqual(expect.objectContaining({
      total: 1,
      errorCount: 1,
      warningCount: 0
    }));

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
        { provide: WorkspaceStatusService, useValue: { predictorFindings: vi.fn(() => []) } },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal(undefined),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            selectedPredictor: signal(undefined),
            selectedPredictorCard: signal(undefined),
            predictorNotFound: signal(true),
            predictorCards: signal([]),
            standardPredictorCards: signal([]),
            weatherStationGroups: signal([])
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

  it('redirects legacy weather output links to the station workbench and preserves the tab', () => {
    const navigate = vi.fn();
    const weatherPredictor = { guid: 'weather-a', name: 'Cooling days', predictorType: 'Weather' };
    TestBed.configureTestingModule({
      imports: [PredictorWorkbenchComponent],
      providers: [
        { provide: Router, useValue: { url: '', events: new Subject(), navigate } },
        { provide: ActivatedRoute, useValue: { firstChild: { snapshot: { data: { predictorTab: 'quality' } } } } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountDataRoute: () => [],
            facilityDataRoute: () => [],
            facilityPredictorRoute: () => [],
            facilityWeatherPredictorRoute: (_facility: string, group: string, tab: string) =>
              ['/weather', group, tab],
            facilityWeatherPredictorQualityRoute: (_facility: string, group: string, predictor: string) =>
              ['/weather', group, 'quality', predictor]
          }
        },
        { provide: WorkbenchLayoutService, useValue: { factsExpanded: signal(true), toggleFacts: vi.fn() } },
        { provide: WorkspaceStatusService, useValue: { predictorFindings: vi.fn(() => []) } },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal(undefined),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            selectedPredictor: signal(weatherPredictor),
            selectedPredictorCard: signal(undefined),
            predictorNotFound: signal(false),
            predictorCards: signal([]),
            standardPredictorCards: signal([]),
            weatherStationGroups: signal([{
              routeKey: 'station:KORD',
              predictors: [weatherPredictor]
            }])
          }
        }
      ]
    });

    TestBed.createComponent(PredictorWorkbenchComponent).detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/weather', 'station:KORD', 'quality', 'weather-a']);
  });
});
