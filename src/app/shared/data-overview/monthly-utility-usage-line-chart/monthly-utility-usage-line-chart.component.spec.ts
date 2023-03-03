import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyUtilityUsageLineChartComponent } from './monthly-utility-usage-line-chart.component';

describe('MonthlyUtilityUsageLineChartComponent', () => {
  let component: MonthlyUtilityUsageLineChartComponent;
  let fixture: ComponentFixture<MonthlyUtilityUsageLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyUtilityUsageLineChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyUtilityUsageLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
