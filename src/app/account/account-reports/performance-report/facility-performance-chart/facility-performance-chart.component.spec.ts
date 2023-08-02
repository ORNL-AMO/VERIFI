import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPerformanceChartComponent } from './facility-performance-chart.component';

describe('FacilityPerformanceChartComponent', () => {
  let component: FacilityPerformanceChartComponent;
  let fixture: ComponentFixture<FacilityPerformanceChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilityPerformanceChartComponent]
    });
    fixture = TestBed.createComponent(FacilityPerformanceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
