import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountWaterUsageTableComponent } from './account-water-usage-table.component';

describe('AccountWaterUsageTableComponent', () => {
  let component: AccountWaterUsageTableComponent;
  let fixture: ComponentFixture<AccountWaterUsageTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountWaterUsageTableComponent]
    });
    fixture = TestBed.createComponent(AccountWaterUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
