import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSavingsReportDashboardComponent } from './account-savings-report-dashboard.component';

describe('AccountSavingsReportDashboardComponent', () => {
  let component: AccountSavingsReportDashboardComponent;
  let fixture: ComponentFixture<AccountSavingsReportDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountSavingsReportDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSavingsReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
