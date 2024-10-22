import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnalysisReportComponent } from './group-analysis-report.component';

describe('GroupAnalysisReportComponent', () => {
  let component: GroupAnalysisReportComponent;
  let fixture: ComponentFixture<GroupAnalysisReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GroupAnalysisReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupAnalysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
