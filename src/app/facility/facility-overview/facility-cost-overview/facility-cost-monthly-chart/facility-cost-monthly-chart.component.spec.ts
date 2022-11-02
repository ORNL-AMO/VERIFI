import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostMonthlyChartComponent } from './facility-cost-monthly-chart.component';

describe('FacilityCostMonthlyChartComponent', () => {
  let component: FacilityCostMonthlyChartComponent;
  let fixture: ComponentFixture<FacilityCostMonthlyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityCostMonthlyChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostMonthlyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
