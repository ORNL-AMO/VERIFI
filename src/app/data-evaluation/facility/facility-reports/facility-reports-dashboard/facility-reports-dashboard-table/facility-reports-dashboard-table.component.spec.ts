import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsDashboardTableComponent } from './facility-reports-dashboard-table.component';

describe('FacilityReportsDashboardTableComponent', () => {
  let component: FacilityReportsDashboardTableComponent;
  let fixture: ComponentFixture<FacilityReportsDashboardTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsDashboardTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsDashboardTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
