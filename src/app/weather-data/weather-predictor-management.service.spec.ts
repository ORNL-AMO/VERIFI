import { TestBed } from '@angular/core/testing';

import { WeatherPredictorManagementService } from './weather-predictor-management.service';

describe('WeatherPredictorManagementService', () => {
  let service: WeatherPredictorManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeatherPredictorManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
