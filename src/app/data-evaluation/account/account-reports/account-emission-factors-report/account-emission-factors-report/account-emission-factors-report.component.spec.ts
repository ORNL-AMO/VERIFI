import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEmissionFactorsReportComponent } from './account-emission-factors-report.component';

describe('AccountEmissionFactorsReportComponent', () => {
  let component: AccountEmissionFactorsReportComponent;
  let fixture: ComponentFixture<AccountEmissionFactorsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountEmissionFactorsReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountEmissionFactorsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
