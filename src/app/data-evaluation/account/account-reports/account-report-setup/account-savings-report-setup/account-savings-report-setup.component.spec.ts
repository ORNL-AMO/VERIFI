import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSavingsReportSetupComponent } from './account-savings-report-setup.component';

describe('AccountSavingsReportSetupComponent', () => {
  let component: AccountSavingsReportSetupComponent;
  let fixture: ComponentFixture<AccountSavingsReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountSavingsReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSavingsReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
