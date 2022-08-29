import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetFacilityPredictorsComponent } from './set-facility-predictors.component';

describe('SetFacilityPredictorsComponent', () => {
  let component: SetFacilityPredictorsComponent;
  let fixture: ComponentFixture<SetFacilityPredictorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetFacilityPredictorsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetFacilityPredictorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
