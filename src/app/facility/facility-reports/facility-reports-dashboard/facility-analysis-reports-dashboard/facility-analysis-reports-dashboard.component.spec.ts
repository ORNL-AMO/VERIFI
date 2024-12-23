import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisReportsDashboardComponent } from './facility-analysis-reports-dashboard.component';

describe('FacilityAnalysisReportsDashboardComponent', () => {
  let component: FacilityAnalysisReportsDashboardComponent;
  let fixture: ComponentFixture<FacilityAnalysisReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityAnalysisReportsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
