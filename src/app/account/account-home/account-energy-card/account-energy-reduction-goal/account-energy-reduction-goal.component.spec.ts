import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEnergyReductionGoalComponent } from './account-energy-reduction-goal.component';

describe('AccountEnergyReductionGoalComponent', () => {
  let component: AccountEnergyReductionGoalComponent;
  let fixture: ComponentFixture<AccountEnergyReductionGoalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountEnergyReductionGoalComponent]
    });
    fixture = TestBed.createComponent(AccountEnergyReductionGoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
