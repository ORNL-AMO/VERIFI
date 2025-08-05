import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisReportHelpComponent } from './analysis-report-help.component';

describe('AnalysisReportHelpComponent', () => {
  let component: AnalysisReportHelpComponent;
  let fixture: ComponentFixture<AnalysisReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
