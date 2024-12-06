import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnnualAnalysisReportComponent } from './group-annual-analysis-report.component';

describe('GroupAnnualAnalysisReportComponent', () => {
  let component: GroupAnnualAnalysisReportComponent;
  let fixture: ComponentFixture<GroupAnnualAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GroupAnnualAnalysisReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupAnnualAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
