import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalCompletionSetupComponent } from './goal-completion-setup.component';

describe('GoalCompletionSetupComponent', () => {
  let component: GoalCompletionSetupComponent;
  let fixture: ComponentFixture<GoalCompletionSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GoalCompletionSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalCompletionSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
