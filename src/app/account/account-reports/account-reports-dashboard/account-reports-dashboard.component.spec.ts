import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsDashboardComponent } from './account-reports-dashboard.component';

describe('AccountReportsDashboardComponent', () => {
  let component: AccountReportsDashboardComponent;
  let fixture: ComponentFixture<AccountReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportsDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
