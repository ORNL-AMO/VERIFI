import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisReportResultsComponent } from './facility-analysis-report-results.component';

describe('FacilityAnalysisReportResultsComponent', () => {
  let component: FacilityAnalysisReportResultsComponent;
  let fixture: ComponentFixture<FacilityAnalysisReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityAnalysisReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisReportResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
