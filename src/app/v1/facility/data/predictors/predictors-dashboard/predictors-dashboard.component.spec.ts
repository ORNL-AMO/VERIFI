import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { buildPredictorCard, buildWeatherStationGroups } from '../models';
import { PredictorsDashboardComponent } from './predictors-dashboard.component';

describe('PredictorsDashboardComponent', () => {
  it('renders a writable predictor grid and the account/facility context', () => {
    const weatherEntity = (guid: string, name: string) => ({
      kind: 'predictor' as const, guid, name, accountGuid: 'account-a', facilityGuid: 'facility-a'
    });
    const weatherGroup = buildWeatherStationGroups([
      {
        guid: 'weather-hdd', name: 'HDD 65', predictorType: 'Weather', weatherStationId: 'KORD',
        weatherStationName: 'Chicago O’Hare', weatherDataType: 'HDD', heatingBaseTemperature: 65,
        production: false, unit: 'HDD', facilityId: 'facility-a', accountId: 'account-a'
      },
      {
        guid: 'weather-cdd', name: 'CDD 70', predictorType: 'Weather', weatherStationId: 'KORD',
        weatherStationName: 'Chicago O’Hare', weatherDataType: 'CDD', coolingBaseTemperature: 70,
        production: false, unit: 'CDD', facilityId: 'facility-a', accountId: 'account-a'
      }
    ] as any[], [], presentFindings([
      makeFinding('predictor.weather.warning', 'warning', 'quality', weatherEntity('weather-hdd', 'HDD 65')),
      makeFinding('predictor.weather.warning', 'warning', 'quality', weatherEntity('weather-cdd', 'CDD 70'))
    ]), true)[0];
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
        { provide: PredictorWorkspaceActionsService, useValue: { createPredictor: vi.fn() } },
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountDataRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio'],
            facilityPredictorRoute: (_facility: string, predictor: string, tab: string) => ['/predictors', predictor, tab],
            facilityWeatherPredictorCreateRoute: () => ['/predictors', 'weather', 'new']
          }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            canWrite: signal(true),
            hasPending: signal(false),
            isLoading: signal(false),
            defaultWeatherRange: signal(undefined),
            browseItems: signal([
              { kind: 'standard', card: buildPredictorCard({
                guid: 'predictor-a', name: 'Production', predictorType: 'Standard', production: true, unit: 'tons'
              } as any, [], [], true) },
              { kind: 'weather', group: weatherGroup }
            ])
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(PredictorsDashboardComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account A');
    expect(fixture.nativeElement.textContent).toContain('Facility A');
    expect(fixture.nativeElement.textContent).toContain('Production');
    expect(fixture.nativeElement.querySelectorAll('app-predictor-browse-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('app-weather-station-browse-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.weather-station-card__predictors')?.textContent).toContain('HDD 65');
    expect(fixture.nativeElement.querySelector('.weather-station-card__predictors')?.textContent).toContain('CDD 70');
    expect([...fixture.nativeElement.querySelectorAll('app-weather-station-browse-card .v1-resource-browse-card__chip')]
      .map((chip: Element) => chip.textContent?.trim())).toEqual(['Weather station', 'Needs review']);
    expect(fixture.nativeElement.querySelector('app-weather-station-browse-card .v1-resource-browse-card__notes')?.textContent)
      .toContain('Readings: Review weather data — 2 predictors: CDD 70, HDD 65');
    expect(fixture.nativeElement.textContent).not.toContain('output');
    expect(fixture.nativeElement.textContent).toContain('Add predictor');
  });

  it('shows no-facility and empty-predictor states', () => {
    const facility = signal<any>(undefined);
    const browseItems = signal<any[]>([]);
    TestBed.configureTestingModule({
      imports: [PredictorsDashboardComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn(), events: { subscribe: vi.fn() } } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: PredictorWorkspaceActionsService, useValue: { createPredictor: vi.fn() } },
        { provide: WorkspaceNavigationService, useValue: { accountDataRoute: () => [] } },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: { account: signal(undefined), facility, browseItems, canWrite: signal(true), hasPending: signal(false), isLoading: signal(false) }
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
