import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostMetersUsageChartComponent } from './cost-meters-usage-chart.component';

describe('CostMetersUsageChartComponent', () => {
  let component: CostMetersUsageChartComponent;
  let fixture: ComponentFixture<CostMetersUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostMetersUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostMetersUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
