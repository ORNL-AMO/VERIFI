import { TestBed } from '@angular/core/testing';

import { EditPredictorFormService } from './edit-predictor-form.service';

describe('EditPredictorFormService', () => {
  let service: EditPredictorFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditPredictorFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
