import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSavingsReportComponent } from './account-savings-report.component';

describe('AccountSavingsReportComponent', () => {
  let component: AccountSavingsReportComponent;
  let fixture: ComponentFixture<AccountSavingsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountSavingsReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSavingsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
