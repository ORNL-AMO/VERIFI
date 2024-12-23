import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSurveyComponent } from './user-survey.component';

describe('UserSurveyComponent', () => {
  let component: UserSurveyComponent;
  let fixture: ComponentFixture<UserSurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserSurveyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSurveyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
