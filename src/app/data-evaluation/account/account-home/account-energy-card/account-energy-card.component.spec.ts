import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEnergyCardComponent } from './account-energy-card.component';

describe('AccountEnergyCardComponent', () => {
  let component: AccountEnergyCardComponent;
  let fixture: ComponentFixture<AccountEnergyCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountEnergyCardComponent]
    });
    fixture = TestBed.createComponent(AccountEnergyCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
