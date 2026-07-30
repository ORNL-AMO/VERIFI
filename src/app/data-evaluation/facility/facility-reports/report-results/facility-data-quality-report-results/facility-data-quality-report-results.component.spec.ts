import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityDataQualityReportResultsComponent } from './facility-data-quality-report-results.component';

describe('FacilityDataQualityReportResultsComponent', () => {
  let component: FacilityDataQualityReportResultsComponent;
  let fixture: ComponentFixture<FacilityDataQualityReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityDataQualityReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityDataQualityReportResultsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
