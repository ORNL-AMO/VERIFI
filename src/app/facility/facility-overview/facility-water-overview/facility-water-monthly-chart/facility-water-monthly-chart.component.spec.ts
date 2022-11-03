import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterMonthlyChartComponent } from './facility-water-monthly-chart.component';

describe('FacilityWaterMonthlyChartComponent', () => {
  let component: FacilityWaterMonthlyChartComponent;
  let fixture: ComponentFixture<FacilityWaterMonthlyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityWaterMonthlyChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityWaterMonthlyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
