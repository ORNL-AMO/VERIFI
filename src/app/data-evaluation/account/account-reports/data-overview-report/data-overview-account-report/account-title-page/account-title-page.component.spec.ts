import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountTitlePageComponent } from './account-title-page.component';

describe('AccountTitlePageComponent', () => {
  let component: AccountTitlePageComponent;
  let fixture: ComponentFixture<AccountTitlePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountTitlePageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountTitlePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
