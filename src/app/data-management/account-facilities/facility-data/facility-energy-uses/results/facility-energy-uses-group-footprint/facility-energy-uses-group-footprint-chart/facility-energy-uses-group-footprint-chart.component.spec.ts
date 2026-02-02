import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupFootprintChartComponent } from './facility-energy-uses-group-footprint-chart.component';

describe('FacilityEnergyUsesGroupFootprintChartComponent', () => {
  let component: FacilityEnergyUsesGroupFootprintChartComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupFootprintChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupFootprintChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupFootprintChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
