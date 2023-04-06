import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherStationTableComponent } from './weather-station-table.component';

describe('WeatherStationTableComponent', () => {
  let component: WeatherStationTableComponent;
  let fixture: ComponentFixture<WeatherStationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeatherStationTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherStationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
