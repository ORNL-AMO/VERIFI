import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceReportUtilityTableComponent } from './performance-report-utility-table.component';

describe('PerformanceReportUtilityTableComponent', () => {
  let component: PerformanceReportUtilityTableComponent;
  let fixture: ComponentFixture<PerformanceReportUtilityTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PerformanceReportUtilityTableComponent]
    });
    fixture = TestBed.createComponent(PerformanceReportUtilityTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
