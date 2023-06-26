import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountWaterReductionGoalComponent } from './account-water-reduction-goal.component';

describe('AccountWaterReductionGoalComponent', () => {
  let component: AccountWaterReductionGoalComponent;
  let fixture: ComponentFixture<AccountWaterReductionGoalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountWaterReductionGoalComponent]
    });
    fixture = TestBed.createComponent(AccountWaterReductionGoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
