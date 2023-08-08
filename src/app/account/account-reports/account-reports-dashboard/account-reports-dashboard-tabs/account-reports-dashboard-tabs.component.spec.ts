import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsDashboardTabsComponent } from './account-reports-dashboard-tabs.component';

describe('AccountReportsDashboardTabsComponent', () => {
  let component: AccountReportsDashboardTabsComponent;
  let fixture: ComponentFixture<AccountReportsDashboardTabsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountReportsDashboardTabsComponent]
    });
    fixture = TestBed.createComponent(AccountReportsDashboardTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
