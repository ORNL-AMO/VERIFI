import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyMonthlyChartComponent } from './facility-energy-monthly-chart.component';

describe('FacilityEnergyMonthlyChartComponent', () => {
  let component: FacilityEnergyMonthlyChartComponent;
  let fixture: ComponentFixture<FacilityEnergyMonthlyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEnergyMonthlyChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyMonthlyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
