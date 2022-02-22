import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportInfoComponent } from './account-report-info.component';

describe('AccountReportInfoComponent', () => {
  let component: AccountReportInfoComponent;
  let fixture: ComponentFixture<AccountReportInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountReportInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
