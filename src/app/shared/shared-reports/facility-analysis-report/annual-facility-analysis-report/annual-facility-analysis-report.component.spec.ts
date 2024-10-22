import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualFacilityAnalysisReportComponent } from './annual-facility-analysis-report.component';

describe('AnnualFacilityAnalysisReportComponent', () => {
  let component: AnnualFacilityAnalysisReportComponent;
  let fixture: ComponentFixture<AnnualFacilityAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualFacilityAnalysisReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualFacilityAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
