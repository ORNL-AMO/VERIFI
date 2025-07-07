import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorDataBulkUpdateComponent } from './facility-predictor-data-bulk-update.component';

describe('FacilityPredictorDataBulkUpdateComponent', () => {
  let component: FacilityPredictorDataBulkUpdateComponent;
  let fixture: ComponentFixture<FacilityPredictorDataBulkUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorDataBulkUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityPredictorDataBulkUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
