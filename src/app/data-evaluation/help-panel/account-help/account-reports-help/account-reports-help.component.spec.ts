import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsHelpComponent } from './account-reports-help.component';

describe('AccountReportsHelpComponent', () => {
  let component: AccountReportsHelpComponent;
  let fixture: ComponentFixture<AccountReportsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
