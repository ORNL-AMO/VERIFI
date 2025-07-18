import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewReportResultsComponent } from './facility-overview-report-results.component';

describe('FacilityOverviewReportResultsComponent', () => {
  let component: FacilityOverviewReportResultsComponent;
  let fixture: ComponentFixture<FacilityOverviewReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityOverviewReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityOverviewReportResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
