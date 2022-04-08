import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewReportDashboardHelpComponent } from './overview-report-dashboard-help.component';

describe('OverviewReportDashboardHelpComponent', () => {
  let component: OverviewReportDashboardHelpComponent;
  let fixture: ComponentFixture<OverviewReportDashboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OverviewReportDashboardHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OverviewReportDashboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
