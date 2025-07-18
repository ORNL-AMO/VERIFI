import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountBannerComponent } from './account-banner.component';

describe('AccountBannerComponent', () => {
  let component: AccountBannerComponent;
  let fixture: ComponentFixture<AccountBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
