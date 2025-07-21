import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMeterDataQualityReportComponent } from './facility-meter-data-quality-report.component';

describe('FacilityMeterDataQualityReportComponent', () => {
  let component: FacilityMeterDataQualityReportComponent;
  let fixture: ComponentFixture<FacilityMeterDataQualityReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMeterDataQualityReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityMeterDataQualityReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
