import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorDataQualityReportHelpComponent } from './predictor-data-quality-report-help.component';

describe('PredictorDataQualityReportHelpComponent', () => {
  let component: PredictorDataQualityReportHelpComponent;
  let fixture: ComponentFixture<PredictorDataQualityReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorDataQualityReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorDataQualityReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
