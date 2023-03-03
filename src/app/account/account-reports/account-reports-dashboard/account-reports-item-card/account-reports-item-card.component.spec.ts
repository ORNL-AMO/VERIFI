import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportsItemCardComponent } from './account-reports-item-card.component';

describe('AccountReportsItemCardComponent', () => {
  let component: AccountReportsItemCardComponent;
  let fixture: ComponentFixture<AccountReportsItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportsItemCardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportsItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
