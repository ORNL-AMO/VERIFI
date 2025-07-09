import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountHomeHelpComponent } from './account-home-help.component';

describe('AccountHomeHelpComponent', () => {
  let component: AccountHomeHelpComponent;
  let fixture: ComponentFixture<AccountHomeHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountHomeHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountHomeHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
