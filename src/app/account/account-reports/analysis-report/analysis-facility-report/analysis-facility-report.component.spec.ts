import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisFacilityReportComponent } from './analysis-facility-report.component';

describe('AnalysisFacilityReportComponent', () => {
  let component: AnalysisFacilityReportComponent;
  let fixture: ComponentFixture<AnalysisFacilityReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisFacilityReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisFacilityReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
