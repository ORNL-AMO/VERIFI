import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyModifiedEnergyIntensityComponent } from './monthly-modified-energy-intensity.component';

describe('MonthlyModifiedEnergyIntensityComponent', () => {
  let component: MonthlyModifiedEnergyIntensityComponent;
  let fixture: ComponentFixture<MonthlyModifiedEnergyIntensityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyModifiedEnergyIntensityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyModifiedEnergyIntensityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
