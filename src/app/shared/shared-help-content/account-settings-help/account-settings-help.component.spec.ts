import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSettingsHelpComponent } from './account-settings-help.component';

describe('AccountSettingsHelpComponent', () => {
  let component: AccountSettingsHelpComponent;
  let fixture: ComponentFixture<AccountSettingsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountSettingsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSettingsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
