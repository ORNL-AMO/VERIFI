import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUtilityUsageTableComponent } from './account-utility-usage-table.component';

describe('AccountUtilityUsageTableComponent', () => {
  let component: AccountUtilityUsageTableComponent;
  let fixture: ComponentFixture<AccountUtilityUsageTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountUtilityUsageTableComponent]
    });
    fixture = TestBed.createComponent(AccountUtilityUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
