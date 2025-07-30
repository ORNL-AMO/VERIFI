import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportDashboardHelpComponent } from './facility-report-dashboard-help.component';

describe('FacilityReportDashboardHelpComponent', () => {
  let component: FacilityReportDashboardHelpComponent;
  let fixture: ComponentFixture<FacilityReportDashboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportDashboardHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportDashboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
