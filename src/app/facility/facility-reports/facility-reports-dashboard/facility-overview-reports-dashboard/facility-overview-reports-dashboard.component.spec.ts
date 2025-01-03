import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewReportsDashboardComponent } from './facility-overview-reports-dashboard.component';

describe('FacilityOverviewReportsDashboardComponent', () => {
  let component: FacilityOverviewReportsDashboardComponent;
  let fixture: ComponentFixture<FacilityOverviewReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityOverviewReportsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityOverviewReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
