import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPredictorDataQualityReportComponent } from './facility-predictor-data-quality-report.component';

describe('FacilityPredictorDataQualityReportComponent', () => {
  let component: FacilityPredictorDataQualityReportComponent;
  let fixture: ComponentFixture<FacilityPredictorDataQualityReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPredictorDataQualityReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityPredictorDataQualityReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
