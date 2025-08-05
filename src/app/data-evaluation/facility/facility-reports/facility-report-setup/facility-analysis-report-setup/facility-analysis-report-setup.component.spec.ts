import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisReportSetupComponent } from './facility-analysis-report-setup.component';

describe('FacilityAnalysisReportSetupComponent', () => {
  let component: FacilityAnalysisReportSetupComponent;
  let fixture: ComponentFixture<FacilityAnalysisReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityAnalysisReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
