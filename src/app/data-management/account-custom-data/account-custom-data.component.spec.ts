import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountCustomDataComponent } from './account-custom-data.component';

describe('AccountCustomDataComponent', () => {
  let component: AccountCustomDataComponent;
  let fixture: ComponentFixture<AccountCustomDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountCustomDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountCustomDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
