import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportDonutComponent } from './account-report-donut.component';

describe('AccountReportDonutComponent', () => {
  let component: AccountReportDonutComponent;
  let fixture: ComponentFixture<AccountReportDonutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportDonutComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountReportDonutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
