import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountOverviewBannerComponent } from './account-overview-banner.component';

describe('AccountOverviewBannerComponent', () => {
  let component: AccountOverviewBannerComponent;
  let fixture: ComponentFixture<AccountOverviewBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountOverviewBannerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountOverviewBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
