import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsBannerComponent } from './account-reports-banner.component';

describe('AccountReportsBannerComponent', () => {
  let component: AccountReportsBannerComponent;
  let fixture: ComponentFixture<AccountReportsBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportsBannerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportsBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
