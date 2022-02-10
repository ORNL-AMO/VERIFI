import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyModifiedEnergyIntensityGraphComponent } from './monthly-modified-energy-intensity-graph.component';

describe('MonthlyModifiedEnergyIntensityGraphComponent', () => {
  let component: MonthlyModifiedEnergyIntensityGraphComponent;
  let fixture: ComponentFixture<MonthlyModifiedEnergyIntensityGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyModifiedEnergyIntensityGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyModifiedEnergyIntensityGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
