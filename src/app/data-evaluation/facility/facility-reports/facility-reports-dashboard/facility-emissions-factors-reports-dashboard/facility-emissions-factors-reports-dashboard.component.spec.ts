import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsFactorsReportsDashboardComponent } from './facility-emissions-factors-reports-dashboard.component';

describe('FacilityEmissionsFactorsReportsDashboardComponent', () => {
  let component: FacilityEmissionsFactorsReportsDashboardComponent;
  let fixture: ComponentFixture<FacilityEmissionsFactorsReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEmissionsFactorsReportsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsFactorsReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
