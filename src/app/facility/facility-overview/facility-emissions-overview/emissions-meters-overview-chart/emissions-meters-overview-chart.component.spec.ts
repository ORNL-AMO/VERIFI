import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsMetersOverviewChartComponent } from './emissions-meters-overview-chart.component';

describe('EmissionsMetersOverviewChartComponent', () => {
  let component: EmissionsMetersOverviewChartComponent;
  let fixture: ComponentFixture<EmissionsMetersOverviewChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsMetersOverviewChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsMetersOverviewChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
