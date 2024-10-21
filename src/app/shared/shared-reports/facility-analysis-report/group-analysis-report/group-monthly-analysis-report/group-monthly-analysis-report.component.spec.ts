import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupMonthlyAnalysisReportComponent } from './group-monthly-analysis-report.component';

describe('GroupMonthlyAnalysisReportComponent', () => {
  let component: GroupMonthlyAnalysisReportComponent;
  let fixture: ComponentFixture<GroupMonthlyAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GroupMonthlyAnalysisReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupMonthlyAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
