import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesFootprintChartComponent } from './facility-energy-uses-footprint-chart.component';

describe('FacilityEnergyUsesFootprintChartComponent', () => {
  let component: FacilityEnergyUsesFootprintChartComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesFootprintChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesFootprintChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesFootprintChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
