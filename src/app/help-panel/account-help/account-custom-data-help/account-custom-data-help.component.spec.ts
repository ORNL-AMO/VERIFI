import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountCustomDataHelpComponent } from './account-custom-data-help.component';

describe('AccountCustomDataHelpComponent', () => {
  let component: AccountCustomDataHelpComponent;
  let fixture: ComponentFixture<AccountCustomDataHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountCustomDataHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountCustomDataHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
