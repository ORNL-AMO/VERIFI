import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsUsageChartComponent } from './emissions-usage-chart.component';

describe('EmissionsUsageChartComponent', () => {
  let component: EmissionsUsageChartComponent;
  let fixture: ComponentFixture<EmissionsUsageChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsUsageChartComponent]
    });
    fixture = TestBed.createComponent(EmissionsUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
