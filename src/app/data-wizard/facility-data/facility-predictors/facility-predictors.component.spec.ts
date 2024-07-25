import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorsComponent } from './facility-predictors.component';

describe('FacilityPredictorsComponent', () => {
  let component: FacilityPredictorsComponent;
  let fixture: ComponentFixture<FacilityPredictorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityPredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
