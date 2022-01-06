import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportUtilityUsageBarChartComponent } from './account-report-utility-usage-bar-chart.component';

describe('AccountReportUtilityUsageBarChartComponent', () => {
  let component: AccountReportUtilityUsageBarChartComponent;
  let fixture: ComponentFixture<AccountReportUtilityUsageBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportUtilityUsageBarChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountReportUtilityUsageBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
