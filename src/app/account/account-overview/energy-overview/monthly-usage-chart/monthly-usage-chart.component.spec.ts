import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyUsageChartComponent } from './monthly-usage-chart.component';

describe('MonthlyUsageChartComponent', () => {
  let component: MonthlyUsageChartComponent;
  let fixture: ComponentFixture<MonthlyUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
