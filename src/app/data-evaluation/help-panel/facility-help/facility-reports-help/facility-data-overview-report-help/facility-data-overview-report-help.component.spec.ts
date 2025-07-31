import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityDataOverviewReportHelpComponent } from './facility-data-overview-report-help.component';

describe('FacilityDataOverviewReportHelpComponent', () => {
  let component: FacilityDataOverviewReportHelpComponent;
  let fixture: ComponentFixture<FacilityDataOverviewReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityDataOverviewReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityDataOverviewReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
