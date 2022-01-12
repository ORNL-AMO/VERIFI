import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportUtilityUsageTableComponent } from './account-report-utility-usage-table.component';

describe('AccountReportUtilityUsageTableComponent', () => {
  let component: AccountReportUtilityUsageTableComponent;
  let fixture: ComponentFixture<AccountReportUtilityUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportUtilityUsageTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountReportUtilityUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
