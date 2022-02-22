import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountDashboardMenuComponent } from './account-dashboard-menu.component';

describe('AccountDashboardMenuComponent', () => {
  let component: AccountDashboardMenuComponent;
  let fixture: ComponentFixture<AccountDashboardMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountDashboardMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountDashboardMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
