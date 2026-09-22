import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { FacilityPredictorsComponent } from './facility-predictors.component';

describe('FacilityPredictorsComponent', () => {
  it('provides the nested predictor workspace outlet', () => {
    TestBed.configureTestingModule({ imports: [FacilityPredictorsComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FacilityPredictorsComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(RouterOutlet)).injector.get(RouterOutlet)).toBeInstanceOf(RouterOutlet);
  });
});
