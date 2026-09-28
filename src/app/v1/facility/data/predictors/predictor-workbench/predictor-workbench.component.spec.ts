import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkbenchContextService } from './predictor-workbench-context.service';
import { PredictorWorkbenchComponent } from './predictor-workbench.component';

describe('PredictorWorkbenchComponent', () => {
  it('renders identity facts, active tab, and preserves that tab when switching predictors', () => {
    const events = new Subject<unknown>();
    const navigate = vi.fn();
    const selectedPredictor = signal<any>({ guid: 'predictor-a', name: 'Output A', predictorType: 'Standard' });
    const selectedCard = signal<any>({
      predictor: selectedPredictor(), typeLabel: 'Standard', productionLabel: 'Production', unitLabel: 'tons',
      icon: 'package',
      statusIcon: 'success', statusTone: 'success', statusLabel: 'Valid',
      statusActionSummaries: ['Review one incomplete weather month.'],
      readingCount: 4, firstReadingLabel: 'Jan 2025', latestReadingLabel: 'Apr 2025',
      statistics: {
        unitLabel: 'tons',
        facts: [
          { id: 'latest', label: 'Latest value', valueLabel: '40', periodLabel: 'Apr 2025', unavailable: false },
          { id: 'same-month-last-year', label: 'Same month last year', valueLabel: '10', periodLabel: 'Apr 2024', unavailable: false },
          { id: 'latest-twelve-month-average', label: 'Latest 12-mo avg', valueLabel: '22', unavailable: false },
          { id: 'previous-twelve-month-average', label: 'Previous 12-mo avg', valueLabel: 'Not available', unavailable: true }
        ]
      }
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
            facilityPredictorRoute: (_facility: string, predictor: string, tab: string) => ['/predictors', predictor, tab],
            facilityWeatherPredictorRoute: (_facility: string, group: string, tab: string) => ['/weather', group, tab]
          }
        },
        { provide: WorkbenchLayoutService, useValue: { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) } },
        {
          provide: PredictorWorkbenchContextService,
          useValue: {
            predictor: selectedPredictor,
            card: selectedCard,
            findings: signal([{
              id: 'gap', severity: 'error',
              destination: { kind: 'predictor-tab', facilityGuid: 'facility-a', predictorGuid: 'predictor-a', tab: 'readings' }
            }]),
            notFound: signal(false)
          }
        },
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
            weatherStationGroups: signal([{
              routeKey: 'station:KORD', stationName: 'Chicago O’Hare'
            }])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorWorkbenchComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(fixture.componentInstance.activeTab()).toBe('readings');
    expect(element.textContent).toContain('Apr 2025');
    const chips = Array.from(element.querySelectorAll<HTMLElement>('.v1-data-workbench-actions .v1-chip'))
      .map(chip => chip.textContent?.trim());
    expect(chips).toEqual(['Production', 'Valid']);
    const statistics = element.querySelector<HTMLElement>('[aria-label="Predictor statistics"]')!;
    expect(statistics.textContent).toContain('Latest value');
    expect(statistics.textContent).toContain('40');
    expect(statistics.textContent).toContain('Same month last year');
    expect(statistics.textContent).toContain('Apr 2024');
    expect(statistics.textContent).toContain('Latest 12-mo avg');
    expect(statistics.textContent).toContain('Previous 12-mo avg');
    expect(statistics.textContent).toContain('Not available');
    expect(element.querySelector('.v1-data-workbench-facts-note')?.textContent).toContain('tons');
    expect(element.querySelector('.v1-data-workbench-status-notes')?.textContent)
      .toContain('Review one incomplete weather month.');
    expect(fixture.componentInstance.tabAttention().readings).toEqual(expect.objectContaining({
      total: 1,
      errorCount: 1,
      warningCount: 0
    }));

    const factsRegion = element.querySelector<HTMLElement>('#v1-predictor-workbench-facts')!;
    const factsToggle = element.querySelector<HTMLButtonElement>('[aria-controls="v1-predictor-workbench-facts"]')!;
    factsToggle.click();
    fixture.detectChanges();
    expect(factsRegion.hidden).toBe(true);

    fixture.componentInstance.switchPredictor('predictor-b');
    expect(navigate).toHaveBeenLastCalledWith(['/predictors', 'predictor-b', 'readings']);

    element.querySelector<HTMLButtonElement>('.v1-data-workbench-switcher-toggle')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.v1-data-workbench-switcher-menu')?.textContent).toContain('Chicago O’Hare');
    fixture.componentInstance.switchWeatherStation('station:KORD');
    expect(navigate).toHaveBeenLastCalledWith(['/weather', 'station:KORD', 'readings']);

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
          provide: PredictorWorkbenchContextService,
          useValue: {
            predictor: signal(undefined), card: signal(undefined), findings: signal([]), notFound: signal(true)
          }
        },
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

});
