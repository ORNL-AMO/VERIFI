import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsDashboardTableComponent } from './account-reports-dashboard-table.component';

describe('AccountReportsDashboardTableComponent', () => {
  let component: AccountReportsDashboardTableComponent;
  let fixture: ComponentFixture<AccountReportsDashboardTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountReportsDashboardTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportsDashboardTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
