import { EnvironmentInjector, createEnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, RouterOutlet, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FacilityPredictorsComponent } from './facility-predictors.component';
import { FacilityPredictorsWorkspaceService } from './facility-predictors-workspace.service';
import { FACILITY_PREDICTORS_WORKSPACE_PROVIDERS } from './facility-predictors.providers';
import { WeatherPredictorWorkbenchContextService } from './weather-predictor-workbench/weather-predictor-workbench-context.service';

describe('FacilityPredictorsComponent', () => {
  it('provides the nested predictor workspace outlet', () => {
    TestBed.configureTestingModule({
      imports: [FacilityPredictorsComponent],
      providers: [provideRouter([]), ...FACILITY_PREDICTORS_WORKSPACE_PROVIDERS]
    });
    const fixture = TestBed.createComponent(FacilityPredictorsComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(RouterOutlet)).injector.get(RouterOutlet)).toBeInstanceOf(RouterOutlet);
  });

  it('makes workspace providers available to child route contexts', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const routeParameters = convertToParamMap({ weatherGroupKey: 'missing' });
    const parentRouteInjector = createEnvironmentInjector([{
      provide: FacilityPredictorsWorkspaceService,
      useValue: { weatherStationGroups: () => [], predictorReadings: () => [] }
    }], TestBed.inject(EnvironmentInjector));
    const childRouteInjector = createEnvironmentInjector([
      WeatherPredictorWorkbenchContextService,
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(routeParameters),
          url: of([]),
          snapshot: { paramMap: routeParameters, url: [] }
        }
      }
    ], parentRouteInjector);

    expect(() => runInInjectionContext(
      childRouteInjector,
      () => inject(WeatherPredictorWorkbenchContextService)
    )).not.toThrow();

    childRouteInjector.destroy();
    parentRouteInjector.destroy();
  });
});
