import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisReportComponent } from './facility-analysis-report.component';

describe('FacilityAnalysisReportComponent', () => {
  let component: FacilityAnalysisReportComponent;
  let fixture: ComponentFixture<FacilityAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityAnalysisReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
