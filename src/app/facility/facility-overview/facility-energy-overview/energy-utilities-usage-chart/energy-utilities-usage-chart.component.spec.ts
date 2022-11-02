import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUtilitiesUsageChartComponent } from './energy-utilities-usage-chart.component';

describe('EnergyUtilitiesUsageChartComponent', () => {
  let component: EnergyUtilitiesUsageChartComponent;
  let fixture: ComponentFixture<EnergyUtilitiesUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyUtilitiesUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyUtilitiesUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
