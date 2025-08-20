import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateWeatherPredictorsModalComponent } from './update-weather-predictors-modal.component';

describe('UpdateWeatherPredictorsModalComponent', () => {
  let component: UpdateWeatherPredictorsModalComponent;
  let fixture: ComponentFixture<UpdateWeatherPredictorsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateWeatherPredictorsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateWeatherPredictorsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
