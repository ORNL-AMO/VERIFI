import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEmissionFactorsReportTableComponent } from './account-emission-factors-report-table.component';

describe('AccountEmissionFactorsReportTableComponent', () => {
  let component: AccountEmissionFactorsReportTableComponent;
  let fixture: ComponentFixture<AccountEmissionFactorsReportTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountEmissionFactorsReportTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountEmissionFactorsReportTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
