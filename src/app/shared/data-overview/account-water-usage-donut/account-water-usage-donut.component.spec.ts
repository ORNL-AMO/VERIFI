import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountWaterUsageDonutComponent } from './account-water-usage-donut.component';

describe('AccountWaterUsageDonutComponent', () => {
  let component: AccountWaterUsageDonutComponent;
  let fixture: ComponentFixture<AccountWaterUsageDonutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountWaterUsageDonutComponent]
    });
    fixture = TestBed.createComponent(AccountWaterUsageDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
