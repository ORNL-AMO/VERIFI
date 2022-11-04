import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyMetersUsageChartComponent } from './energy-meters-usage-chart.component';

describe('EnergyMetersUsageChartComponent', () => {
  let component: EnergyMetersUsageChartComponent;
  let fixture: ComponentFixture<EnergyMetersUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyMetersUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyMetersUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
