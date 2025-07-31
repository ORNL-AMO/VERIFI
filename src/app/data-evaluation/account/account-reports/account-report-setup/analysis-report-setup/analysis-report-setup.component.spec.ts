import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisReportSetupComponent } from './analysis-report-setup.component';

describe('AnalysisReportSetupComponent', () => {
  let component: AnalysisReportSetupComponent;
  let fixture: ComponentFixture<AnalysisReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
