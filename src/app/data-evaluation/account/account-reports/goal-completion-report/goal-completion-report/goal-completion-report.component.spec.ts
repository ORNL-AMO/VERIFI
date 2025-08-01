import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalCompletionReportComponent } from './goal-completion-report.component';

describe('GoalCompletionReportComponent', () => {
  let component: GoalCompletionReportComponent;
  let fixture: ComponentFixture<GoalCompletionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GoalCompletionReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalCompletionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
