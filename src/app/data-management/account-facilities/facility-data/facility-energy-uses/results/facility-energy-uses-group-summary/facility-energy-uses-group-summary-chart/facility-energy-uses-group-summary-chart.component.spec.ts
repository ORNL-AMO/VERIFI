import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupSummaryChartComponent } from './facility-energy-uses-group-summary-chart.component';

describe('FacilityEnergyUsesGroupSummaryChartComponent', () => {
  let component: FacilityEnergyUsesGroupSummaryChartComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupSummaryChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupSummaryChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupSummaryChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
