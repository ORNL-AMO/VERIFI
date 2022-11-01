import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostMetersOverviewChartComponent } from './cost-meters-overview-chart.component';

describe('CostMetersOverviewChartComponent', () => {
  let component: CostMetersOverviewChartComponent;
  let fixture: ComponentFixture<CostMetersOverviewChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostMetersOverviewChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostMetersOverviewChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
