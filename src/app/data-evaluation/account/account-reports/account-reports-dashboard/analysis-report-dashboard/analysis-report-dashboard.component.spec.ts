import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisReportDashboardComponent } from './analysis-report-dashboard.component';

describe('AnalysisReportDashboardComponent', () => {
  let component: AnalysisReportDashboardComponent;
  let fixture: ComponentFixture<AnalysisReportDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisReportDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
