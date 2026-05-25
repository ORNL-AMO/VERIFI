import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityDataQualityReportSetupComponent } from './facility-data-quality-report-setup.component';

describe('FacilityDataQualityReportSetupComponent', () => {
  let component: FacilityDataQualityReportSetupComponent;
  let fixture: ComponentFixture<FacilityDataQualityReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityDataQualityReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityDataQualityReportSetupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
