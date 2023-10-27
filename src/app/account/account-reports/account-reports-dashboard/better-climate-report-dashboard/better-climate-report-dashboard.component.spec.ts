import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterClimateReportDashboardComponent } from './better-climate-report-dashboard.component';

describe('BetterClimateReportDashboardComponent', () => {
  let component: BetterClimateReportDashboardComponent;
  let fixture: ComponentFixture<BetterClimateReportDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BetterClimateReportDashboardComponent]
    });
    fixture = TestBed.createComponent(BetterClimateReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
