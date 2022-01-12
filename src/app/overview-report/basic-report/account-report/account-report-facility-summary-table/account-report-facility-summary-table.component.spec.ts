import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportFacilitySummaryTableComponent } from './account-report-facility-summary-table.component';

describe('AccountReportFacilitySummaryTableComponent', () => {
  let component: AccountReportFacilitySummaryTableComponent;
  let fixture: ComponentFixture<AccountReportFacilitySummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportFacilitySummaryTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountReportFacilitySummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
