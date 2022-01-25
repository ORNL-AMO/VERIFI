import { TestBed } from '@angular/core/testing';

import { EditMeterFormService } from './edit-meter-form.service';

describe('EditMeterFormService', () => {
  let service: EditMeterFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditMeterFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
