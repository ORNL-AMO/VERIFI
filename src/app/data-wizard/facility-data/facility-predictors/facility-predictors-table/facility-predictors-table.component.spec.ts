import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorsTableComponent } from './facility-predictors-table.component';

describe('FacilityPredictorsTableComponent', () => {
  let component: FacilityPredictorsTableComponent;
  let fixture: ComponentFixture<FacilityPredictorsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorsTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityPredictorsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
