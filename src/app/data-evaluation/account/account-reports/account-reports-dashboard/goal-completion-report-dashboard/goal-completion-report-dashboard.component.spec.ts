import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalCompletionReportDashboardComponent } from './goal-completion-report-dashboard.component';

describe('GoalCompletionReportDashboardComponent', () => {
  let component: GoalCompletionReportDashboardComponent;
  let fixture: ComponentFixture<GoalCompletionReportDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GoalCompletionReportDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalCompletionReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
