import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyMetersOverviewChartComponent } from './energy-meters-overview-chart.component';

describe('EnergyMetersOverviewChartComponent', () => {
  let component: EnergyMetersOverviewChartComponent;
  let fixture: ComponentFixture<EnergyMetersOverviewChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyMetersOverviewChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyMetersOverviewChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
