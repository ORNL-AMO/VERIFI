import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsDashboardTabsComponent } from './facility-reports-dashboard-tabs.component';

describe('FacilityReportsDashboardTabsComponent', () => {
  let component: FacilityReportsDashboardTabsComponent;
  let fixture: ComponentFixture<FacilityReportsDashboardTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsDashboardTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsDashboardTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
