import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherStationsHelpComponent } from './weather-stations-help.component';

describe('WeatherStationsHelpComponent', () => {
  let component: WeatherStationsHelpComponent;
  let fixture: ComponentFixture<WeatherStationsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeatherStationsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherStationsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
