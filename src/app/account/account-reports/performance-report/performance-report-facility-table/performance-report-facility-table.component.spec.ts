import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceReportFacilityTableComponent } from './performance-report-facility-table.component';

describe('PerformanceReportFacilityTableComponent', () => {
  let component: PerformanceReportFacilityTableComponent;
  let fixture: ComponentFixture<PerformanceReportFacilityTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PerformanceReportFacilityTableComponent]
    });
    fixture = TestBed.createComponent(PerformanceReportFacilityTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
