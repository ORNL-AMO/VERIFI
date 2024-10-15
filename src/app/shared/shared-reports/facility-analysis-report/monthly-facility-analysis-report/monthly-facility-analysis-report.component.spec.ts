import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyFacilityAnalysisReportComponent } from './monthly-facility-analysis-report.component';

describe('MonthlyFacilityAnalysisReportComponent', () => {
  let component: MonthlyFacilityAnalysisReportComponent;
  let fixture: ComponentFixture<MonthlyFacilityAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonthlyFacilityAnalysisReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyFacilityAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
