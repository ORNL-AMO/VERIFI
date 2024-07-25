import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorDataComponent } from './facility-predictor-data.component';

describe('FacilityPredictorDataComponent', () => {
  let component: FacilityPredictorDataComponent;
  let fixture: ComponentFixture<FacilityPredictorDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorDataComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityPredictorDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
