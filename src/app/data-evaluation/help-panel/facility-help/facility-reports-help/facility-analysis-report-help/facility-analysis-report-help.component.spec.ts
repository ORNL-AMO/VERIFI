import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisReportHelpComponent } from './facility-analysis-report-help.component';

describe('FacilityAnalysisReportHelpComponent', () => {
  let component: FacilityAnalysisReportHelpComponent;
  let fixture: ComponentFixture<FacilityAnalysisReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityAnalysisReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
