import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesSummaryChartComponent } from './facility-energy-uses-summary-chart.component';

describe('FacilityEnergyUsesSummaryChartComponent', () => {
  let component: FacilityEnergyUsesSummaryChartComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesSummaryChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesSummaryChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesSummaryChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
