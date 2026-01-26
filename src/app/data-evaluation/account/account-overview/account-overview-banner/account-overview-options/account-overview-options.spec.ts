import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountOverviewOptions } from './account-overview-options';

describe('AccountOverviewOptions', () => {
  let component: AccountOverviewOptions;
  let fixture: ComponentFixture<AccountOverviewOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountOverviewOptions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountOverviewOptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
