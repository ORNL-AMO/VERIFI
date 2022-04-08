import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountOverviewHelpComponent } from './account-overview-help.component';

describe('AccountOverviewHelpComponent', () => {
  let component: AccountOverviewHelpComponent;
  let fixture: ComponentFixture<AccountOverviewHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountOverviewHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountOverviewHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
