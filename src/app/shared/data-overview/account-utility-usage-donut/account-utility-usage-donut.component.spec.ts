import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUtilityUsageDonutComponent } from './account-utility-usage-donut.component';

describe('AccountUtilityUsageDonutComponent', () => {
  let component: AccountUtilityUsageDonutComponent;
  let fixture: ComponentFixture<AccountUtilityUsageDonutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountUtilityUsageDonutComponent]
    });
    fixture = TestBed.createComponent(AccountUtilityUsageDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
