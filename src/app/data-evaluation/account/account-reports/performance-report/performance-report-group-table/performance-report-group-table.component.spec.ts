import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceReportGroupTableComponent } from './performance-report-group-table.component';

describe('PerformanceReportGroupTableComponent', () => {
  let component: PerformanceReportGroupTableComponent;
  let fixture: ComponentFixture<PerformanceReportGroupTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PerformanceReportGroupTableComponent]
    });
    fixture = TestBed.createComponent(PerformanceReportGroupTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
