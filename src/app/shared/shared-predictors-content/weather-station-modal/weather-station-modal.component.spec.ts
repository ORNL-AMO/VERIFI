import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherStationModalComponent } from './weather-station-modal.component';

describe('WeatherStationModalComponent', () => {
  let component: WeatherStationModalComponent;
  let fixture: ComponentFixture<WeatherStationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WeatherStationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherStationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
