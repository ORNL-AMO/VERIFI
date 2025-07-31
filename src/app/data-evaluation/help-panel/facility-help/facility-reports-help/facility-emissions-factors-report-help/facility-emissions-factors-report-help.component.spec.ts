import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsFactorsReportHelpComponent } from './facility-emissions-factors-report-help.component';

describe('FacilityEmissionsFactorsReportHelpComponent', () => {
  let component: FacilityEmissionsFactorsReportHelpComponent;
  let fixture: ComponentFixture<FacilityEmissionsFactorsReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEmissionsFactorsReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsFactorsReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
