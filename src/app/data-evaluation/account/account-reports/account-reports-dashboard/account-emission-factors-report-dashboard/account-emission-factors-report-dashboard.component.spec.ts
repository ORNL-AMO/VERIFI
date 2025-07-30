import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEmissionFactorsReportDashboardComponent } from './account-emission-factors-report-dashboard.component';

describe('AccountEmissionFactorsReportDashboardComponent', () => {
  let component: AccountEmissionFactorsReportDashboardComponent;
  let fixture: ComponentFixture<AccountEmissionFactorsReportDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountEmissionFactorsReportDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountEmissionFactorsReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
