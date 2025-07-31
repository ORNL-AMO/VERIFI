import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewReportSetupComponent } from './facility-overview-report-setup.component';

describe('FacilityOverviewReportSetupComponent', () => {
  let component: FacilityOverviewReportSetupComponent;
  let fixture: ComponentFixture<FacilityOverviewReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityOverviewReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityOverviewReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
