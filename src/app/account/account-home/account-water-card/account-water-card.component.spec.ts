import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountWaterCardComponent } from './account-water-card.component';

describe('AccountWaterCardComponent', () => {
  let component: AccountWaterCardComponent;
  let fixture: ComponentFixture<AccountWaterCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountWaterCardComponent]
    });
    fixture = TestBed.createComponent(AccountWaterCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
