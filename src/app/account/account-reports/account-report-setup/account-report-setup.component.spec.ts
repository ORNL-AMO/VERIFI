import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportSetupComponent } from './account-report-setup.component';

describe('AccountReportSetupComponent', () => {
  let component: AccountReportSetupComponent;
  let fixture: ComponentFixture<AccountReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
