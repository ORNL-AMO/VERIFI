import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorDataTableComponent } from './facility-predictor-data-table.component';

describe('FacilityPredictorDataTableComponent', () => {
  let component: FacilityPredictorDataTableComponent;
  let fixture: ComponentFixture<FacilityPredictorDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorDataTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityPredictorDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
