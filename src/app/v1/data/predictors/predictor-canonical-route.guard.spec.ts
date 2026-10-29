import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { predictorCanonicalRouteGuard } from './predictor-canonical-route.guard';

describe('predictorCanonicalRouteGuard', () => {
  it('redirects weather predictor links before the standard workbench is created', () => {
    const urlTree = { redirected: true } as any;
    const createUrlTree = vi.fn(() => urlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            facilityPredictors: () => [{
              guid: 'weather-a', predictorType: 'Weather', weatherStationId: 'KORD'
            }],
            selectedFacility: () => ({ guid: 'facility-a' })
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            facilityWeatherPredictorRoute: vi.fn(),
            facilityWeatherPredictorQualityRoute: vi.fn(() => [
              '/facility', 'facility-a', 'predictors', 'weather', 'station:KORD', 'quality', 'weather-a'
            ])
          }
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() => predictorCanonicalRouteGuard(
      { paramMap: convertToParamMap({ predictorGuid: 'weather-a' }) } as ActivatedRouteSnapshot,
      { url: '/v1/workspace/facility/facility-a/data/predictors/weather-a/quality' } as RouterStateSnapshot
    ));

    expect(result).toBe(urlTree);
    expect(createUrlTree).toHaveBeenCalledWith([
      '/facility', 'facility-a', 'predictors', 'weather', 'station:KORD', 'quality', 'weather-a'
    ]);
  });

  it('allows standard predictors to use the standard workbench', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            facilityPredictors: () => [{ guid: 'standard-a', predictorType: 'Standard' }],
            selectedFacility: () => ({ guid: 'facility-a' })
          }
        },
        { provide: WorkspaceNavigationService, useValue: {} }
      ]
    });

    expect(TestBed.runInInjectionContext(() => predictorCanonicalRouteGuard(
      { paramMap: convertToParamMap({ predictorGuid: 'standard-a' }) } as ActivatedRouteSnapshot,
      { url: '/predictors/standard-a/settings' } as RouterStateSnapshot
    ))).toBe(true);
  });
});
