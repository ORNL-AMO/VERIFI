import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorComponent } from './facility-predictor.component';

describe('FacilityPredictorComponent', () => {
  let component: FacilityPredictorComponent;
  let fixture: ComponentFixture<FacilityPredictorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityPredictorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
