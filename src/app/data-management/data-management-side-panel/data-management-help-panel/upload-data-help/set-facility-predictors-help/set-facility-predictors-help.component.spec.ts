import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetFacilityPredictorsHelpComponent } from './set-facility-predictors-help.component';

describe('SetFacilityPredictorsHelpComponent', () => {
  let component: SetFacilityPredictorsHelpComponent;
  let fixture: ComponentFixture<SetFacilityPredictorsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetFacilityPredictorsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetFacilityPredictorsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
