import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewReportDashboardComponent } from './overview-report-dashboard.component';

describe('OverviewReportDashboardComponent', () => {
  let component: OverviewReportDashboardComponent;
  let fixture: ComponentFixture<OverviewReportDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OverviewReportDashboardComponent]
    });
    fixture = TestBed.createComponent(OverviewReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
