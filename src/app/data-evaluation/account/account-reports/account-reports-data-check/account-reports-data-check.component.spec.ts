import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsDataCheckComponent } from './account-reports-data-check.component';

describe('AccountReportsDataCheckComponent', () => {
  let component: AccountReportsDataCheckComponent;
  let fixture: ComponentFixture<AccountReportsDataCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountReportsDataCheckComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportsDataCheckComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
