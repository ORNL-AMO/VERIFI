import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarbonReportDashboardComponent } from './carbon-report-dashboard.component';

describe('CarbonReportDashboardComponent', () => {
  let component: CarbonReportDashboardComponent;
  let fixture: ComponentFixture<CarbonReportDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CarbonReportDashboardComponent]
    });
    fixture = TestBed.createComponent(CarbonReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
