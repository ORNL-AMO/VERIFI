import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorDataQualityReportComponent } from './predictor-data-quality-report.component';

describe('PredictorDataQualityReportComponent', () => {
  let component: PredictorDataQualityReportComponent;
  let fixture: ComponentFixture<PredictorDataQualityReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorDataQualityReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorDataQualityReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
