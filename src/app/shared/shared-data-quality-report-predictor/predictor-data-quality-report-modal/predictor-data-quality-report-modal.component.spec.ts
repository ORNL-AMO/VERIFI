import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorDataQualityReportModalComponent } from './predictor-data-quality-report-modal.component';

describe('PredictorDataQualityReportModalComponent', () => {
  let component: PredictorDataQualityReportModalComponent;
  let fixture: ComponentFixture<PredictorDataQualityReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorDataQualityReportModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorDataQualityReportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
