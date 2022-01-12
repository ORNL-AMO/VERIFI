import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountHelpComponent } from './account-help.component';

describe('AccountHelpComponent', () => {
  let component: AccountHelpComponent;
  let fixture: ComponentFixture<AccountHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
