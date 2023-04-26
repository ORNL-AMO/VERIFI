import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherDataHelpComponent } from './weather-data-help.component';

describe('WeatherDataHelpComponent', () => {
  let component: WeatherDataHelpComponent;
  let fixture: ComponentFixture<WeatherDataHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeatherDataHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherDataHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
