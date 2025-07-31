import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherDataSubLabelComponent } from './weather-data-sub-label.component';

describe('WeatherDataSubLabelComponent', () => {
  let component: WeatherDataSubLabelComponent;
  let fixture: ComponentFixture<WeatherDataSubLabelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WeatherDataSubLabelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WeatherDataSubLabelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
