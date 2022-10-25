import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUtilitySourceTableComponent } from './account-utility-source-table.component';

describe('AccountUtilitySourceTableComponent', () => {
  let component: AccountUtilitySourceTableComponent;
  let fixture: ComponentFixture<AccountUtilitySourceTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountUtilitySourceTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountUtilitySourceTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
