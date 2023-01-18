import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountCostReportComponent } from './account-cost-report.component';

describe('AccountCostReportComponent', () => {
  let component: AccountCostReportComponent;
  let fixture: ComponentFixture<AccountCostReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountCostReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountCostReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
