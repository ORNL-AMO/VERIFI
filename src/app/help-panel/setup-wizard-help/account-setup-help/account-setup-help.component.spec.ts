import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSetupHelpComponent } from './account-setup-help.component';

describe('AccountSetupHelpComponent', () => {
  let component: AccountSetupHelpComponent;
  let fixture: ComponentFixture<AccountSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountSetupHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
