import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupPerformanceChartComponent } from './group-performance-chart.component';

describe('GroupPerformanceChartComponent', () => {
  let component: GroupPerformanceChartComponent;
  let fixture: ComponentFixture<GroupPerformanceChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GroupPerformanceChartComponent]
    });
    fixture = TestBed.createComponent(GroupPerformanceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
