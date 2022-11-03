import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostUtilitiesUsageChartComponent } from './cost-utilities-usage-chart.component';

describe('CostUtilitiesUsageChartComponent', () => {
  let component: CostUtilitiesUsageChartComponent;
  let fixture: ComponentFixture<CostUtilitiesUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostUtilitiesUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostUtilitiesUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
