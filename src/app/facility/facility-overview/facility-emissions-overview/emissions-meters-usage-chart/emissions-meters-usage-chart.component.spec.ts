import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsMetersUsageChartComponent } from './emissions-meters-usage-chart.component';

describe('EmissionsMetersUsageChartComponent', () => {
  let component: EmissionsMetersUsageChartComponent;
  let fixture: ComponentFixture<EmissionsMetersUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsMetersUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsMetersUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
